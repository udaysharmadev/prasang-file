import * as vscode from 'vscode';
import { analyzeRepository } from './analyzeRepository';
import { analyzeFolders } from './analyzeFolders';
import { analyzeDependencies } from './analyzeDependencies';
import { analyzeEntryPoints } from './analyzeEntryPoints';
import { analyzeImports } from './analyzeImports';
import { analyzeHighImpact } from './analyzeHighImpact';
import { analyzeBlastRadius } from './analyzeBlastRadius';
import type { ImportGraph } from './analyzeImports';
import type { HighImpactFile } from './analyzeHighImpact';
import type { BlastRadiusEntry } from './analyzeBlastRadius';

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

	const entryPoints =
		await analyzeEntryPoints();

	const importGraph =
		await analyzeImports();

	// Phase 3: Graph-derived analysis (no extra I/O)
	const highImpactFiles =
		analyzeHighImpact(importGraph);

	const blastRadius =
		analyzeBlastRadius(
			importGraph,
			folderAnalysis
		);

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

	const dependencySection =
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
`
			: '';

	const entryPointSection =
		entryPoints.length
			? `## Entry Points

${entryPoints
	.map(
		(entry) =>
			`### ${entry.role}

- ${entry.path}  
  ${entry.description}  
  **Confidence:** ${entry.confidence}%
`
	)
	.join('\n')}
`
			: '';

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

${dependencySection}

${entryPointSection}

${renderSystemRelationships(importGraph)}

${renderHighImpactFiles(highImpactFiles)}

${renderBlastRadius(blastRadius)}

## Folder Purpose Map

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

// =====================
// Section renderers
// =====================

function renderSystemRelationships(
	graph: ImportGraph
): string {
	if (graph.edgeCount === 0) {
		return '';
	}

	// Group edges by source
	const grouped = new Map<
		string,
		string[]
	>();

	for (const edge of graph.edges) {
		const targets =
			grouped.get(edge.source) ?? [];

		targets.push(edge.target);
		grouped.set(edge.source, targets);
	}

	// Compute in-degree for each file
	const inDegree = new Map<
		string,
		number
	>();

	for (const edge of graph.edges) {
		inDegree.set(
			edge.target,
			(inDegree.get(edge.target) ??
				0) + 1
		);
	}

	// Find root nodes (in-degree 0, has outgoing edges)
	const roots = [
		...grouped.keys(),
	].filter(
		(source) =>
			(inDegree.get(source) ?? 0) ===
			0
	);

	// Build flows: trace each root through its chain
	const flows: Array<{
		name: string;
		chain: Array<{
			source: string;
			targets: string[];
		}>;
	}> = [];

	const assignedToFlow =
		new Set<string>();

	for (const root of roots.sort()) {
		const chain: Array<{
			source: string;
			targets: string[];
		}> = [];

		// BFS from root, collecting edges in order
		const visited = new Set<string>();
		const queue = [root];
		visited.add(root);

		while (queue.length > 0) {
			const current =
				queue.shift()!;
			const targets =
				grouped.get(current);

			if (
				targets &&
				targets.length > 0
			) {
				const sorted = [
					...targets,
				].sort();

				chain.push({
					source: current,
					targets: sorted,
				});

				for (const t of sorted) {
					if (
						!visited.has(t)
					) {
						visited.add(t);
						queue.push(t);
					}
				}
			}
		}

		if (chain.length > 0) {
			// Determine flow name from root file
			const flowName =
				deriveFlowName(root);

			flows.push({
				name: flowName,
				chain,
			});

			for (const entry of chain) {
				assignedToFlow.add(
					entry.source
				);
			}
		}
	}

	// Collect any edges not covered by flows
	const unassigned: Array<{
		source: string;
		targets: string[];
	}> = [];

	for (const source of [
		...grouped.keys(),
	].sort()) {
		if (!assignedToFlow.has(source)) {
			const targets = [
				...grouped.get(source)!,
			].sort();

			unassigned.push({
				source,
				targets,
			});
		}
	}

	// Render
	const lines: string[] = [
		'## System Relationships',
		'',
	];

	for (const flow of flows) {
		lines.push(`### ${flow.name}`);
		lines.push('');

		for (const entry of flow.chain) {
			lines.push(entry.source);

			for (const target of entry.targets) {
				lines.push(
					`→ ${target}`
				);
			}

			lines.push('');
		}
	}

	if (unassigned.length > 0) {
		lines.push('### Other');
		lines.push('');

		for (const entry of unassigned) {
			lines.push(entry.source);

			for (const target of entry.targets) {
				lines.push(
					`→ ${target}`
				);
			}

			lines.push('');
		}
	}

	return lines.join('\n');
}

/**
 * Derive a human-readable flow name from a root file path.
 * Deterministic: based on file location and name.
 */
function deriveFlowName(
	rootPath: string
): string {
	const fileName = rootPath
		.split('/')
		.pop()!;

	const baseName = fileName.replace(
		/\.[^.]+$/,
		''
	);

	const nameMap: Record<string, string> =
		{
			extension: 'Runtime Flow',
			server: 'Server Flow',
			app: 'Application Flow',
			main: 'Main Flow',
			index: 'Entry Flow',
			layout: 'Layout Flow',
			page: 'Page Flow',
		};

	return (
		nameMap[baseName] ??
		`${baseName.charAt(0).toUpperCase() + baseName.slice(1)} Flow`
	);
}

function renderHighImpactFiles(
	files: HighImpactFile[]
): string {
	if (files.length === 0) {
		return '';
	}

	const lines: string[] = [
		'## High Impact Files',
		'',
	];

	// Group by category
	const categories: Map<
		string,
		HighImpactFile[]
	> = new Map();

	for (const file of files) {
		const group =
			categories.get(
				file.category
			) ?? [];

		group.push(file);

		categories.set(
			file.category,
			group
		);
	}

	// Render in priority order
	const categoryOrder = [
		'Orchestrator',
		'Hub',
		'Central Engine',
		'Entry Point',
	];

	for (const category of categoryOrder) {
		const group =
			categories.get(category);

		if (!group || group.length === 0) {
			continue;
		}

		lines.push(
			`### ${category}s`
		);
		lines.push('');

		for (const file of group) {
			lines.push(
				`- ${file.path} — ${file.reason}`
			);
		}

		lines.push('');
	}

	return lines.join('\n');
}

function renderBlastRadius(
	entries: BlastRadiusEntry[]
): string {
	if (entries.length === 0) {
		return '';
	}

	const lines: string[] = [
		'## Blast Radius',
		'',
	];

	for (const entry of entries) {
		lines.push(entry.path);

		if (
			entry.directImpact.length > 0
		) {
			lines.push('');
			lines.push(
				'**Direct Impact**'
			);

			for (const affected of entry.directImpact) {
				lines.push(
					`- ${affected.path} (${affected.context})`
				);
			}
		}

		if (
			entry.indirectImpact.length > 0
		) {
			lines.push('');
			lines.push(
				'**Indirect Impact**'
			);

			for (const affected of entry.indirectImpact) {
				lines.push(
					`- ${affected.path} (${affected.context})`
				);
			}
		}

		lines.push('');
	}

	return lines.join('\n');
}