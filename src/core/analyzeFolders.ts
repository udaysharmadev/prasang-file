import * as vscode from 'vscode';
import { getFolderTaxonomy } from '../intelligence/folderTaxonomy';

export interface FolderAnalysis {
	path: string;
	purpose: string;
	role?: string;
	confidence: number;
	signals: string[];
	subdomains?: string[];
}

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

	async function analyzeFolder(
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
				[
					'.git',
					'node_modules',
					'dist',
					'build',
					'.next',
					'.turbo'
				].includes(folderName)
			) {
				continue;
			}

			const signals: string[] = [];

			let purpose = 'Unknown';
let role: string | undefined;
let confidence = 0;

			const folderUri =
				vscode.Uri.joinPath(
					parentUri,
					folderName
				);

			const folderEntries =
				await vscode.workspace.fs.readDirectory(
					folderUri
				);

            const subdomains =
	folderEntries
		.filter(
			([_, type]) =>
				type ===
				vscode.FileType.Directory
		)
		.map(([name]) => name)
		.filter(
			(name) =>
				![
					'.git',
					'node_modules',
					'dist',
					'build'
				].includes(name)
		);

			// FIX: only immediate files
			const fileNames =
				folderEntries
					.filter(
						([_, type]) =>
							type ===
							vscode.FileType.File
					)
					.map(
						([name]) => name
					);

			const folderPath = basePath
				? `${basePath}/${folderName}`
				: folderName;

			// =====================
			// Taxonomy
			// =====================

			const taxonomyMatch =
				getFolderTaxonomy(
					folderName
				);

			if (taxonomyMatch) {
	purpose =
		taxonomyMatch.purpose;

	role =
		taxonomyMatch.role;

	confidence +=
		taxonomyMatch.confidenceBoost;

	signals.push(
		...taxonomyMatch.signals
	);
}

			// =====================
			// File intelligence
			// =====================

			if (
				fileNames.some((file) =>
					file
						.toLowerCase()
						.includes(
							'analyze'
						)
				)
			) {
				signals.push(
					'analysis file pattern'
				);

				confidence += 10;

				if (
					purpose ===
					'Core application logic'
				) {
					purpose =
						'Repository analysis logic';
				}
			}

			if (
				fileNames.some((file) =>
					file
						.toLowerCase()
						.includes(
							'command'
						)
				)
			) {
				signals.push(
					'command file pattern'
				);

				confidence += 10;

				if (
					purpose ===
					'Command orchestration layer'
				) {
					purpose =
						'VS Code command orchestration';
				}
			}

			if (
				fileNames.some((file) =>
					file
						.toLowerCase()
						.includes(
							'generate'
						)
				)
			) {
				signals.push(
					'generation file pattern'
				);

				confidence += 10;

				if (
					purpose ===
					'Content generation layer'
				) {
					purpose =
						'PRASANG markdown generation';
				}
			}

			if (
				fileNames.some((file) =>
					file
						.toLowerCase()
						.includes('test')
				)
			) {
				signals.push(
					'testing file pattern'
				);

				confidence += 10;
			}

			if (
				fileNames.some((file) =>
					file.endsWith('.ts')
				)
			) {
				signals.push(
					'typescript files'
				);

				confidence += 5;
			}

			confidence =
				Math.min(
					confidence,
					95
				);

			analyses.push({
	path: folderPath,
	purpose,
    role,
	confidence,
	signals,
	subdomains:
		subdomains.length > 0
			? subdomains
			: undefined,
});

			await analyzeFolder(
				folderUri,
				folderPath
			);
		}
	}

	await analyzeFolder(rootPath);

	return analyses;
}