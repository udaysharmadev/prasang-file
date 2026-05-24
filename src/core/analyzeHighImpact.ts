import type { ImportGraph } from './analyzeImports';

// =====================
// Types
// =====================

export interface HighImpactFile {
	path: string;
	category: HighImpactCategory;
	reason: string;
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
 * Detect high-impact files from the import graph.
 *
 * Categories:
 * - Orchestrator: out-degree >= 3 (imports 3+ local files)
 * - Hub: in-degree >= 3 (imported by 3+ files)
 * - Central Engine: in-degree >= 2 AND out-degree >= 2
 * - Entry Point: in-degree === 0 AND out-degree >= 1 (nothing imports it, but it imports others)
 *
 * A file can only appear once, in its highest-priority category.
 */
export function analyzeHighImpact(
	graph: ImportGraph
): HighImpactFile[] {
	if (graph.edgeCount === 0) {
		return [];
	}

	// Compute degree maps
	const inDegree = new Map<
		string,
		number
	>();
	const outDegree = new Map<
		string,
		number
	>();
	const importedBy = new Map<
		string,
		string[]
	>();
	const imports = new Map<
		string,
		string[]
	>();

	for (const file of graph.files) {
		inDegree.set(file, 0);
		outDegree.set(file, 0);
		importedBy.set(file, []);
		imports.set(file, []);
	}

	for (const edge of graph.edges) {
		outDegree.set(
			edge.source,
			(outDegree.get(edge.source) ??
				0) + 1
		);

		inDegree.set(
			edge.target,
			(inDegree.get(edge.target) ??
				0) + 1
		);

		const sourceImports =
			imports.get(edge.source) ?? [];
		sourceImports.push(edge.target);
		imports.set(
			edge.source,
			sourceImports
		);

		const targetImportedBy =
			importedBy.get(edge.target) ?? [];
		targetImportedBy.push(edge.source);
		importedBy.set(
			edge.target,
			targetImportedBy
		);
	}

	const results: HighImpactFile[] = [];
	const classified = new Set<string>();

	// Priority 1: Orchestrators (high out-degree)
	for (const file of sortedFiles(
		graph.files
	)) {
		const out =
			outDegree.get(file) ?? 0;

		if (out >= 3) {
			const targets =
				imports.get(file) ?? [];

			results.push({
				path: file,
				category: 'Orchestrator',
				reason: `imports ${out} local modules: ${targets.sort().join(', ')}`,
				inDegree:
					inDegree.get(file) ?? 0,
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
			inDegree.get(file) ?? 0;

		if (ind >= 3) {
			const sources =
				importedBy.get(file) ?? [];

			results.push({
				path: file,
				category: 'Hub',
				reason: `imported by ${ind} files: ${sources.sort().join(', ')}`,
				inDegree: ind,
				outDegree:
					outDegree.get(file) ?? 0,
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
			inDegree.get(file) ?? 0;
		const out =
			outDegree.get(file) ?? 0;

		if (ind >= 2 && out >= 2) {
			results.push({
				path: file,
				category: 'Central Engine',
				reason: `imported by ${ind} files, imports ${out} modules`,
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
			inDegree.get(file) ?? 0;
		const out =
			outDegree.get(file) ?? 0;

		if (ind === 0 && out >= 1) {
			results.push({
				path: file,
				category: 'Entry Point',
				reason: `root node, imports ${out} module(s)`,
				inDegree: 0,
				outDegree: out,
			});

			classified.add(file);
		}
	}

	return results;
}

// =====================
// Utilities
// =====================

function sortedFiles(
	files: string[]
): string[] {
	return [...files].sort();
}
