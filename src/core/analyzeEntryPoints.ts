import * as vscode from 'vscode';
import {
	computeConfidence,
	WEIGHTS,
} from '../intelligence/confidenceEngine';
import type { EvidenceItem } from '../intelligence/confidenceEngine';

// =====================
// Types
// =====================

export interface EntryPoint {
	path: string;
	role: string;
	description: string;
	confidence: number;
	detectedBy: string; // "file_pattern" | "content_analysis" | "package_json"
}

// =====================
// Pattern definitions
// =====================

interface EntryPattern {
	/** Glob-style paths to check (relative to workspace root) */
	paths: string[];
	role: string;
	description: string;
	/** If set, file must contain this substring to confirm */
	contentMatch?: string;
	/** Detection method label */
	detectedBy: string;
}

/**
 * Paths starting with these prefixes are build output artifacts.
 * They should not be reported as entry points.
 */
const BUILD_OUTPUT_PREFIXES = [
	'./dist/',
	'./build/',
	'./out/',
	'dist/',
	'build/',
	'out/',
	'./dist\\\\',
	'dist\\\\',
];

/**
 * Ordered pattern table.
 * Earlier entries = higher priority detection.
 * Content matches increase confidence significantly.
 */
const ENTRY_PATTERNS: EntryPattern[] = [
	// =====================
	// VS Code Extension
	// =====================
	{
		paths: [
			'src/extension.ts',
			'src/extension.js',
			'extension.ts',
			'extension.js',
		],
		role: 'Runtime Entry (VS Code)',
		description:
			'VS Code extension activation entrypoint',
		contentMatch:
			'export function activate',
		detectedBy: 'content_analysis',
	},

	// =====================
	// React
	// =====================
	{
		paths: [
			'src/main.tsx',
			'src/main.jsx',
			'src/index.tsx',
			'src/index.jsx',
		],
		role: 'Runtime Entry (React)',
		description:
			'React application bootstrap',
		contentMatch: 'createRoot',
		detectedBy: 'content_analysis',
	},
	{
		paths: [
			'src/App.tsx',
			'src/App.jsx',
			'src/app.tsx',
			'src/app.jsx',
		],
		role: 'Application Root (React)',
		description:
			'React root application component',
		detectedBy: 'file_pattern',
	},

	// =====================
	// Next.js (App Router)
	// =====================
	{
		paths: [
			'app/layout.tsx',
			'app/layout.jsx',
			'app/layout.js',
			'src/app/layout.tsx',
			'src/app/layout.jsx',
		],
		role: 'Layout Root (Next.js)',
		description:
			'Next.js root layout component',
		detectedBy: 'file_pattern',
	},
	{
		paths: [
			'app/page.tsx',
			'app/page.jsx',
			'app/page.js',
			'src/app/page.tsx',
			'src/app/page.jsx',
		],
		role: 'Route Entry (Next.js)',
		description:
			'Next.js root page component',
		detectedBy: 'file_pattern',
	},

	// =====================
	// Next.js (Pages Router)
	// =====================
	{
		paths: [
			'pages/_app.tsx',
			'pages/_app.jsx',
			'pages/_app.js',
			'src/pages/_app.tsx',
		],
		role: 'Application Root (Next.js Pages)',
		description:
			'Next.js Pages Router app wrapper',
		detectedBy: 'file_pattern',
	},
	{
		paths: [
			'pages/index.tsx',
			'pages/index.jsx',
			'pages/index.js',
			'src/pages/index.tsx',
		],
		role: 'Route Entry (Next.js Pages)',
		description:
			'Next.js Pages Router index page',
		detectedBy: 'file_pattern',
	},

	// =====================
	// Node.js / Express / Fastify
	// =====================
	{
		paths: [
			'src/server.ts',
			'src/server.js',
			'server.ts',
			'server.js',
		],
		role: 'Server Entry (Node.js)',
		description:
			'HTTP server entrypoint',
		contentMatch: 'listen',
		detectedBy: 'content_analysis',
	},
	{
		paths: [
			'src/app.ts',
			'src/app.js',
			'app.ts',
			'app.js',
		],
		role: 'Application Entry (Node.js)',
		description:
			'Node.js application entrypoint',
		detectedBy: 'file_pattern',
	},

	// =====================
	// Python
	// =====================
	{
		paths: [
			'main.py',
			'src/main.py',
			'app/main.py',
		],
		role: 'Runtime Entry (Python)',
		description:
			'Python application entrypoint',
		contentMatch: "__name__",
		detectedBy: 'content_analysis',
	},
	{
		paths: [
			'app.py',
			'src/app.py',
		],
		role: 'Application Entry (Python)',
		description:
			'Python application module',
		detectedBy: 'file_pattern',
	},

	// =====================
	// Generic fallbacks (lowest priority)
	// =====================
	{
		paths: [
			'src/index.ts',
			'src/index.js',
			'index.ts',
			'index.js',
		],
		role: 'Module Entry',
		description:
			'Primary module entrypoint',
		detectedBy: 'file_pattern',
	},
];

// =====================
// Main export
// =====================

export async function analyzeEntryPoints(): Promise<
	EntryPoint[]
> {
	const workspaceFolders =
		vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		return [];
	}

	const rootUri =
		workspaceFolders[0].uri;

	const entryPoints: EntryPoint[] = [];
	const detectedPaths = new Set<string>();

	// Phase 1: Pattern-based detection
	for (const pattern of ENTRY_PATTERNS) {
		for (const candidatePath of pattern.paths) {
			// Skip if we already detected this file via a higher-priority pattern
			if (
				detectedPaths.has(candidatePath)
			) {
				continue;
			}

			const fileUri =
				vscode.Uri.joinPath(
					rootUri,
					candidatePath
				);

			// Check if file exists
			const exists =
				await fileExists(fileUri);

			if (!exists) {
				continue;
			}

			// Build evidence
			const evidence: EvidenceItem[] = [
				{
					source: 'file_pattern',
					signal: `file exists: ${candidatePath}`,
					weight: WEIGHTS.FILE_EXISTS,
				},
			];

			let detectedBy =
				pattern.detectedBy;

			// Content verification if pattern requires it
			if (pattern.contentMatch) {
				const hasContent =
					await fileContains(
						fileUri,
						pattern.contentMatch
					);

				if (hasContent) {
					evidence.push({
						source:
							'content_analysis',
						signal: `contains: ${pattern.contentMatch}`,
						weight:
							WEIGHTS.CONTENT_CONFIRMED,
					});

					detectedBy =
						'content_analysis';
				}
			}

			const { score } =
				computeConfidence(evidence);

			entryPoints.push({
				path: candidatePath,
				role: pattern.role,
				description:
					pattern.description,
				confidence: score,
				detectedBy,
			});

			detectedPaths.add(candidatePath);
		}
	}

	// Phase 2: Package.json-based detection
	const packageEntries =
		await detectPackageJsonEntries(
			rootUri
		);

	for (const entry of packageEntries) {
		if (!detectedPaths.has(entry.path)) {
			entryPoints.push(entry);
			detectedPaths.add(entry.path);
		}
	}

	return entryPoints;
}

// =====================
// Package.json detection
// =====================

async function detectPackageJsonEntries(
	rootUri: vscode.Uri
): Promise<EntryPoint[]> {
	const entries: EntryPoint[] = [];

	try {
		const packageUri =
			vscode.Uri.joinPath(
				rootUri,
				'package.json'
			);

		const bytes =
			await vscode.workspace.fs.readFile(
				packageUri
			);

		const packageJson = JSON.parse(
			Buffer.from(bytes).toString('utf-8')
		);

		// Main field — skip if it points to build output
		if (packageJson.main) {
			const mainPath: string =
				packageJson.main;

			const isBuildOutput =
				BUILD_OUTPUT_PREFIXES.some(
					(prefix) =>
						mainPath.startsWith(
							prefix
						)
				);

			if (!isBuildOutput) {
				const evidence: EvidenceItem[] = [
					{
						source: 'package_json',
						signal: `package.json main: ${mainPath}`,
						weight:
							WEIGHTS.PACKAGE_JSON_REFERENCE,
					},
				];

				const { score } =
					computeConfidence(evidence);

				entries.push({
					path: mainPath,
					role: 'Build Entry',
					description:
						'Module entrypoint (package.json main)',
					confidence: score,
					detectedBy: 'package_json',
				});
			}
		}

		// Bin field
		if (packageJson.bin) {
			const binPaths =
				typeof packageJson.bin ===
				'string'
					? {
							[packageJson.name ??
							'cli']:
								packageJson.bin,
						}
					: packageJson.bin;

			for (const [
				name,
				binPath,
			] of Object.entries(binPaths)) {
				const evidence: EvidenceItem[] =
					[
						{
							source:
								'package_json',
							signal: `package.json bin: ${name}`,
							weight:
								WEIGHTS.PACKAGE_JSON_REFERENCE,
						},
					];

				const { score } =
					computeConfidence(evidence);

				entries.push({
					path: binPath as string,
					role: 'CLI Entry',
					description: `CLI binary: ${name}`,
					confidence: score,
					detectedBy: 'package_json',
				});
			}
		}

		// VS Code contributes.commands
		if (
			packageJson.contributes?.commands
				?.length
		) {
			const commands =
				packageJson.contributes.commands;

			const evidence: EvidenceItem[] = [
				{
					source: 'package_json',
					signal: `contributes.commands: ${commands.length} command(s)`,
					weight:
						WEIGHTS.PACKAGE_JSON_REFERENCE,
				},
			];

			const { score } =
				computeConfidence(evidence);

			entries.push({
				path: 'package.json → contributes.commands',
				role: 'Command Registry (VS Code)',
				description: `Registers ${commands.length} VS Code command(s): ${commands.map((c: { title: string }) => c.title).join(', ')}`,
				confidence: score,
				detectedBy: 'package_json',
			});
		}
	} catch {
		// No package.json or parse error — skip
	}

	return entries;
}

// =====================
// Utilities
// =====================

async function fileExists(
	uri: vscode.Uri
): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(uri);
		return true;
	} catch {
		return false;
	}
}

async function fileContains(
	uri: vscode.Uri,
	substring: string
): Promise<boolean> {
	try {
		const bytes =
			await vscode.workspace.fs.readFile(
				uri
			);

		const content = Buffer.from(
			bytes
		).toString('utf-8');

		return content.includes(substring);
	} catch {
		return false;
	}
}