import * as vscode from 'vscode';
import { getFolderTaxonomy } from '../intelligence/folderTaxonomy';
import {
	computeConfidence,
	WEIGHTS,
} from '../intelligence/confidenceEngine';
import type { EvidenceItem } from '../intelligence/confidenceEngine';
import type { ImportGraphEnriched } from './analyzeImports';
import type {
	RiskLevel,
	ImportanceLevel,
} from '../types/prasangTypes';

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
	responsibilities: string[];
	collaborators: string[];
	risk: RiskLevel;
	riskReason: string;
	importance: ImportanceLevel;
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
	'out',
	'coverage',
	'vendor',
	'__pycache__',
	'.cache',
	'.parcel-cache',
]);

/**
 * File naming patterns that refine folder purpose.
 * Each entry: [pattern substring, signal name, purpose override condition, override value]
 */
const FILE_PATTERNS: Array<{
	match: string;
	signal: string;
	weight: number;
	responsibility: string;
	overrideWhen?: string;
	overrideTo?: string;
}> = [
	{
		match: 'analyze',
		signal: 'analysis file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		responsibility:
			'repository analysis',
		overrideWhen:
			'Core application logic',
		overrideTo:
			'Repository analysis logic',
	},
	{
		match: 'command',
		signal: 'command file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		responsibility:
			'command orchestration',
		overrideWhen:
			'Command orchestration layer',
		overrideTo:
			'VS Code command orchestration',
	},
	{
		match: 'generate',
		signal: 'generation file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		responsibility:
			'content generation',
		overrideWhen:
			'Content generation layer',
		overrideTo:
			'PRASANG markdown generation',
	},
	{
		match: 'create',
		signal: 'creation file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		responsibility: 'resource creation',
	},
	{
		match: 'render',
		signal: 'rendering file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		responsibility: 'content rendering',
	},
	{
		match: 'test',
		signal: 'testing file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		responsibility: 'testing',
	},
	{
		match: 'util',
		signal: 'utility file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		responsibility:
			'shared helper functions',
	},
	{
		match: 'config',
		signal: 'configuration file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		responsibility:
			'configuration management',
	},
	{
		match: 'service',
		signal: 'service file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		responsibility:
			'business logic services',
	},
	{
		match: 'middleware',
		signal: 'middleware file pattern',
		weight: WEIGHTS.FILE_NAMING_PATTERN,
		responsibility:
			'request/response middleware',
	},
];

// =====================
// Main export
// =====================

/**
 * Analyze folder structure with enriched intelligence.
 *
 * When importGraph is provided, computes:
 * - collaborators: which folders this folder's files import from
 * - risk: based on blast radius of files in the folder
 * - importance: based on structural role of files in the folder
 *
 * The importGraph parameter is optional for backward compatibility.
 */
export async function analyzeFolders(
	importGraph?: ImportGraphEnriched
): Promise<FolderAnalysis[]> {
	const workspaceFolders =
		vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		return [];
	}

	const rootPath =
		workspaceFolders[0].uri;

	const analyses: FolderAnalysis[] = [];

	// Pre-compute folder-level import data if graph is available
	const folderCollaborators = importGraph
		? computeFolderCollaborators(
				importGraph
			)
		: new Map<string, Set<string>>();

	const folderMaxBlastRadius = importGraph
		? computeFolderMaxBlastRadius(
				importGraph
			)
		: new Map<string, number>();

	const folderFileRoles = importGraph
		? computeFolderFileRoles(importGraph)
		: new Map<string, Set<string>>();

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
			const responsibilities: string[] =
				[];

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

					responsibilities.push(
						pattern.responsibility
					);

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

			// Compute graph-derived properties
			const collaborators = [
				...(folderCollaborators.get(
					folderPath
				) ?? new Set<string>()),
			].sort();

			const maxBlast =
				folderMaxBlastRadius.get(
					folderPath
				) ?? 0;

			const fileRoles =
				folderFileRoles.get(
					folderPath
				) ??
				new Set<string>();

			// Deduplicate responsibilities
			const uniqueResponsibilities = [
				...new Set(responsibilities),
			];

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
				responsibilities:
					uniqueResponsibilities,
				collaborators,
				risk: computeFolderRisk(
					maxBlast
				),
				riskReason: computeFolderRiskReason(folderPath, computeFolderRisk(maxBlast), fileRoles),
				importance:
					computeFolderImportance(
						fileRoles
					),
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

// =====================
// Graph-derived computations
// =====================

/**
 * For each folder, find which OTHER folders its files import from.
 */
function computeFolderCollaborators(
	graph: ImportGraphEnriched
): Map<string, Set<string>> {
	const result = new Map<
		string,
		Set<string>
	>();

	for (const edge of graph.edges) {
		const sourceFolder = getFolder(
			edge.source
		);
		const targetFolder = getFolder(
			edge.target
		);

		// Only count cross-folder imports
		if (sourceFolder === targetFolder) {
			continue;
		}

		const collaborators =
			result.get(sourceFolder) ??
			new Set<string>();
		collaborators.add(targetFolder);
		result.set(
			sourceFolder,
			collaborators
		);
	}

	return result;
}

/**
 * For each folder, find the maximum blast radius of any file in it.
 */
function computeFolderMaxBlastRadius(
	graph: ImportGraphEnriched
): Map<string, number> {
	const result = new Map<
		string,
		number
	>();

	for (const file of graph.files) {
		const folder = getFolder(file);

		// Count files that directly or transitively depend on this file
		const dependents =
			countTransitiveDependents(
				file,
				graph.reverseAdjacency
			);

		const current =
			result.get(folder) ?? 0;

		if (dependents > current) {
			result.set(folder, dependents);
		}
	}

	return result;
}

/**
 * Count transitive dependents of a file (BFS on reverse adjacency).
 */
function countTransitiveDependents(
	file: string,
	reverseAdj: Map<string, string[]>
): number {
	const visited = new Set<string>();
	visited.add(file);

	const queue = [file];

	while (queue.length > 0) {
		const current = queue.shift()!;
		const deps =
			reverseAdj.get(current) ?? [];

		for (const dep of deps) {
			if (!visited.has(dep)) {
				visited.add(dep);
				queue.push(dep);
			}
		}
	}

	// Subtract 1 for the file itself
	return visited.size - 1;
}

/**
 * For each folder, collect the high-impact roles of its files.
 *
 * Roles: 'orchestrator' | 'hub' | 'central_engine' | 'entry_point'
 */
function computeFolderFileRoles(
	graph: ImportGraphEnriched
): Map<string, Set<string>> {
	const result = new Map<
		string,
		Set<string>
	>();

	for (const file of graph.files) {
		const folder = getFolder(file);
		const roles =
			result.get(folder) ??
			new Set<string>();

		const inDeg =
			graph.inDegreeMap.get(file) ?? 0;
		const outDeg =
			graph.outDegreeMap.get(file) ?? 0;

		if (outDeg >= 3) {
			roles.add('orchestrator');
		}
		if (inDeg >= 3) {
			roles.add('hub');
		}
		if (inDeg >= 2 && outDeg >= 2) {
			roles.add('central_engine');
		}
		if (inDeg === 0 && outDeg >= 1) {
			roles.add('entry_point');
		}

		result.set(folder, roles);
	}

	return result;
}

// =====================
// Risk & Importance
// =====================

function computeFolderRisk(
	maxBlastRadius: number
): RiskLevel {
	if (maxBlastRadius >= 5) {
		return 'CRITICAL';
	}
	if (maxBlastRadius >= 3) {
		return 'HIGH';
	}
	if (maxBlastRadius >= 2) {
		return 'MEDIUM';
	}
	return 'LOW';
}

function computeFolderImportance(
	fileRoles: Set<string>
): ImportanceLevel {
	if (
		fileRoles.has('orchestrator') ||
		fileRoles.has('hub')
	) {
		return 'HIGH';
	}
	if (fileRoles.has('central_engine')) {
		return 'MEDIUM';
	}
	return 'LOW';
}

function computeFolderRiskReason(
	folderPath: string,
	risk: RiskLevel,
	fileRoles: Set<string>
): string {
	if (risk === 'LOW') {
		return 'Limited blast radius';
	}

	const roleDescriptions: string[] = [];

	if (fileRoles.has('orchestrator')) {
		roleDescriptions.push('orchestration');
	}
	if (fileRoles.has('hub')) {
		roleDescriptions.push('shared dependency');
	}
	if (fileRoles.has('central_engine')) {
		roleDescriptions.push('cross-layer bridging');
	}
	if (fileRoles.has('entry_point')) {
		roleDescriptions.push('execution entry');
	}

	const roleText =
		roleDescriptions.length > 0
			? ` due to ${roleDescriptions.join(', ')}`
			: '';

	return `${risk} risk concentration in ${folderPath}${roleText}`;
}

// =====================
// Utilities
// =====================

function getFolder(
	filePath: string
): string {
	const lastSlash =
		filePath.lastIndexOf('/');

	if (lastSlash === -1) {
		return '';
	}

	return filePath.slice(0, lastSlash);
}