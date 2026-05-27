// =====================
// Framework Fingerprinting Engine
// =====================
//
// Deterministic, weighted framework detection from package.json data
// and root-level file/folder names. Never reads file contents.

import type {
	FrameworkFingerprint,
	FrameworkCategory,
	FrameworkEvidence,
	FrameworkSignalType,
	PackageJsonData,
} from '../types/prasangTypes';

// =====================
// Internal Types
// =====================

interface FrameworkSignal {
	type: FrameworkSignalType;
	match: string;       // package name, file path, or folder name
	weight: number;      // 10–40 points per signal
	description: string; // human-readable signal description
}

interface FrameworkDefinition {
	name: string;
	category: FrameworkCategory;
	signals: FrameworkSignal[];
	minConfidence: number; // threshold to report (default 30)
}

// =====================
// Signal Weight Constants
// =====================

const SIGNAL_WEIGHTS = {
	DEPENDENCY: 35,      // strongest — in dependencies
	DEV_DEPENDENCY: 25,  // devDependencies
	CONFIG_FILE: 25,     // config file in root
	FOLDER: 15,          // folder in root
	ENTRY_POINT: 15,     // entry-point file pattern
} as const;

// Maximum confidence — never claim certainty
const MAX_CONFIDENCE = 95;

// =====================
// Framework Definitions
// =====================

const FRAMEWORK_DEFINITIONS: FrameworkDefinition[] = [
	// -------------------
	// Frontend
	// -------------------

	// React
	{
		name: 'React',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: 'react',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'react in dependencies',
			},
			{
				type: 'dependency',
				match: 'react-dom',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'react-dom in dependencies',
			},
		],
		minConfidence: 30,
	},

	// Next.js
	{
		name: 'Next.js',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: 'next',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'next in dependencies',
			},
			{
				type: 'configFile',
				match: 'next.config.js',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'next.config.js in root',
			},
			{
				type: 'configFile',
				match: 'next.config.mjs',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'next.config.mjs in root',
			},
			{
				type: 'configFile',
				match: 'next.config.ts',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'next.config.ts in root',
			},
			{
				type: 'folder',
				match: 'app',
				weight: SIGNAL_WEIGHTS.FOLDER,
				description: 'app/ directory (App Router)',
			},
			{
				type: 'folder',
				match: 'pages',
				weight: SIGNAL_WEIGHTS.FOLDER,
				description: 'pages/ directory (Pages Router)',
			},
			{
				type: 'entryPoint',
				match: 'middleware.ts',
				weight: SIGNAL_WEIGHTS.ENTRY_POINT,
				description: 'middleware.ts entry point',
			},
			{
				type: 'entryPoint',
				match: 'middleware.js',
				weight: SIGNAL_WEIGHTS.ENTRY_POINT,
				description: 'middleware.js entry point',
			},
		],
		minConfidence: 30,
	},

	// Vite
	{
		name: 'Vite',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: 'vite',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'vite in dependencies',
			},
			{
				type: 'configFile',
				match: 'vite.config.ts',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'vite.config.ts in root',
			},
			{
				type: 'configFile',
				match: 'vite.config.js',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'vite.config.js in root',
			},
			{
				type: 'configFile',
				match: 'vite.config.mjs',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'vite.config.mjs in root',
			},
		],
		minConfidence: 30,
	},

	// Vue
	{
		name: 'Vue',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: 'vue',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'vue in dependencies',
			},
			{
				type: 'configFile',
				match: 'vue.config.js',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'vue.config.js in root',
			},
		],
		minConfidence: 30,
	},

	// Nuxt
	{
		name: 'Nuxt',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: 'nuxt',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'nuxt in dependencies',
			},
			{
				type: 'configFile',
				match: 'nuxt.config.ts',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'nuxt.config.ts in root',
			},
			{
				type: 'configFile',
				match: 'nuxt.config.js',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'nuxt.config.js in root',
			},
			{
				type: 'folder',
				match: 'composables',
				weight: SIGNAL_WEIGHTS.FOLDER,
				description: 'composables/ directory',
			},
			{
				type: 'folder',
				match: 'server',
				weight: SIGNAL_WEIGHTS.FOLDER,
				description: 'server/ directory',
			},
		],
		minConfidence: 30,
	},

	// Angular
	{
		name: 'Angular',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: '@angular/core',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: '@angular/core in dependencies',
			},
			{
				type: 'configFile',
				match: 'angular.json',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'angular.json in root',
			},
		],
		minConfidence: 30,
	},

	// Svelte
	{
		name: 'Svelte',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: 'svelte',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'svelte in dependencies',
			},
			{
				type: 'configFile',
				match: 'svelte.config.js',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'svelte.config.js in root',
			},
		],
		minConfidence: 30,
	},

	// SvelteKit
	{
		name: 'SvelteKit',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: '@sveltejs/kit',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: '@sveltejs/kit in dependencies',
			},
			{
				type: 'configFile',
				match: 'svelte.config.js',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'svelte.config.js in root',
			},
			{
				type: 'folder',
				match: 'routes',
				weight: SIGNAL_WEIGHTS.FOLDER,
				description: 'routes/ directory (under src)',
			},
		],
		minConfidence: 30,
	},

	// Remix
	{
		name: 'Remix',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: '@remix-run/react',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: '@remix-run/react in dependencies',
			},
			{
				type: 'dependency',
				match: '@remix-run/node',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: '@remix-run/node in dependencies',
			},
			{
				type: 'configFile',
				match: 'remix.config.js',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'remix.config.js in root',
			},
		],
		minConfidence: 30,
	},

	// Astro
	{
		name: 'Astro',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: 'astro',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'astro in dependencies',
			},
			{
				type: 'configFile',
				match: 'astro.config.mjs',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'astro.config.mjs in root',
			},
			{
				type: 'configFile',
				match: 'astro.config.ts',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'astro.config.ts in root',
			},
		],
		minConfidence: 30,
	},

	// Solid
	{
		name: 'Solid',
		category: 'frontend',
		signals: [
			{
				type: 'dependency',
				match: 'solid-js',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'solid-js in dependencies',
			},
		],
		minConfidence: 30,
	},

	// -------------------
	// Backend
	// -------------------

	// Express
	{
		name: 'Express',
		category: 'backend',
		signals: [
			{
				type: 'dependency',
				match: 'express',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'express in dependencies',
			},
		],
		minConfidence: 30,
	},

	// NestJS
	{
		name: 'NestJS',
		category: 'backend',
		signals: [
			{
				type: 'dependency',
				match: '@nestjs/core',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: '@nestjs/core in dependencies',
			},
			{
				type: 'configFile',
				match: 'nest-cli.json',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'nest-cli.json in root',
			},
		],
		minConfidence: 30,
	},

	// Fastify
	{
		name: 'Fastify',
		category: 'backend',
		signals: [
			{
				type: 'dependency',
				match: 'fastify',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'fastify in dependencies',
			},
		],
		minConfidence: 30,
	},

	// Hono
	{
		name: 'Hono',
		category: 'backend',
		signals: [
			{
				type: 'dependency',
				match: 'hono',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'hono in dependencies',
			},
		],
		minConfidence: 30,
	},

	// Koa
	{
		name: 'Koa',
		category: 'backend',
		signals: [
			{
				type: 'dependency',
				match: 'koa',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'koa in dependencies',
			},
		],
		minConfidence: 30,
	},

	// FastAPI (non-JS — config file detection only)
	{
		name: 'FastAPI',
		category: 'backend',
		signals: [
			{
				type: 'configFile',
				match: 'requirements.txt',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'requirements.txt in root (Python project)',
			},
			{
				type: 'configFile',
				match: 'pyproject.toml',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'pyproject.toml in root (Python project)',
			},
		],
		minConfidence: 25,
	},

	// Flask (non-JS — config file detection only)
	{
		name: 'Flask',
		category: 'backend',
		signals: [
			{
				type: 'configFile',
				match: 'requirements.txt',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'requirements.txt in root (Python project)',
			},
			{
				type: 'configFile',
				match: 'pyproject.toml',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'pyproject.toml in root (Python project)',
			},
		],
		minConfidence: 25,
	},

	// Django (non-JS — config file detection only)
	{
		name: 'Django',
		category: 'backend',
		signals: [
			{
				type: 'configFile',
				match: 'manage.py',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'manage.py in root (Django project)',
			},
		],
		minConfidence: 25,
	},

	// Spring Boot (non-JS — config file detection only)
	{
		name: 'Spring Boot',
		category: 'backend',
		signals: [
			{
				type: 'configFile',
				match: 'pom.xml',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'pom.xml in root (Maven project)',
			},
			{
				type: 'configFile',
				match: 'build.gradle',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'build.gradle in root (Gradle project)',
			},
		],
		minConfidence: 25,
	},

	// Laravel (non-JS — config file detection only)
	{
		name: 'Laravel',
		category: 'backend',
		signals: [
			{
				type: 'configFile',
				match: 'artisan',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'artisan in root (Laravel CLI)',
			},
			{
				type: 'configFile',
				match: 'composer.json',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'composer.json in root (PHP project)',
			},
		],
		minConfidence: 25,
	},

	// -------------------
	// Mobile
	// -------------------

	// React Native
	{
		name: 'React Native',
		category: 'mobile',
		signals: [
			{
				type: 'dependency',
				match: 'react-native',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'react-native in dependencies',
			},
		],
		minConfidence: 30,
	},

	// Expo
	{
		name: 'Expo',
		category: 'mobile',
		signals: [
			{
				type: 'dependency',
				match: 'expo',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'expo in dependencies',
			},
			{
				type: 'configFile',
				match: 'app.json',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'app.json in root',
			},
			{
				type: 'configFile',
				match: 'app.config.js',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'app.config.js in root',
			},
			{
				type: 'configFile',
				match: 'app.config.ts',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'app.config.ts in root',
			},
		],
		minConfidence: 30,
	},

	// Flutter (non-JS — config file detection only)
	{
		name: 'Flutter',
		category: 'mobile',
		signals: [
			{
				type: 'configFile',
				match: 'pubspec.yaml',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'pubspec.yaml in root (Dart/Flutter project)',
			},
			{
				type: 'folder',
				match: 'lib',
				weight: SIGNAL_WEIGHTS.FOLDER,
				description: 'lib/ directory (Flutter source)',
			},
		],
		minConfidence: 25,
	},

	// -------------------
	// Desktop
	// -------------------

	// Electron
	{
		name: 'Electron',
		category: 'desktop',
		signals: [
			{
				type: 'dependency',
				match: 'electron',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'electron in dependencies',
			},
		],
		minConfidence: 30,
	},

	// Tauri
	{
		name: 'Tauri',
		category: 'desktop',
		signals: [
			{
				type: 'configFile',
				match: 'tauri.conf.json',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'tauri.conf.json in root',
			},
			{
				type: 'folder',
				match: 'src-tauri',
				weight: SIGNAL_WEIGHTS.FOLDER,
				description: 'src-tauri/ directory',
			},
		],
		minConfidence: 25,
	},

	// VS Code Extension
	{
		name: 'VS Code Extension',
		category: 'desktop',
		signals: [
			{
				type: 'devDependency',
				match: '@types/vscode',
				weight: SIGNAL_WEIGHTS.DEV_DEPENDENCY,
				description: '@types/vscode in devDependencies',
			},
			{
				type: 'configFile',
				match: '.vscodeignore',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: '.vscodeignore in root',
			},
			{
				type: 'entryPoint',
				match: 'src/extension.ts',
				weight: SIGNAL_WEIGHTS.ENTRY_POINT,
				description: 'src/extension.ts entry point',
			},
		],
		minConfidence: 25,
	},

	// -------------------
	// Infra
	// -------------------

	// Turborepo
	{
		name: 'Turborepo',
		category: 'infra',
		signals: [
			{
				type: 'devDependency',
				match: 'turbo',
				weight: SIGNAL_WEIGHTS.DEV_DEPENDENCY,
				description: 'turbo in devDependencies',
			},
			{
				type: 'configFile',
				match: 'turbo.json',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'turbo.json in root',
			},
		],
		minConfidence: 25,
	},

	// Nx
	{
		name: 'Nx',
		category: 'infra',
		signals: [
			{
				type: 'dependency',
				match: 'nx',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'nx in dependencies',
			},
			{
				type: 'devDependency',
				match: 'nx',
				weight: SIGNAL_WEIGHTS.DEV_DEPENDENCY,
				description: 'nx in devDependencies',
			},
			{
				type: 'configFile',
				match: 'nx.json',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'nx.json in root',
			},
		],
		minConfidence: 25,
	},

	// Docker
	{
		name: 'Docker',
		category: 'infra',
		signals: [
			{
				type: 'configFile',
				match: 'Dockerfile',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'Dockerfile in root',
			},
			{
				type: 'configFile',
				match: 'docker-compose.yml',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'docker-compose.yml in root',
			},
			{
				type: 'configFile',
				match: 'docker-compose.yaml',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'docker-compose.yaml in root',
			},
		],
		minConfidence: 25,
	},

	// Lerna
	{
		name: 'Lerna',
		category: 'infra',
		signals: [
			{
				type: 'dependency',
				match: 'lerna',
				weight: SIGNAL_WEIGHTS.DEPENDENCY,
				description: 'lerna in dependencies',
			},
			{
				type: 'devDependency',
				match: 'lerna',
				weight: SIGNAL_WEIGHTS.DEV_DEPENDENCY,
				description: 'lerna in devDependencies',
			},
			{
				type: 'configFile',
				match: 'lerna.json',
				weight: SIGNAL_WEIGHTS.CONFIG_FILE,
				description: 'lerna.json in root',
			},
		],
		minConfidence: 25,
	},
];

// =====================
// Helper: Extract dependency names
// =====================

/**
 * Get all dependency names (both deps and devDeps) from package.json.
 *
 * Returns three arrays for flexible lookups:
 * - `dependencies` — names from `dependencies`
 * - `devDependencies` — names from `devDependencies`
 * - `all` — union of both (no duplicates)
 */
export function getAllDependencyNames(
	packageJson: PackageJsonData
): { dependencies: string[]; devDependencies: string[]; all: string[] } {
	const dependencies = Object.keys(packageJson.dependencies ?? {});
	const devDependencies = Object.keys(packageJson.devDependencies ?? {});

	// Merge without duplicates — deterministic via Set insertion order
	const allSet = new Set<string>([...dependencies, ...devDependencies]);

	return {
		dependencies,
		devDependencies,
		all: [...allSet],
	};
}

// =====================
// Core Detection Logic
// =====================

/**
 * Check a single signal against the available data.
 *
 * Returns true if the signal matches, false otherwise.
 */
function checkSignal(
	signal: FrameworkSignal,
	dependencies: Set<string>,
	devDependencies: Set<string>,
	rootFileSet: Set<string>
): boolean {
	switch (signal.type) {
		case 'dependency':
			return dependencies.has(signal.match);

		case 'devDependency':
			return devDependencies.has(signal.match);

		case 'configFile':
			return rootFileSet.has(signal.match);

		case 'folder':
			return rootFileSet.has(signal.match);

		case 'entryPoint':
			return rootFileSet.has(signal.match);

		case 'fileContent':
			// Not used in this version — we don't read file contents
			return false;

		default:
			return false;
	}
}

/**
 * Evaluate a single framework definition against the available data.
 *
 * Returns a FrameworkFingerprint if the framework meets its confidence
 * threshold, or null if not enough evidence.
 */
function evaluateFramework(
	definition: FrameworkDefinition,
	dependencies: Set<string>,
	devDependencies: Set<string>,
	rootFileSet: Set<string>
): FrameworkFingerprint | null {
	const evidence: FrameworkEvidence[] = [];
	const signals: string[] = [];
	let totalWeight = 0;

	for (const signal of definition.signals) {
		if (checkSignal(signal, dependencies, devDependencies, rootFileSet)) {
			evidence.push({
				type: signal.type,
				signal: signal.description,
				weight: signal.weight,
			});
			signals.push(signal.description);
			totalWeight += signal.weight;
		}
	}

	// No matching signals → skip
	if (evidence.length === 0) {
		return null;
	}

	// Cap confidence at MAX_CONFIDENCE (never claim certainty)
	const confidence = Math.min(totalWeight, MAX_CONFIDENCE);

	// Below minimum threshold → not enough evidence
	if (confidence < definition.minConfidence) {
		return null;
	}

	return {
		name: definition.name,
		category: definition.category,
		confidence,
		signals,
		evidence,
	};
}

// =====================
// Public API
// =====================

/**
 * Detect frameworks used in a repository by analyzing package.json data
 * and root-level file/folder names.
 *
 * This function is SYNCHRONOUS and deterministic — same inputs always
 * produce the same output. It does NOT read file contents or access
 * the filesystem.
 *
 * @param packageJson - Parsed package.json data, or null if not available
 * @param rootFileNames - List of file and folder names in the repository root
 * @returns Array of detected frameworks, sorted by confidence descending
 */
export function detectFrameworks(
	packageJson: PackageJsonData | null,
	rootFileNames: string[]
): FrameworkFingerprint[] {
	// Build lookup sets for O(1) membership checks
	const deps = new Set<string>(
		packageJson
			? Object.keys(packageJson.dependencies ?? {})
			: []
	);
	const devDeps = new Set<string>(
		packageJson
			? Object.keys(packageJson.devDependencies ?? {})
			: []
	);
	const rootFileSet = new Set<string>(rootFileNames);

	// Evaluate every framework definition
	const results: FrameworkFingerprint[] = [];

	for (const definition of FRAMEWORK_DEFINITIONS) {
		const fingerprint = evaluateFramework(
			definition,
			deps,
			devDeps,
			rootFileSet
		);

		if (fingerprint !== null) {
			results.push(fingerprint);
		}
	}

	// Sort by confidence descending, deterministic tie-break by name
	results.sort((a, b) => {
		if (b.confidence !== a.confidence) {
			return b.confidence - a.confidence;
		}
		return a.name.localeCompare(b.name);
	});

	return results;
}
