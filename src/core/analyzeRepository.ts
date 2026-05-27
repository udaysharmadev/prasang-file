import * as vscode from 'vscode';
import type { PackageJsonData } from '../types/prasangTypes';

// =====================
// Types
// =====================

export interface RepositoryIdentity {
	name: string;
	language: string;
	packageManager: string;
	repositoryType: string;
	criticalFiles: string[];
	rootFileNames: string[];
	packageJson: PackageJsonData | null;
}

// =====================
// Constants
// =====================

/** Files that provide critical project context */
const CRITICAL_FILE_NAMES = new Set([
	'package.json',
	'tsconfig.json',
	'README.md',
	'next.config.js',
	'next.config.mjs',
	'next.config.ts',
	'vite.config.ts',
	'vite.config.js',
	'docker-compose.yml',
	'docker-compose.yaml',
	'Dockerfile',
	'.env.example',
	'turbo.json',
	'nx.json',
]);

// =====================
// Main export
// =====================

export async function analyzeRepository(): Promise<RepositoryIdentity | null> {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		return null;
	}

	const rootPath = workspaceFolders[0].uri;

	const entries = await vscode.workspace.fs.readDirectory(rootPath);

	const rootFileNames = entries.map(([name]) => name);

	let language = 'Unknown';
	let packageManager = 'Unknown';
	let repositoryType = 'Unknown';

	let packageJson: PackageJsonData | null = null;

	if (rootFileNames.includes('package.json')) {
		const packageUri = vscode.Uri.joinPath(
			rootPath,
			'package.json'
		);

		try {
			const packageContent =
				await vscode.workspace.fs.readFile(packageUri);

			packageJson = JSON.parse(
				Buffer.from(packageContent).toString('utf8')
			) as PackageJsonData;
		} catch {
			// parse error — leave as null
		}
	}

	// Language detection
	if (rootFileNames.includes('tsconfig.json')) {
		language = 'TypeScript';
	} else if (
		rootFileNames.includes('jsconfig.json') ||
		rootFileNames.includes('package.json')
	) {
		language = 'JavaScript';
	} else if (rootFileNames.includes('pyproject.toml') || rootFileNames.includes('requirements.txt')) {
		language = 'Python';
	} else if (rootFileNames.includes('go.mod')) {
		language = 'Go';
	} else if (rootFileNames.includes('Cargo.toml')) {
		language = 'Rust';
	} else if (rootFileNames.includes('pubspec.yaml')) {
		language = 'Dart';
	}

	// Package manager detection
	if (rootFileNames.includes('bun.lockb') || rootFileNames.includes('bun.lock')) {
		packageManager = 'bun';
	} else if (rootFileNames.includes('pnpm-lock.yaml')) {
		packageManager = 'pnpm';
	} else if (rootFileNames.includes('yarn.lock')) {
		packageManager = 'yarn';
	} else if (rootFileNames.includes('package-lock.json')) {
		packageManager = 'npm';
	} else if (rootFileNames.includes('Pipfile.lock')) {
		packageManager = 'pipenv';
	} else if (rootFileNames.includes('poetry.lock')) {
		packageManager = 'poetry';
	}

	// Repository type heuristic
	if (
		rootFileNames.includes('.vscodeignore') ||
		(packageJson?.devDependencies?.['@types/vscode'] !== undefined)
	) {
		repositoryType = 'VS Code Extension';
	} else if (
		rootFileNames.includes('turbo.json') ||
		rootFileNames.includes('nx.json') ||
		rootFileNames.includes('lerna.json') ||
		packageJson?.workspaces !== undefined
	) {
		repositoryType = 'Monorepo';
	} else if (rootFileNames.includes('Dockerfile') || rootFileNames.includes('docker-compose.yml')) {
		repositoryType = 'Containerized Application';
	} else if (packageJson) {
		repositoryType = 'Node.js Project';
	}

	const criticalFiles = rootFileNames.filter((file) =>
		CRITICAL_FILE_NAMES.has(file)
	);

	return {
		name: workspaceFolders[0].name,
		language,
		packageManager,
		repositoryType,
		criticalFiles,
		rootFileNames,
		packageJson,
	};
}