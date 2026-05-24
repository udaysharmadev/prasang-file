// =====================
// Confidence Engine
// =====================

export interface EvidenceItem {
	source: string; // e.g., "folder_taxonomy", "file_pattern", "import_analysis"
	signal: string; // human-readable signal name
	weight: number; // contribution to confidence
}

export interface ConfidenceResult {
	score: number; // 0–100, deterministic cap
	evidence: EvidenceItem[];
	dominantSignal: string; // the highest-weight evidence
}

// Maximum confidence
const MAX_CONFIDENCE = 100;

// Minimum confidence when any evidence exists
const MIN_CONFIDENCE = 10;

/**
 * Compute a deterministic confidence score from weighted evidence items.
 *
 * Rules:
 * - Same input always produces same output
 * - Score capped at 95 (no certainty claims)
 * - Minimum of 10 if any evidence exists
 * - Empty evidence → score 0
 */
export function computeConfidence(
	evidence: EvidenceItem[]
): ConfidenceResult {
	if (evidence.length === 0) {
		return {
			score: 0,
			evidence: [],
			dominantSignal: 'none',
		};
	}

	const rawScore = evidence.reduce(
		(sum, item) => sum + item.weight,
		0
	);

	const score = Math.min(
		Math.max(rawScore, MIN_CONFIDENCE),
		MAX_CONFIDENCE
	);

	// Find dominant signal (highest weight, deterministic tie-break by name)
	const sorted = [...evidence].sort(
		(a, b) => {
			if (b.weight !== a.weight) {
				return b.weight - a.weight;
			}

			return a.signal.localeCompare(
				b.signal
			);
		}
	);

	return {
		score,
		evidence,
		dominantSignal: sorted[0].signal,
	};
}

// =====================
// Standard weight constants
// =====================

export const WEIGHTS = {
	/** Folder name matches known taxonomy */
	FOLDER_TAXONOMY: 30,

	/** TypeScript files present in folder */
	TYPESCRIPT_FILES: 10,

	/** File naming matches a known pattern (e.g., analyze*, command*) */
	FILE_NAMING_PATTERN: 20,

	/** Subfolders follow known conventions */
	SUBDOMAIN_COHERENCE: 15,

	/** Folder is referenced in import graph */
	IMPORT_GRAPH_EVIDENCE: 10,

	/** File content matches expected pattern */
	CONTENT_ANALYSIS: 20,

	/** Referenced in package.json */
	PACKAGE_JSON_REFERENCE: 25,

	/** File exists at expected location */
	FILE_EXISTS: 30,

	/** Content pattern confirmed */
	CONTENT_CONFIRMED: 40,
} as const;
