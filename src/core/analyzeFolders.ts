import * as vscode from 'vscode';
import { getFolderTaxonomy } from '../intelligence/folderTaxonomy';
import {
	computeConfidence,
	WEIGHTS,
} from '../intelligence/confidenceEngine';
import type { EvidenceItem } from '../intelligence/confidenceEngine';

// =====================
// Types
// =====================

export interface FolderAnalysis {
	path: string;
	purpose: string;
	role?: string;
	confidence: number;
	signals: string[];
	subdomains?: string[];
}

// =====================
// Constants
// =====================

const IGNORED_DIRS = new Set([
	'.git',
	'node_modules',
	'dist',
	'build',
	'.next',
	'.turbo',
]);

/**
 * File naming patterns that refine folder purpose.
 * Each entry: [pattern substring, signal name, purpose override condition, override value]
 */
const FILE_PATTERNS: Array<{
	match: string;
	signal: string;
	weight: number;
	overrideWhen?: string;
	overrideTo?: string;
}> = [
	{
		match: 'analyze',
		signal: 'analysis file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		overrideWhen:
			'Core application logic',
		overrideTo:
			'Repository analysis logic',
	},
	{
		match: 'command',
		signal: 'command file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		overrideWhen:
			'Command orchestration layer',
		overrideTo:
			'VS Code command orchestration',
	},
	{
		match: 'generate',
		signal: 'generation file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		overrideWhen:
			'Content generation layer',
		overrideTo:
			'PRASANG markdown generation',
	},
	{
		match: 'test',
		signal: 'testing file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
	},
];

// =====================
// Main export
// =====================

export async function analyzeFolders(): Promise<
	FolderAnalysis[]
> {
	const workspaceFolders =
		vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		return [];
	}

	const rootPath =
		workspaceFolders[0].uri;

	const analyses: FolderAnalysis[] = [];

	async function walkFolder(
		parentUri: vscode.Uri,
		basePath = ''
	) {
		const entries =
			await vscode.workspace.fs.readDirectory(
				parentUri
			);

		const folders = entries.filter(
			([_, fileType]) =>
				fileType ===
				vscode.FileType.Directory
		);

		for (const [folderName] of folders) {
			if (
				IGNORED_DIRS.has(folderName)
			) {
				continue;
			}

			const folderUri =
				vscode.Uri.joinPath(
					parentUri,
					folderName
				);

			const folderEntries =
				await vscode.workspace.fs.readDirectory(
					folderUri
				);

			const subdomains = folderEntries
				.filter(
					([_, type]) =>
						type ===
						vscode.FileType
							.Directory
				)
				.map(([name]) => name)
				.filter(
					(name) =>
						!IGNORED_DIRS.has(name)
				);

			// Only immediate files
			const fileNames = folderEntries
				.filter(
					([_, type]) =>
						type ===
						vscode.FileType.File
				)
				.map(([name]) => name);

			const folderPath = basePath
				? `${basePath}/${folderName}`
				: folderName;

			// =====================
			// Build evidence
			// =====================

			let purpose = 'Unknown';
			let role: string | undefined;
			const evidence: EvidenceItem[] =
				[];
			const signals: string[] = [];

			// Taxonomy evidence
			const taxonomyMatch =
				getFolderTaxonomy(folderName);

			if (taxonomyMatch) {
				purpose =
					taxonomyMatch.purpose;
				role = taxonomyMatch.role;

				// Use the taxonomy's own confidence boost as weight.
				// High-confidence entries like .vscode (90) should stay high.
				evidence.push({
					source: 'folder_taxonomy',
					signal: `taxonomy: ${folderName}`,
					weight:
						taxonomyMatch.confidenceBoost,
				});

				signals.push(
					...taxonomyMatch.signals
				);
			}

			// File naming pattern evidence
			for (const pattern of FILE_PATTERNS) {
				if (
					fileNames.some((file) =>
						file
							.toLowerCase()
							.includes(
								pattern.match
							)
					)
				) {
					signals.push(
						pattern.signal
					);

					evidence.push({
						source: 'file_pattern',
						signal: pattern.signal,
						weight: pattern.weight,
					});

					// Contextual purpose refinement
					if (
						pattern.overrideWhen &&
						pattern.overrideTo &&
						purpose ===
							pattern.overrideWhen
					) {
						purpose =
							pattern.overrideTo;
					}
				}
			}

			// TypeScript file evidence
			if (
				fileNames.some((file) =>
					file.endsWith('.ts')
				)
			) {
				signals.push(
					'typescript files'
				);

				evidence.push({
					source: 'file_type',
					signal: 'typescript files',
					weight:
						WEIGHTS.TYPESCRIPT_FILES,
				});
			}

			// Implementation file density evidence
			// Folders with multiple implementation files are more significant
			const implFiles =
				fileNames.filter(
					(f) =>
						f.endsWith('.ts') ||
						f.endsWith('.tsx') ||
						f.endsWith('.js') ||
						f.endsWith('.jsx')
				);

			if (implFiles.length >= 2) {
				const bonus = Math.min(
					implFiles.length * 5,
					20
				);

				evidence.push({
					source:
						'implementation_density',
					signal: `${implFiles.length} implementation files`,
					weight: bonus,
				});
			}

			// Subdomain coherence evidence
			if (subdomains.length > 0) {
				const knownSubdomains =
					subdomains.filter(
						(name) =>
							getFolderTaxonomy(
								name
							) !== null
					);

				if (
					knownSubdomains.length > 0
				) {
					evidence.push({
						source:
							'subdomain_coherence',
						signal: `${knownSubdomains.length}/${subdomains.length} subfolders match conventions`,
						weight:
							WEIGHTS.SUBDOMAIN_COHERENCE,
					});
				}
			}

			// Compute final confidence
			const { score } =
				computeConfidence(evidence);

			analyses.push({
				path: folderPath,
				purpose,
				role,
				confidence: score,
				signals,
				subdomains:
					subdomains.length > 0
						? subdomains
						: undefined,
			});

			await walkFolder(
				folderUri,
				folderPath
			);
		}
	}

	await walkFolder(rootPath);

	return analyses;
}