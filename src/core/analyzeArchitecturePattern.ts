import type { ArchitecturePattern } from '../types/prasangTypes';
import type { FolderAnalysis } from './analyzeFolders';

// =====================
// Types
// =====================

interface ImportEdgeSimple {
	source: string;
	target: string;
}

// =====================
// Layer definitions
// =====================

/**
 * Upper layers: presentation / orchestration.
 * These should import downward, not be imported by lower layers.
 */
const UPPER_LAYERS = new Set([
	'commands',
	'controllers',
	'routes',
	'pages',
	'views',
]);

/**
 * Lower layers: core logic / utilities.
 * These should be imported by upper layers.
 */
const LOWER_LAYERS = new Set([
	'core',
	'services',
	'utils',
	'lib',
	'models',
	'helpers',
	'types',
]);

/** All recognised layer names (union of upper + lower) */
const ALL_LAYER_NAMES = new Set([
	...UPPER_LAYERS,
	...LOWER_LAYERS,
]);

// =====================
// MVC folder names
// =====================

const MVC_MODELS = new Set([
	'models',
	'model',
]);
const MVC_VIEWS = new Set([
	'views',
	'view',
	'templates',
]);
const MVC_CONTROLLERS = new Set([
	'controllers',
	'controller',
]);

// =====================
// Clean Architecture
// =====================

const CLEAN_FOLDERS = new Set([
	'domain',
	'application',
	'infrastructure',
	'entities',
	'usecases',
	'use-cases',
]);

// =====================
// Hexagonal
// =====================

const HEX_FOLDERS = new Set([
	'ports',
	'adapters',
	'inbound',
	'outbound',
]);

// =====================
// Feature-first known layers to exclude
// =====================

/**
 * Folders that are clearly infrastructure / layer names,
 * not feature / domain names.
 */
const KNOWN_INFRA_FOLDERS = new Set([
	...ALL_LAYER_NAMES,
	'config',
	'configs',
	'constants',
	'middleware',
	'middlewares',
	'public',
	'static',
	'assets',
	'styles',
	'test',
	'tests',
	'__tests__',
	'scripts',
	'tools',
	'docs',
	'dist',
	'build',
	'.git',
	'node_modules',
]);

// =====================
// Monorepo workspace configs
// =====================

const WORKSPACE_CONFIGS = new Set([
	'turbo.json',
	'nx.json',
	'lerna.json',
]);

// =====================
// Helpers
// =====================

/**
 * Extract the top-level folder name from a FolderAnalysis path.
 * e.g. "core/analysis" → "core", "components" → "components"
 */
function topLevelName(
	folderPath: string
): string {
	const firstSep = folderPath.indexOf('/');
	if (firstSep === -1) {
		return folderPath.toLowerCase();
	}
	return folderPath
		.slice(0, firstSep)
		.toLowerCase();
}

/**
 * Try to extract the layer name from a file path.
 * We look through all segments for a match in the layer sets.
 */
function findLayerSegment(
	filePath: string
): string | undefined {
	const segments = filePath
		.replace(/\\/g, '/')
		.split('/')
		.map((s) => s.toLowerCase());

	for (const seg of segments) {
		if (
			UPPER_LAYERS.has(seg) ||
			LOWER_LAYERS.has(seg)
		) {
			return seg;
		}
	}
	return undefined;
}

/** Clamp a value between a min and max. */
function clamp(
	value: number,
	min: number,
	max: number
): number {
	return Math.max(min, Math.min(max, value));
}

/** Extract the filename (last segment) from a path. */
function extractFileName(
	filePath: string
): string {
	return filePath.replace(/^.*[/\\]/, '');
}

// =====================
// Pattern detectors
// =====================

function detectLayered(
	folders: FolderAnalysis[],
	edges: ImportEdgeSimple[]
): ArchitecturePattern | undefined {
	let score = 0;
	const signals: string[] = [];

	// Signal: presence of layer-named folders
	const topLevelFolders = new Set(
		folders.map((f) => topLevelName(f.path))
	);

	const matchedLayers: string[] = [];
	for (const layer of ALL_LAYER_NAMES) {
		if (topLevelFolders.has(layer)) {
			matchedLayers.push(layer);
		}
	}

	if (matchedLayers.length >= 2) {
		// 20 points for having layer-named folders
		score += 20;
		signals.push(
			`layer folders: ${matchedLayers.sort().join(', ')}`
		);
	} else {
		// Not enough layer folders — layered pattern unlikely
		return undefined;
	}

	// Signal: folders have distinct roles
	const roles = new Set(
		folders
			.map((f) => f.role)
			.filter(
				(r): r is string =>
					r !== undefined
			)
	);

	if (roles.size >= 2) {
		score += 15;
		signals.push(
			`${roles.size} distinct folder roles`
		);
	}

	// Signal: dependency direction
	let downward = 0;
	let upward = 0;

	for (const edge of edges) {
		const srcLayer = findLayerSegment(
			edge.source
		);
		const tgtLayer = findLayerSegment(
			edge.target
		);

		if (!srcLayer || !tgtLayer) {
			continue;
		}
		if (srcLayer === tgtLayer) {
			continue;
		}

		const srcIsUpper =
			UPPER_LAYERS.has(srcLayer);
		const tgtIsLower =
			LOWER_LAYERS.has(tgtLayer);
		const srcIsLower =
			LOWER_LAYERS.has(srcLayer);
		const tgtIsUpper =
			UPPER_LAYERS.has(tgtLayer);

		if (srcIsUpper && tgtIsLower) {
			downward++;
		} else if (srcIsLower && tgtIsUpper) {
			upward++;
		}
	}

	if (downward + upward > 0) {
		if (downward > upward) {
			score += 25;
			signals.push(
				`dependency direction: ${downward} downward vs ${upward} upward imports`
			);
		} else {
			// Bidirectional — slight signal
			score += 10;
			signals.push(
				`mixed dependency direction: ${downward} downward, ${upward} upward`
			);
		}
	}

	if (score < 40) {
		return undefined;
	}

	return {
		name: 'Layered Architecture',
		confidence: clamp(score, 0, 95),
		signals,
	};
}

function detectMVC(
	folders: FolderAnalysis[]
): ArchitecturePattern | undefined {
	let score = 0;
	const signals: string[] = [];

	const topLevelFolders = new Set(
		folders.map((f) => topLevelName(f.path))
	);

	let componentCount = 0;

	// Check models
	for (const name of MVC_MODELS) {
		if (topLevelFolders.has(name)) {
			componentCount++;
			signals.push(
				`models folder: ${name}`
			);
			break;
		}
	}

	// Check views
	for (const name of MVC_VIEWS) {
		if (topLevelFolders.has(name)) {
			componentCount++;
			signals.push(
				`views folder: ${name}`
			);
			break;
		}
	}

	// Check controllers
	for (const name of MVC_CONTROLLERS) {
		if (topLevelFolders.has(name)) {
			componentCount++;
			signals.push(
				`controllers folder: ${name}`
			);
			break;
		}
	}

	// Also check routes as a controller proxy
	if (
		componentCount < 3 &&
		topLevelFolders.has('routes')
	) {
		// Only count routes if controllers weren't found
		if (
			!signals.some((s) =>
				s.startsWith('controllers')
			)
		) {
			componentCount++;
			signals.push(
				'routes folder (controller proxy)'
			);
		}
	}

	if (componentCount < 2) {
		return undefined;
	}

	// 25 points per MVC component found
	score += componentCount * 25;

	if (score < 50) {
		return undefined;
	}

	return {
		name: 'MVC',
		confidence: clamp(score, 0, 95),
		signals,
	};
}

function detectFeatureFirst(
	folders: FolderAnalysis[]
): ArchitecturePattern | undefined {
	let score = 0;
	const signals: string[] = [];

	// Get top-level folder names
	const topLevelFolders = [
		...new Set(
			folders.map((f) =>
				topLevelName(f.path)
			)
		),
	];

	// Check for explicit feature / module / domain folders
	const explicitFeatureFolders = topLevelFolders.filter(
		(f) =>
			f === 'features' ||
			f === 'modules' ||
			f === 'domains'
	);

	if (explicitFeatureFolders.length > 0) {
		score += 25;
		signals.push(
			`explicit feature folders: ${explicitFeatureFolders.sort().join(', ')}`
		);
	}

	// Count folders that are NOT known layer / infra names
	const featureFolders = topLevelFolders.filter(
		(f) => !KNOWN_INFRA_FOLDERS.has(f)
	);

	const layerFolders = topLevelFolders.filter(
		(f) => ALL_LAYER_NAMES.has(f)
	);

	if (
		featureFolders.length > layerFolders.length &&
		featureFolders.length >= 2
	) {
		score += 20;
		signals.push(
			`${featureFolders.length} feature-like folders vs ${layerFolders.length} layer folders`
		);

		// Extra signal if most folders are feature-like
		if (
			topLevelFolders.length > 0 &&
			featureFolders.length /
				topLevelFolders.length >=
				0.6
		) {
			score += 15;
			signals.push(
				'majority of top-level folders are feature/domain names'
			);
		}
	}

	if (score < 50) {
		return undefined;
	}

	return {
		name: 'Feature-First / Domain-Driven',
		confidence: clamp(score, 0, 95),
		signals,
	};
}

function detectCleanArchitecture(
	folders: FolderAnalysis[]
): ArchitecturePattern | undefined {
	let score = 0;
	const signals: string[] = [];

	const topLevelFolders = new Set(
		folders.map((f) => topLevelName(f.path))
	);

	const matched: string[] = [];
	for (const name of CLEAN_FOLDERS) {
		if (topLevelFolders.has(name)) {
			matched.push(name);
		}
	}

	if (matched.length < 2) {
		return undefined;
	}

	// 20 points per matched folder
	score += matched.length * 20;
	signals.push(
		`clean architecture folders: ${matched.sort().join(', ')}`
	);

	if (score < 50) {
		return undefined;
	}

	return {
		name: 'Clean Architecture',
		confidence: clamp(score, 0, 95),
		signals,
	};
}

function detectHexagonal(
	folders: FolderAnalysis[]
): ArchitecturePattern | undefined {
	let score = 0;
	const signals: string[] = [];

	const topLevelFolders = new Set(
		folders.map((f) => topLevelName(f.path))
	);

	const matched: string[] = [];
	for (const name of HEX_FOLDERS) {
		if (topLevelFolders.has(name)) {
			matched.push(name);
		}
	}

	if (matched.length < 2) {
		return undefined;
	}

	// 25 points per matched folder
	score += matched.length * 25;
	signals.push(
		`hexagonal architecture folders: ${matched.sort().join(', ')}`
	);

	if (score < 50) {
		return undefined;
	}

	return {
		name: 'Hexagonal',
		confidence: clamp(score, 0, 95),
		signals,
	};
}

function detectComponentBased(
	folders: FolderAnalysis[]
): ArchitecturePattern | undefined {
	let score = 0;
	const signals: string[] = [];

	// Find a top-level "components" folder
	const componentFolders = folders.filter(
		(f) =>
			topLevelName(f.path) === 'components'
	);

	if (componentFolders.length === 0) {
		return undefined;
	}

	score += 20;
	signals.push(
		'top-level components folder'
	);

	// Check if the components folder has subfolders
	const componentsRoot = componentFolders.find(
		(f) =>
			f.path.toLowerCase() === 'components'
	);

	if (
		componentsRoot?.subdomains &&
		componentsRoot.subdomains.length > 0
	) {
		score += 20;
		signals.push(
			`${componentsRoot.subdomains.length} component subfolders`
		);
	}

	// Check for nested component folders (components/Foo, components/Bar)
	const nestedComponents = componentFolders.filter(
		(f) => f.path.includes('/')
	);

	if (nestedComponents.length >= 2) {
		score += 15;
		signals.push(
			`${nestedComponents.length} nested component directories`
		);
	}

	if (score < 40) {
		return undefined;
	}

	return {
		name: 'Component-Based',
		confidence: clamp(score, 0, 95),
		signals,
	};
}

function detectMonorepo(
	folders: FolderAnalysis[],
	files: string[]
): ArchitecturePattern | undefined {
	let score = 0;
	const signals: string[] = [];

	const topLevelFolders = new Set(
		folders.map((f) => topLevelName(f.path))
	);

	// Check for packages / apps / libs folders
	const monorepoMarkers = [
		'packages',
		'apps',
		'libs',
	];
	const matched: string[] = [];

	for (const marker of monorepoMarkers) {
		if (topLevelFolders.has(marker)) {
			matched.push(marker);
		}
	}

	if (matched.length > 0) {
		score += matched.length * 20;
		signals.push(
			`monorepo folders: ${matched.sort().join(', ')}`
		);
	}

	// Check for workspace config files
	const configMatches: string[] = [];
	for (const file of files) {
		const fileName = extractFileName(
			file
		).toLowerCase();
		if (WORKSPACE_CONFIGS.has(fileName)) {
			configMatches.push(
				extractFileName(file)
			);
		}
	}

	if (configMatches.length > 0) {
		score += 20;
		signals.push(
			`workspace configs: ${configMatches.sort().join(', ')}`
		);
	}

	if (score < 40) {
		return undefined;
	}

	return {
		name: 'Monorepo',
		confidence: clamp(score, 0, 95),
		signals,
	};
}

// =====================
// Main export
// =====================

/**
 * Detect the most likely architecture pattern.
 * Pure function — no I/O, fully deterministic.
 *
 * Returns patterns sorted by confidence descending.
 * Typically returns 1-3 patterns (only those above threshold).
 */
export function detectArchitecturePattern(
	folders: FolderAnalysis[],
	edges: ImportEdgeSimple[],
	files: string[]
): ArchitecturePattern[] {
	const candidates: ArchitecturePattern[] = [];

	// Run each detector — they return undefined if below threshold
	const layered = detectLayered(
		folders,
		edges
	);
	if (layered) {
		candidates.push(layered);
	}

	const mvc = detectMVC(folders);
	if (mvc) {
		candidates.push(mvc);
	}

	const featureFirst =
		detectFeatureFirst(folders);
	if (featureFirst) {
		candidates.push(featureFirst);
	}

	const clean =
		detectCleanArchitecture(folders);
	if (clean) {
		candidates.push(clean);
	}

	const hex = detectHexagonal(folders);
	if (hex) {
		candidates.push(hex);
	}

	const componentBased =
		detectComponentBased(folders);
	if (componentBased) {
		candidates.push(componentBased);
	}

	const monorepo = detectMonorepo(
		folders,
		files
	);
	if (monorepo) {
		candidates.push(monorepo);
	}

	// Sort by confidence descending, then by name for determinism
	candidates.sort((a, b) => {
		if (b.confidence !== a.confidence) {
			return b.confidence - a.confidence;
		}
		return a.name.localeCompare(b.name);
	});

	return candidates;
}
