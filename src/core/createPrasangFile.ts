import * as vscode from 'vscode';
import { analyzeRepository } from './analyzeRepository';
import { analyzeFolders } from './analyzeFolders';
import { analyzeDependencies } from './analyzeDependencies';

export async function createPrasangFile() {
	const workspaceFolders =
		vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		vscode.window.showErrorMessage(
			'No workspace folder found'
		);
		return;
	}

	const repository =
		await analyzeRepository();

	if (!repository) {
		vscode.window.showErrorMessage(
			'Failed to analyze repository'
		);
		return;
	}

	const folderAnalysis =
		await analyzeFolders();

    const dependencyAnalysis =
        await analyzeDependencies();

	const rootPath =
		workspaceFolders[0].uri;

	const prasangFileUri =
		vscode.Uri.joinPath(
			rootPath,
			'PRASANG.md'
		);

	const folderSection =
		folderAnalysis
			.map((folder) => {
				let section =
					`### ${folder.path}

**Purpose:** ${folder.purpose}  
${folder.role ? `**Role:** ${folder.role}  \n` : ''}**Confidence:** ${folder.confidence}%  

`;

				// Subdomains
				if (
					folder.subdomains
						?.length
				) {
					section +=
						`**Subdomains**
${folder.subdomains
	.map(
		(subdomain) =>
			`- ${subdomain}`
	)
	.join('\n')}

`;
				}

				// Signals
				if (
					folder.signals
						.length
				) {
					section +=
						`**Signals**
${folder.signals
	.map(
		(signal) =>
			`- ${signal}`
	)
	.join('\n')}
`;
				}

				return section;
			})
			.join('\n');

const initialContent = `# PRASANG

## Repository Identity

**Name:** ${repository.name}  
**Language:** ${repository.language}  
**Package Manager:** ${repository.packageManager}  
**Framework:** ${repository.framework}  
**Repository Type:** ${repository.repositoryType}

## Critical Files

${repository.criticalFiles
	.map(
		(file) => `- ${file}`
	)
	.join('\n')}

${
	dependencyAnalysis
		? `## Dependency Intelligence

### Core Stack

${
	dependencyAnalysis.coreStack
		.length
		? dependencyAnalysis.coreStack
				.map(
					(dep: string) =>
						`- ${dep}`
				)
				.join('\n')
		: '- None'
}

### Tooling

${
	dependencyAnalysis.tooling
		.length
		? dependencyAnalysis.tooling
				.map(
					(tool: string) =>
						`- ${tool}`
				)
				.join('\n')
		: '- None'
}

### Architectural Signals

${
	dependencyAnalysis
		.architecturalSignals
		.length
		? dependencyAnalysis.architecturalSignals
				.map(
					(signal: string) =>
						`- ${signal}`
				)
				.join('\n')
		: '- None'
}

## Entry Points

- src/extension.ts → VS Code extension activation entrypoint
- src/commands/generatePrasangCommand.ts → command execution entrypoint

`
		: ''
}## Folder Purpose Map

${folderSection}
`;

	try {
		await vscode.workspace.fs.writeFile(
			prasangFileUri,
			Uint8Array.from(
				Buffer.from(
					initialContent
				)
			)
		);

		vscode.window.showInformationMessage(
			'PRASANG.md generated successfully'
		);
	} catch (error) {
		vscode.window.showErrorMessage(
			'Failed to create PRASANG.md'
		);
	}
}