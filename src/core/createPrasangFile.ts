import * as vscode from 'vscode';
import { analyzeRepository } from './analyzeRepository';
import type { RepositoryIdentity } from './analyzeRepository';
import { analyzeFolders } from './analyzeFolders';
import type { FolderAnalysis } from './analyzeFolders';
import { analyzeDependencies } from './analyzeDependencies';
import type { DependencyAnalysis } from './analyzeDependencies';
import { analyzeEntryPoints } from './analyzeEntryPoints';
import { analyzeImports } from './analyzeImports';
import { analyzeHighImpact } from './analyzeHighImpact';
import { analyzeBlastRadius } from './analyzeBlastRadius';
import { detectArchitecturePattern } from './analyzeArchitecturePattern';
import { detectFrameworks } from '../intelligence/frameworkFingerprinting';
import type { ImportGraph } from './analyzeImports';
import type { HighImpactFile } from './analyzeHighImpact';
import type { BlastRadiusEntry } from './analyzeBlastRadius';
import type { FrameworkFingerprint, ArchitecturePattern } from '../types/prasangTypes';
import { analyzeRepositorySummary } from './analyzeRepositorySummary';
import {
	getAIAdvisorSection,
	getAIConfig,
} from '../intelligence/aiAdvisor';
import type { AIAdvisorContext } from '../intelligence/aiAdvisor';

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
		analyzeDependencies(
			repository.packageJson,
			repository.rootFileNames
		);

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

	const frameworkFingerprints =
		detectFrameworks(
			repository.packageJson,
			repository.rootFileNames
		);

	const architecturePatterns =
		detectArchitecturePattern(
			folderAnalysis,
			importGraph.edges,
			repository.rootFileNames
		);

	const topPattern =
		architecturePatterns[0];

	const repositorySummary =
		analyzeRepositorySummary({
			repositoryName:
				repository.name,
			entryPoints:
				entryPoints.map(
					(entry) => ({
						path: entry.path,
						role: entry.role,
					})
				),
			highImpactFiles:
				highImpactFiles.map(
					(file) => ({
						path: file.path,
					})
				),
			architecturePattern: topPattern
				? {
						pattern:
							topPattern.name,
						confidence:
							topPattern.confidence,
					}
				: undefined,
		});

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

${renderDependencyLayers(
	dependencyAnalysis.layers
)}

### Architectural Signals

${
	dependencyAnalysis
		.architecturalSignals
		.length
		? dependencyAnalysis.architecturalSignals
				.map(
					(
						signal: string
					) =>
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

	const snapshotSection =
		renderRepositorySnapshot(
			repository,
			entryPoints,
			topPattern
		);

	const frameworkSection =
		renderFrameworkIntelligence(
			frameworkFingerprints,
			dependencyAnalysis
		);

	const healthSection =
		renderRepositoryHealth(
			folderAnalysis,
			importGraph,
			highImpactFiles,
			blastRadius,
			topPattern
		);

	const architectureFlowSection =
		renderArchitectureFlow(
			importGraph,
			highImpactFiles
		);

	// AI Repository Advisor (optional, non-blocking)
	const aiConfig = getAIConfig();
	const aiContext: AIAdvisorContext = {
		repositoryName: repository.name,
		language: repository.language,
		repositoryType:
			repository.repositoryType,
		architecture:
			topPattern?.name ??
			'Standard project structure',
		frameworkName:
			frameworkFingerprints[0]?.name ??
			'Unknown',
		dependencyCount:
			(dependencyAnalysis?.layers
				?.length ?? 0),
		architecturalSignals:
			dependencyAnalysis
				?.architecturalSignals ?? [],
		highImpactFiles:
			highImpactFiles.map((f) => ({
				path: f.path,
				category: f.category,
			})),
		blastRadiusRisks: blastRadius
			.filter(
				(b) =>
					b.riskLevel === 'CRITICAL' ||
					b.riskLevel === 'HIGH'
			)
			.map((b) => ({
				path: b.path,
				totalAffected: b.totalAffected,
			})),
		healthStrengths: [],
		healthRisks: [],
	};
	const aiAdvisorSection =
		await getAIAdvisorSection(
			aiConfig,
			aiContext
		);

	const initialContent = `# PRASANG

## Repository Identity

**Name:** ${repository.name}  
**Language:** ${repository.language}  
**Package Manager:** ${repository.packageManager}  
**Repository Type:** ${repository.repositoryType}

${snapshotSection}

${frameworkSection}

${healthSection}

${architectureFlowSection}

${aiAdvisorSection}

## Repository Intelligence Summary

${repositorySummary.summary}


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

function renderRepositorySnapshot(
	repository: RepositoryIdentity,
	entryPoints: { role: string }[],
	architecturePattern:
		| { name: string; confidence: number }
		| undefined
): string {
	const lines: string[] = [
		'## Repository Snapshot',
		'',
	];

	// Type — derived from repositoryType
	lines.push(
		`**Type:** ${repository.repositoryType}`
	);
	lines.push('');

	// Primary Language
	lines.push(
		`**Primary Language:** ${repository.language}`
	);
	lines.push('');

	// Execution Model — inferred from entry points
	const executionModel =
		deriveExecutionModel(
			entryPoints,
			repository.repositoryType
		);
	lines.push(
		`**Execution Model:** ${executionModel}`
	);
	lines.push('');

	// Architecture
	const architecture =
		architecturePattern?.name ??
		'Standard project structure';
	lines.push(
		`**Architecture:** ${architecture}`
	);
	lines.push('');

	// Primary Goal — inferred from package description or repository type
	const primaryGoal =
		derivePrimaryGoal(
			repository
		);
	lines.push(
		`**Primary Goal:** ${primaryGoal}`
	);

	return lines.join('\n');
}

/**
 * Derive a human-readable execution model from entry point roles
 * and repository type. Deterministic — no AI, no guessing.
 */
function deriveExecutionModel(
	entryPoints: { role: string }[],
	repositoryType: string
): string {
	const roles = entryPoints.map((e) =>
		e.role.toLowerCase()
	);

	if (
		roles.some((r) =>
			r.includes('vs code')
		)
	) {
		return 'Command-driven extension runtime';
	}
	if (
		roles.some((r) =>
			r.includes('server')
		)
	) {
		return 'HTTP server process';
	}
	if (
		roles.some((r) =>
			r.includes('cli')
		)
	) {
		return 'CLI executable';
	}
	if (
		roles.some((r) =>
			r.includes('react')
		) ||
		roles.some((r) =>
			r.includes('next')
		)
	) {
		return 'Browser application';
	}

	const typeModels: Record<
		string,
		string
	> = {
		'VS Code Extension':
			'Command-driven extension runtime',
		'Node.js Project':
			'Node.js process',
		Monorepo:
			'Multi-package workspace',
		'Containerized Application':
			'Container process',
	};

	return (
		typeModels[repositoryType] ??
		'Application process'
	);
}

/**
 * Derive a concise primary goal from repository signals.
 * Uses package.json description when available, otherwise
 * falls back to repository type heuristics.
 */
function derivePrimaryGoal(
	repository: RepositoryIdentity
): string {
	// Prefer package.json description if available and concise
	const description =
		repository.packageJson
			?.description;

	if (
		description &&
		description.length > 0 &&
		description.length <= 120
	) {
		return description;
	}

	// Fallback to type-based heuristic
	const goalMap: Record<
		string,
		string
	> = {
		'VS Code Extension':
			'VS Code editor extension',
		'Node.js Project':
			'Node.js application',
		Monorepo:
			'Multi-package project coordination',
		'Containerized Application':
			'Containerized service deployment',
	};

	return (
		goalMap[
			repository.repositoryType
		] ?? 'Software application'
	);
}

/**
 * Render the Framework Intelligence section.
 *
 * Combines framework fingerprints (from frameworkFingerprinting.ts)
 * with dependency stack layers (from analyzeDependencies.ts) into
 * a compact, high-signal section.
 *
 * Deterministic — same inputs always produce the same output.
 */
function renderFrameworkIntelligence(
	fingerprints: FrameworkFingerprint[],
	deps: DependencyAnalysis
): string {
	const lines: string[] = [
		'## Framework Intelligence',
		'',
	];

	// Primary framework — highest confidence fingerprint
	const primary = fingerprints[0];

	if (primary) {
		lines.push(
			`**Runtime:** ${primary.name}`
		);
		lines.push('');
		lines.push(
			`**Confidence:** ${primary.confidence}%`
		);
		lines.push('');

		// Evidence bullets
		if (primary.signals.length > 0) {
			lines.push('**Evidence**');
			lines.push('');
			for (const signal of primary.signals) {
				lines.push(
					`- ${signal}`
				);
			}
			lines.push('');
		}
	} else {
		lines.push(
			'**Runtime:** Unknown'
		);
		lines.push('');
	}

	// Stack layers from dependency analysis
	const layerOrder: Array<{
		kind: string;
		label: string;
	}> = [
		{
			kind: 'language',
			label: 'Language',
		},
		{
			kind: 'build',
			label: 'Build System',
		},
		{
			kind: 'validation',
			label: 'Validation',
		},
		{
			kind: 'testing',
			label: 'Testing',
		},
		{
			kind: 'packageManager',
			label: 'Package Manager',
		},
	];

	// Group layers by kind
	const layersByKind = new Map<
		string,
		string[]
	>();

	for (const layer of deps.layers) {
		// Skip runtime — already covered by fingerprint above
		if (layer.layer === 'runtime') {
			continue;
		}
		const existing =
			layersByKind.get(
				layer.layer
			) ?? [];
		existing.push(layer.name);
		layersByKind.set(
			layer.layer,
			existing
		);
	}

	for (const {
		kind,
		label,
	} of layerOrder) {
		const items =
			layersByKind.get(kind);

		if (!items || items.length === 0) {
			continue;
		}

		if (items.length === 1) {
			lines.push(
				`**${label}:** ${items[0]}`
			);
		} else {
			lines.push(`**${label}**`);
			lines.push('');
			for (const item of items) {
				lines.push(
					`- ${item}`
				);
			}
		}
		lines.push('');
	}

	// Secondary frameworks (if any beyond primary)
	if (fingerprints.length > 1) {
		lines.push(
			'### Additional Frameworks'
		);
		lines.push('');

		for (const fp of fingerprints.slice(
			1
		)) {
			lines.push(
				`- ${fp.name} (${fp.category}) — ${fp.confidence}%`
			);
		}
		lines.push('');
	}

	return lines.join('\n');
}

/**
 * Render the Repository Health section.
 * Deterministically computes health metrics based on graph signals.
 */
function renderRepositoryHealth(
	folderAnalysis: FolderAnalysis[],
	importGraph: ImportGraph,
	highImpactFiles: HighImpactFile[],
	blastRadius: BlastRadiusEntry[],
	architecturePattern?: ArchitecturePattern
): string {
	const lines: string[] = [
		'## Repository Health',
		'',
	];

	const strengths: string[] = [];
	const risks: string[] = [];

	// 1. Architecture Clarity
	let architectureClarity = 'Weak';
	if (architecturePattern && architecturePattern.confidence > 70) {
		architectureClarity = 'Strong';
		strengths.push('clear layered separation');
	} else if (architecturePattern && architecturePattern.confidence > 40) {
		architectureClarity = 'Medium';
	} else {
		risks.push('unclear architectural boundaries');
	}

	// 2. Coupling Risk
	let couplingRisk = 'Low';
	const criticalBlast = blastRadius.filter(b => b.riskLevel === 'CRITICAL');
	const highBlast = blastRadius.filter(b => b.riskLevel === 'HIGH');
	
	if (criticalBlast.length > 0) {
		couplingRisk = 'High';
		for (const cb of criticalBlast.slice(0, 2)) {
			risks.push(`${cb.path} has critical blast radius (${cb.totalAffected} files)`);
		}
	} else if (highBlast.length > 2) {
		couplingRisk = 'Medium';
		risks.push('moderate coupling across modules');
	} else {
		strengths.push('low coupling risk');
	}

	// 3. Modularity
	let modularity = 'Weak';
	const lowRiskFolders = folderAnalysis.filter(f => f.risk === 'LOW');
	if (lowRiskFolders.length > folderAnalysis.length * 0.6) {
		modularity = 'Strong';
		strengths.push('strong folder organization');
	} else if (lowRiskFolders.length > folderAnalysis.length * 0.3) {
		modularity = 'Medium';
	} else {
		risks.push('weak folder isolation');
	}

	// 4. Repository Complexity
	let complexity = 'Low';
	if (importGraph.edgeCount > 300 || highImpactFiles.length > 10) {
		complexity = 'High';
		risks.push('high inter-module dependency density');
	} else if (importGraph.edgeCount > 100 || highImpactFiles.length > 5) {
		complexity = 'Medium';
	} else {
		strengths.push('low repository complexity');
	}

	// Find specific high impact risks
	for (const hif of highImpactFiles.filter(f => f.category === 'Orchestrator').slice(0, 2)) {
		const name = hif.path.split('/').pop()!;
		if (hif.outDegree > 5) {
			risks.push(`${name} has high orchestration coupling`);
		}
	}
	
	for (const hif of highImpactFiles.filter(f => f.category === 'Hub').slice(0, 2)) {
		const name = hif.path.split('/').pop()!;
		if (hif.inDegree > 5) {
			risks.push(`${name} impacts multiple systems`);
		}
	}

	// 5. AI Readiness
	let aiReadiness = 'Low';
	if (architectureClarity === 'Strong' && modularity === 'Strong') {
		aiReadiness = 'High';
		strengths.push('deterministic intelligence modules');
	} else if (architectureClarity !== 'Weak' && modularity !== 'Weak') {
		aiReadiness = 'Medium';
	}

	lines.push(`**Architecture Clarity:**\n${architectureClarity}\n`);
	lines.push(`**Coupling Risk:**\n${couplingRisk}\n`);
	lines.push(`**Modularity:**\n${modularity}\n`);
	lines.push(`**AI Readiness:**\n${aiReadiness}\n`);
	lines.push(`**Repository Complexity:**\n${complexity}\n`);

	if (risks.length > 0) {
		lines.push('### Key Risks');
		for (const risk of [...new Set(risks)].slice(0, 5)) {
			lines.push(`- ${risk}`);
		}
		lines.push('');
	}

	if (strengths.length > 0) {
		lines.push('### Strengths');
		for (const strength of [...new Set(strengths)].slice(0, 5)) {
			lines.push(`- ${strength}`);
		}
		lines.push('');
	}

	return lines.join('\n');
}

/**
 * Maximum number of nodes in the architecture diagram.
 * Keeps the Mermaid graph readable and token-efficient.
 */
const MAX_DIAGRAM_NODES = 15;

/**
 * Render a Mermaid architecture flow diagram from the import graph.
 *
 * Node selection strategy (high-signal, low-clutter):
 * 1. Use high-impact files (already classified by analyzeHighImpact)
 * 2. Sort by centralityScore descending
 * 3. Cap at MAX_DIAGRAM_NODES
 * 4. Only show edges between selected nodes
 *
 * Deterministic — same graph always produces the same diagram.
 */
function renderArchitectureFlow(
	graph: ImportGraph,
	highImpactFiles: HighImpactFile[]
): string {
	if (
		graph.edgeCount === 0 ||
		highImpactFiles.length === 0
	) {
		return '';
	}

	// Select top nodes by centrality score
	const selectedFiles = [
		...highImpactFiles,
	]
		.sort((a, b) => {
			if (
				b.centralityScore !==
				a.centralityScore
			) {
				return (
					b.centralityScore -
					a.centralityScore
				);
			}
			return a.path.localeCompare(
				b.path
			);
		})
		.slice(0, MAX_DIAGRAM_NODES);

	const selectedPaths = new Set(
		selectedFiles.map((f) => f.path)
	);

	// Build Mermaid node IDs: deterministic, derived from filename
	const nodeIdMap = new Map<
		string,
		string
	>();

	for (const file of selectedFiles) {
		const nodeId =
			deriveMermaidNodeId(file.path);
		nodeIdMap.set(file.path, nodeId);
	}

	// Filter edges: only between selected nodes
	const diagramEdges = graph.edges.filter(
		(edge) =>
			selectedPaths.has(edge.source) &&
			selectedPaths.has(edge.target)
	);

	// Build category lookup for node styling
	const categoryMap = new Map<
		string,
		string
	>();
	for (const file of selectedFiles) {
		categoryMap.set(
			file.path,
			file.category
		);
	}

	// Build the Mermaid diagram
	const lines: string[] = [
		'## Architecture Flow',
		'',
		'```mermaid',
		'graph TD',
		'',
	];

	// Node declarations with filename-only labels and category classes
	for (const file of selectedFiles) {
		const nodeId = nodeIdMap.get(
			file.path
		)!;
		const fileName = file.path
			.split('/')
			.pop()!;
		const cssClass =
			categoryToCssClass(
				file.category
			);
		lines.push(
			`  ${nodeId}["${fileName}"]:::${cssClass}`
		);
	}

	lines.push('');

	// Edge declarations
	const renderedEdges = new Set<string>();

	for (const edge of diagramEdges) {
		const sourceId = nodeIdMap.get(
			edge.source
		);
		const targetId = nodeIdMap.get(
			edge.target
		);

		if (!sourceId || !targetId) {
			continue;
		}

		const edgeKey = `${sourceId}-->${targetId}`;

		if (renderedEdges.has(edgeKey)) {
			continue;
		}

		renderedEdges.add(edgeKey);
		lines.push(
			`  ${sourceId} --> ${targetId}`
		);
	}

	// Style definitions for node categories
	lines.push('');
	lines.push(
		'  classDef orchestrator fill:#ff6b6b,stroke:#c0392b,color:#fff'
	);
	lines.push(
		'  classDef hub fill:#4ecdc4,stroke:#16a085,color:#fff'
	);
	lines.push(
		'  classDef engine fill:#f39c12,stroke:#e67e22,color:#fff'
	);
	lines.push(
		'  classDef entry fill:#9b59b6,stroke:#8e44ad,color:#fff'
	);
	lines.push('```');

	return lines.join('\n');
}

/**
 * Derive a clean, valid Mermaid node ID from a file path.
 *
 * Strategy:
 * - Use the filename without extension as the base
 * - Prefix with first directory segment for disambiguation
 * - Replace invalid characters with underscores
 * - Deterministic: same path always produces the same ID
 */
function deriveMermaidNodeId(
	filePath: string
): string {
	const segments = filePath.split('/');
	const fileName =
		segments[segments.length - 1]
			.replace(/\.[^.]+$/, '');

	// For files in subdirectories, prefix with first directory
	if (segments.length > 1) {
		const dirPrefix =
			segments[segments.length - 2];
		return sanitizeMermaidId(
			`${dirPrefix}_${fileName}`
		);
	}

	return sanitizeMermaidId(fileName);
}

/**
 * Sanitize a string into a valid Mermaid node ID.
 * Only allows alphanumeric characters and underscores.
 */
function sanitizeMermaidId(
	raw: string
): string {
	return raw.replace(
		/[^a-zA-Z0-9_]/g,
		'_'
	);
}

/**
 * Map a HighImpactCategory to a Mermaid CSS class name.
 * Used by renderArchitectureFlow for color-coded node styling.
 */
function categoryToCssClass(
	category: string
): string {
	const classMap: Record<string, string> = {
		Orchestrator: 'orchestrator',
		Hub: 'hub',
		'Central Engine': 'engine',
		'Entry Point': 'entry',
	};

	return classMap[category] ?? 'entry';
}

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

function renderDependencyLayers(
	layers: {
		layer: string;
		name: string;
	}[]
): string {
	if (layers.length === 0) {
		return '';
	}

	const grouped = new Map<
		string,
		string[]
	>();

	for (const layer of layers) {
		const existing =
			grouped.get(
				layer.layer
			) ?? [];

		existing.push(layer.name);

		grouped.set(
			layer.layer,
			existing
		);
	}

	const sectionTitles: Record<
		string,
		string
	> = {
		runtime: 'Runtime',
		language:
			'Language Layer',
		build: 'Build Layer',
		validation:
			'Validation Layer',
		testing:
			'Testing Layer',
		packageManager:
			'Package Manager',
	};

	const lines: string[] = [];

	for (const [
		layerName,
		items,
	] of grouped.entries()) {
		lines.push(
			`### ${
				sectionTitles[
					layerName
				] ?? layerName
			}`
		);

		lines.push('');

		for (const item of items) {
			lines.push(
				`- ${item}`
			);
		}

		lines.push('');
	}

	return lines.join('\n');
}