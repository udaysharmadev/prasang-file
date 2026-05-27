import type {
	PackageJsonData,
	CoreStackLayer,
} from '../types/prasangTypes';

// =====================
// Types
// =====================

export interface DependencyAnalysis {
	layers: CoreStackLayer[];
	architecturalSignals: string[];
}

// =====================
// Detection tables
// =====================

interface LayerDetector {
	layer: CoreStackLayer['layer'];
	name: string;
	/** Match against all dependency names (deps + devDeps) */
	matchDep?: string;
	/** Match against root file/folder names */
	matchFile?: string;
	/** Signal description */
	signal: string;
}

/**
 * Ordered detection table. Earlier entries take priority
 * within the same layer (first match per layer wins for some layers).
 */
const DETECTORS: LayerDetector[] = [
	// --- Runtime ---
	{
		layer: 'runtime',
		name: 'VS Code Extension Runtime',
		matchDep: '@types/vscode',
		signal: '@types/vscode in dependencies',
	},
	{
		layer: 'runtime',
		name: 'Node.js',
		matchDep: '@types/node',
		signal: '@types/node in dependencies',
	},
	{
		layer: 'runtime',
		name: 'Deno',
		matchFile: 'deno.json',
		signal: 'deno.json in root',
	},
	{
		layer: 'runtime',
		name: 'Bun',
		matchFile: 'bunfig.toml',
		signal: 'bunfig.toml in root',
	},

	// --- Language ---
	{
		layer: 'language',
		name: 'TypeScript',
		matchDep: 'typescript',
		signal: 'typescript in dependencies',
	},

	// --- Build ---
	{
		layer: 'build',
		name: 'esbuild',
		matchDep: 'esbuild',
		signal: 'esbuild in dependencies',
	},
	{
		layer: 'build',
		name: 'webpack',
		matchDep: 'webpack',
		signal: 'webpack in dependencies',
	},
	{
		layer: 'build',
		name: 'Vite',
		matchDep: 'vite',
		signal: 'vite in dependencies',
	},
	{
		layer: 'build',
		name: 'Rollup',
		matchDep: 'rollup',
		signal: 'rollup in dependencies',
	},
	{
		layer: 'build',
		name: 'SWC',
		matchDep: '@swc/core',
		signal: '@swc/core in dependencies',
	},
	{
		layer: 'build',
		name: 'tsup',
		matchDep: 'tsup',
		signal: 'tsup in dependencies',
	},
	{
		layer: 'build',
		name: 'tsc (TypeScript compiler)',
		matchFile: 'tsconfig.json',
		signal: 'tsconfig.json in root',
	},

	// --- Validation ---
	{
		layer: 'validation',
		name: 'ESLint',
		matchDep: 'eslint',
		signal: 'eslint in dependencies',
	},
	{
		layer: 'validation',
		name: 'Prettier',
		matchDep: 'prettier',
		signal: 'prettier in dependencies',
	},
	{
		layer: 'validation',
		name: 'Biome',
		matchDep: '@biomejs/biome',
		signal: '@biomejs/biome in dependencies',
	},
	{
		layer: 'validation',
		name: 'TypeScript compiler',
		matchDep: 'typescript',
		signal: 'typescript type checking',
	},

	// --- Testing ---
	{
		layer: 'testing',
		name: 'VS Code test harness',
		matchDep: '@vscode/test-cli',
		signal: '@vscode/test-cli in dependencies',
	},
	{
		layer: 'testing',
		name: 'Vitest',
		matchDep: 'vitest',
		signal: 'vitest in dependencies',
	},
	{
		layer: 'testing',
		name: 'Jest',
		matchDep: 'jest',
		signal: 'jest in dependencies',
	},
	{
		layer: 'testing',
		name: 'Mocha',
		matchDep: 'mocha',
		signal: 'mocha in dependencies',
	},
	{
		layer: 'testing',
		name: 'Playwright',
		matchDep: '@playwright/test',
		signal: '@playwright/test in dependencies',
	},
	{
		layer: 'testing',
		name: 'Cypress',
		matchDep: 'cypress',
		signal: 'cypress in dependencies',
	},

	// --- Package Manager (detected by lock files) ---
	{
		layer: 'packageManager',
		name: 'bun',
		matchFile: 'bun.lockb',
		signal: 'bun.lockb in root',
	},
	{
		layer: 'packageManager',
		name: 'bun',
		matchFile: 'bun.lock',
		signal: 'bun.lock in root',
	},
	{
		layer: 'packageManager',
		name: 'pnpm',
		matchFile: 'pnpm-lock.yaml',
		signal: 'pnpm-lock.yaml in root',
	},
	{
		layer: 'packageManager',
		name: 'yarn',
		matchFile: 'yarn.lock',
		signal: 'yarn.lock in root',
	},
	{
		layer: 'packageManager',
		name: 'npm',
		matchFile: 'package-lock.json',
		signal: 'package-lock.json in root',
	},
];

// =====================
// Architectural signal inference
// =====================

interface ArchSignalDetector {
	signal: string;
	matchDep?: string;
	matchFile?: string;
}

const ARCH_SIGNAL_DETECTORS: ArchSignalDetector[] = [
	{
		signal: 'TypeScript-first repository',
		matchDep: 'typescript',
	},
	{
		signal: 'Bundled build pipeline',
		matchDep: 'esbuild',
	},
	{
		signal: 'Bundled build pipeline',
		matchDep: 'webpack',
	},
	{
		signal: 'VS Code Extension Runtime',
		matchDep: '@types/vscode',
	},
	{
		signal: 'Containerized deployment',
		matchFile: 'Dockerfile',
	},
	{
		signal: 'CI/CD pipeline',
		matchFile: '.github',
	},
	{
		signal: 'Monorepo workspace',
		matchFile: 'turbo.json',
	},
	{
		signal: 'Monorepo workspace',
		matchFile: 'nx.json',
	},
];

// =====================
// Main export
// =====================

/**
 * Analyze project dependencies and infer the technology stack.
 *
 * Accepts pre-read data to avoid duplicate filesystem access.
 * Pure function — deterministic, no I/O.
 */
export function analyzeDependencies(
	packageJson: PackageJsonData | null,
	rootFileNames: string[]
): DependencyAnalysis {
	const allDeps = new Set<string>([
		...Object.keys(
			packageJson?.dependencies ?? {}
		),
		...Object.keys(
			packageJson?.devDependencies ?? {}
		),
	]);

	const rootFiles = new Set<string>(
		rootFileNames
	);

	// Detect stack layers
	const layers: CoreStackLayer[] = [];
	const seenLayerNames = new Set<string>();

	for (const detector of DETECTORS) {
		const matched = detector.matchDep
			? allDeps.has(detector.matchDep)
			: detector.matchFile
				? rootFiles.has(
						detector.matchFile
					)
				: false;

		if (!matched) {
			continue;
		}

		// Deduplicate by layer+name
		const key = `${detector.layer}:${detector.name}`;

		if (seenLayerNames.has(key)) {
			continue;
		}

		seenLayerNames.add(key);

		layers.push({
			layer: detector.layer,
			name: detector.name,
			signals: [detector.signal],
		});
	}

	// Detect architectural signals
	const architecturalSignals: string[] = [];
	const seenSignals = new Set<string>();

	for (const detector of ARCH_SIGNAL_DETECTORS) {
		const matched = detector.matchDep
			? allDeps.has(detector.matchDep)
			: detector.matchFile
				? rootFiles.has(
						detector.matchFile
					)
				: false;

		if (
			matched &&
			!seenSignals.has(detector.signal)
		) {
			seenSignals.add(detector.signal);
			architecturalSignals.push(
				detector.signal
			);
		}
	}

	return {
		layers,
		architecturalSignals,
	};
}