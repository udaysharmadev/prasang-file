import type {
	ImportGraphEnriched,
} from './analyzeImports';
import type { FolderAnalysis } from './analyzeFolders';
import type { RiskLevel } from '../types/prasangTypes';

// =====================
// Types
// =====================

export interface BlastRadiusEntry {
	path: string;
	riskLevel: RiskLevel;
	directImpact: AffectedFile[];
	indirectImpact: AffectedFile[];
	totalAffected: number;
}

export interface AffectedFile {
	path: string;
	context: string; // semantic context from folder analysis
}

// =====================
// Risk thresholds
// =====================

/**
 * Risk level thresholds based on total affected files.
 * Deterministic: same totalAffected always produces same risk.
 */
function computeRiskLevel(
	totalAffected: number
): RiskLevel {
	if (totalAffected >= 5) {
		return 'CRITICAL';
	}
	if (totalAffected >= 3) {
		return 'HIGH';
	}
	if (totalAffected >= 2) {
		return 'MEDIUM';
	}
	return 'LOW';
}

// =====================
// Main export
// =====================

/**
 * Compute blast radius with direct vs indirect separation
 * and risk level classification.
 *
 * Direct impact: files that directly import the changed file (1 hop).
 * Indirect impact: files that transitively depend on the changed file (2+ hops).
 *
 * Uses pre-computed reverse adjacency from enriched import graph.
 *
 * Only files with total affected >= minAffected are returned.
 */
export function analyzeBlastRadius(
	graph: ImportGraphEnriched,
	folderAnalysis: FolderAnalysis[],
	minAffected = 2
): BlastRadiusEntry[] {
	if (graph.edgeCount === 0) {
		return [];
	}

	// Use pre-computed reverse adjacency from enriched graph
	const reverseAdj =
		graph.reverseAdjacency;

	// Build folder context lookup
	const folderContextMap =
		buildFolderContextMap(folderAnalysis);

	const results: BlastRadiusEntry[] = [];

	for (const file of [
		...graph.files,
	].sort()) {
		const { direct, indirect } =
			computeLayeredBlastRadius(
				file,
				reverseAdj
			);

		const totalAffected =
			direct.size + indirect.size;

		if (totalAffected < minAffected) {
			continue;
		}

		const toAffectedFile = (
			path: string
		): AffectedFile => ({
			path,
			context: getFileContext(
				path,
				folderContextMap
			),
		});

		results.push({
			path: file,
			riskLevel:
				computeRiskLevel(
					totalAffected
				),
			directImpact: [...direct]
				.sort()
				.map(toAffectedFile),
			indirectImpact: [...indirect]
				.sort()
				.map(toAffectedFile),
			totalAffected,
		});
	}

	// Sort by total blast radius descending, then alphabetically
	results.sort((a, b) => {
		if (
			b.totalAffected !==
			a.totalAffected
		) {
			return (
				b.totalAffected -
				a.totalAffected
			);
		}

		return a.path.localeCompare(b.path);
	});

	return results;
}

// =====================
// Graph algorithms
// =====================

/**
 * Compute blast radius with layer separation.
 *
 * Layer 0 (direct): files that directly import startFile
 * Layer 1+ (indirect): files reachable through 2+ hops on the reverse graph
 *
 * Uses BFS with depth tracking. No duplicates across layers.
 */
function computeLayeredBlastRadius(
	startFile: string,
	reverseAdj: Map<string, string[]>
): {
	direct: Set<string>;
	indirect: Set<string>;
} {
	const direct = new Set<string>();
	const indirect = new Set<string>();
	const visited = new Set<string>();
	visited.add(startFile);

	// BFS with depth tracking
	// Each queue entry: [file, depth]
	const queue: Array<[string, number]> =
		[];

	// Seed with direct dependents (depth = 1)
	const directDependents =
		reverseAdj.get(startFile) ?? [];

	for (const dep of directDependents) {
		if (!visited.has(dep)) {
			visited.add(dep);
			direct.add(dep);
			queue.push([dep, 1]);
		}
	}

	// Continue BFS for indirect (depth >= 2)
	while (queue.length > 0) {
		const [current, depth] =
			queue.shift()!;

		const dependents =
			reverseAdj.get(current) ?? [];

		for (const dep of dependents) {
			if (!visited.has(dep)) {
				visited.add(dep);
				indirect.add(dep);
				queue.push([dep, depth + 1]);
			}
		}
	}

	return { direct, indirect };
}

// =====================
// Context enrichment
// =====================

/**
 * Build a map from folder path → purpose string
 * for fast context lookups.
 */
function buildFolderContextMap(
	folderAnalysis: FolderAnalysis[]
): Map<string, string> {
	const map = new Map<string, string>();

	for (const folder of folderAnalysis) {
		map.set(
			folder.path,
			folder.purpose
		);
	}

	return map;
}

/**
 * Get a semantic context string for a file path
 * by matching its parent folder against folder analysis results.
 */
function getFileContext(
	filePath: string,
	folderContextMap: Map<string, string>
): string {
	// Try progressively shorter folder paths
	const parts = filePath.split('/');

	// Remove the filename to get folder path
	parts.pop();

	while (parts.length > 0) {
		const folderPath = parts.join('/');
		const context =
			folderContextMap.get(folderPath);

		if (context) {
			return context;
		}

		parts.pop();
	}

	return 'root';
}
