import type {
	ImportGraphEnriched,
} from './analyzeImports';

// =====================
// Types
// =====================

export interface HighImpactFile {
	path: string;
	category: HighImpactCategory;
	reason: string;
	whyItMatters: string;
	centralityScore: number;
	inDegree: number; // how many files import this
	outDegree: number; // how many local files this imports
}

export type HighImpactCategory =
	| 'Orchestrator'
	| 'Hub'
	| 'Central Engine'
	| 'Entry Point';

// =====================
// Main export
// =====================

/**
 * Detect high-impact files from the enriched import graph.
 *
 * Categories (priority order — a file appears once in its highest):
 * - Orchestrator: out-degree >= 3 (imports 3+ local files)
 * - Hub: in-degree >= 3 (imported by 3+ files)
 * - Central Engine: in-degree >= 2 AND out-degree >= 2
 * - Entry Point: in-degree === 0 AND out-degree >= 1
 *
 * Now includes:
 * - whyItMatters: deterministic explanation of the file's importance
 * - centralityScore: normalized 0–100 score based on degree
 */
export function analyzeHighImpact(
	graph: ImportGraphEnriched
): HighImpactFile[] {
	if (graph.edgeCount === 0) {
		return [];
	}

	// Use pre-computed maps from enriched graph
	const {
		inDegreeMap,
		outDegreeMap,
		forwardAdjacency,
		reverseAdjacency,
	} = graph;

	// Compute max degree for normalization
	let maxDegree = 1;

	for (const file of graph.files) {
		const total =
			(inDegreeMap.get(file) ?? 0) +
			(outDegreeMap.get(file) ?? 0);

		if (total > maxDegree) {
			maxDegree = total;
		}
	}

	const results: HighImpactFile[] = [];
	const classified = new Set<string>();

	// Priority 1: Orchestrators (high out-degree)
	for (const file of sortedFiles(
		graph.files
	)) {
		const out =
			outDegreeMap.get(file) ?? 0;

		if (out >= 3) {
			const targets =
				forwardAdjacency.get(file) ??
				[];
			const ind =
				inDegreeMap.get(file) ?? 0;

			results.push({
				path: file,
				category: 'Orchestrator',
				reason: `imports ${out} local modules: ${[...targets].sort().join(', ')}`,
				whyItMatters: generateWhyItMatters(
					'Orchestrator',
					file,
					ind,
					out
				),
				centralityScore:
					computeCentrality(
						ind,
						out,
						maxDegree
					),
				inDegree: ind,
				outDegree: out,
			});

			classified.add(file);
		}
	}

	// Priority 2: Hubs (high in-degree)
	for (const file of sortedFiles(
		graph.files
	)) {
		if (classified.has(file)) {
			continue;
		}

		const ind =
			inDegreeMap.get(file) ?? 0;

		if (ind >= 3) {
			const sources =
				reverseAdjacency.get(file) ??
				[];
			const out =
				outDegreeMap.get(file) ?? 0;

			results.push({
				path: file,
				category: 'Hub',
				reason: `imported by ${ind} files: ${[...sources].sort().join(', ')}`,
				whyItMatters: generateWhyItMatters(
					'Hub',
					file,
					ind,
					out
				),
				centralityScore:
					computeCentrality(
						ind,
						out,
						maxDegree
					),
				inDegree: ind,
				outDegree: out,
			});

			classified.add(file);
		}
	}

	// Priority 3: Central Engines (moderate both)
	for (const file of sortedFiles(
		graph.files
	)) {
		if (classified.has(file)) {
			continue;
		}

		const ind =
			inDegreeMap.get(file) ?? 0;
		const out =
			outDegreeMap.get(file) ?? 0;

		if (ind >= 2 && out >= 2) {
			results.push({
				path: file,
				category: 'Central Engine',
				reason: `imported by ${ind} files, imports ${out} modules`,
				whyItMatters: generateWhyItMatters(
					'Central Engine',
					file,
					ind,
					out
				),
				centralityScore:
					computeCentrality(
						ind,
						out,
						maxDegree
					),
				inDegree: ind,
				outDegree: out,
			});

			classified.add(file);
		}
	}

	// Priority 4: Entry Points (zero in-degree, positive out-degree)
	for (const file of sortedFiles(
		graph.files
	)) {
		if (classified.has(file)) {
			continue;
		}

		const ind =
			inDegreeMap.get(file) ?? 0;
		const out =
			outDegreeMap.get(file) ?? 0;

		if (ind === 0 && out >= 1) {
			results.push({
				path: file,
				category: 'Entry Point',
				reason: `root node, imports ${out} module(s)`,
				whyItMatters: generateWhyItMatters(
					'Entry Point',
					file,
					ind,
					out
				),
				centralityScore:
					computeCentrality(
						ind,
						out,
						maxDegree
					),
				inDegree: 0,
				outDegree: out,
			});

			classified.add(file);
		}
	}

	return results;
}

// =====================
// Why It Matters
// =====================

/**
 * Generate a deterministic human-readable explanation
 * of why a file is high-impact.
 *
 * Based on category, degree metrics, and file name.
 */
function generateWhyItMatters(
	category: HighImpactCategory,
	filePath: string,
	inDegree: number,
	outDegree: number
): string {
	const fileName = filePath
		.split('/')
		.pop()!;

	switch (category) {
		case 'Orchestrator':
			return (
				`Central coordination point. ` +
				`${fileName} imports ${outDegree} modules, ` +
				`making it the primary integration hub. ` +
				`Changes here may cascade to all connected modules.`
			);

		case 'Hub':
			return (
				`Shared dependency used by ${inDegree} files. ` +
				`Breaking changes to ${fileName} have a wide blast radius. ` +
				`Treat as a stability contract.`
			);

		case 'Central Engine':
			return (
				`Sits at a crossroads: imported by ${inDegree} files ` +
				`and imports ${outDegree} modules. ` +
				`${fileName} bridges multiple system layers.`
			);

		case 'Entry Point':
			return (
				`Root entry node that bootstraps ${outDegree} module(s). ` +
				`Nothing imports ${fileName} — ` +
				`it is a starting point of execution.`
			);
	}
}

// =====================
// Centrality
// =====================

/**
 * Compute a normalized centrality score (0–100).
 *
 * Based on total degree (in + out) relative to the
 * maximum degree in the graph.
 */
function computeCentrality(
	inDegree: number,
	outDegree: number,
	maxDegree: number
): number {
	if (maxDegree === 0) {
		return 0;
	}

	const raw =
		((inDegree + outDegree) /
			maxDegree) *
		100;

	return Math.round(
		Math.min(raw, 100)
	);
}

// =====================
// Utilities
// =====================

function sortedFiles(
	files: string[]
): string[] {
	return [...files].sort();
}
