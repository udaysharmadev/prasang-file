import * as vscode from 'vscode';

// =====================
// Types
// =====================

export interface ImportEdge {
	source: string; // repo-relative: "src/extension.ts"
	target: string; // repo-relative: "src/commands/generatePrasangCommand.ts"
}

export interface ImportGraph {
	edges: ImportEdge[];
	files: string[]; // all scanned source files
	nodeCount: number;
	edgeCount: number;
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
	'.vscode',
]);

const SOURCE_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
]);

const RESOLVABLE_EXTENSIONS = [
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
];

// =====================
// Main export
// =====================

export async function analyzeImports(): Promise<ImportGraph> {
	const workspaceFolders =
		vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		return emptyGraph();
	}

	const rootUri = workspaceFolders[0].uri;

	// Step 1: Collect all source files
	const sourceFiles =
		await collectSourceFiles(rootUri, rootUri);

	// Step 2: Parse imports from each file
	const edges: ImportEdge[] = [];
	const seenEdges = new Set<string>();

	for (const filePath of sourceFiles) {
		const fileUri = vscode.Uri.joinPath(
			rootUri,
			filePath
		);

		const imports =
			await parseFileImports(
				fileUri,
				filePath,
				rootUri,
				sourceFiles
			);

		for (const edge of imports) {
			const edgeKey = `${edge.source}→${edge.target}`;

			if (!seenEdges.has(edgeKey)) {
				seenEdges.add(edgeKey);
				edges.push(edge);
			}
		}
	}

	// Step 3: Compute node count
	const allNodes = new Set<string>();

	for (const edge of edges) {
		allNodes.add(edge.source);
		allNodes.add(edge.target);
	}

	return {
		edges,
		files: sourceFiles,
		nodeCount: allNodes.size,
		edgeCount: edges.length,
	};
}

// =====================
// File walker
// =====================

async function collectSourceFiles(
	dirUri: vscode.Uri,
	rootUri: vscode.Uri,
	relativePath = ''
): Promise<string[]> {
	const results: string[] = [];

	let entries: [string, vscode.FileType][];

	try {
		entries =
			await vscode.workspace.fs.readDirectory(
				dirUri
			);
	} catch {
		return results;
	}

	for (const [name, fileType] of entries) {
		if (
			fileType ===
			vscode.FileType.Directory
		) {
			if (IGNORED_DIRS.has(name)) {
				continue;
			}

			const childPath = relativePath
				? `${relativePath}/${name}`
				: name;

			const childUri =
				vscode.Uri.joinPath(
					dirUri,
					name
				);

			const childFiles =
				await collectSourceFiles(
					childUri,
					rootUri,
					childPath
				);

			results.push(...childFiles);
		} else if (
			fileType === vscode.FileType.File
		) {
			const ext = getExtension(name);

			if (SOURCE_EXTENSIONS.has(ext)) {
				const filePath = relativePath
					? `${relativePath}/${name}`
					: name;

				results.push(filePath);
			}
		}
	}

	return results;
}

// =====================
// Import parser
// =====================

/**
 * Deterministic line-by-line import parser.
 *
 * Supported patterns:
 *   import { X } from './path'
 *   import X from './path'
 *   import * as X from './path'
 *   import './path'
 *   export { X } from './path'
 *   export * from './path'
 *   const X = require('./path')
 *
 * Only extracts local relative imports (starting with . or ..).
 * Ignores package imports and node built-ins.
 */
async function parseFileImports(
	fileUri: vscode.Uri,
	sourceRelativePath: string,
	rootUri: vscode.Uri,
	knownFiles: string[]
): Promise<ImportEdge[]> {
	let content: string;

	try {
		const bytes =
			await vscode.workspace.fs.readFile(
				fileUri
			);

		content = Buffer.from(bytes).toString(
			'utf-8'
		);
	} catch {
		return [];
	}

	const edges: ImportEdge[] = [];
	const lines = content.split('\n');

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip empty lines, comments, and non-import lines
		if (
			!trimmed ||
			trimmed.startsWith('//') ||
			trimmed.startsWith('*') ||
			trimmed.startsWith('/*')
		) {
			continue;
		}

		const specifier =
			extractModuleSpecifier(trimmed);

		if (!specifier) {
			continue;
		}

		// Only process local relative imports
		if (
			!specifier.startsWith('./') &&
			!specifier.startsWith('../')
		) {
			continue;
		}

		// Resolve to repo-relative path
		const resolved = resolveImportPath(
			sourceRelativePath,
			specifier,
			knownFiles
		);

		if (resolved) {
			edges.push({
				source: sourceRelativePath,
				target: resolved,
			});
		}
	}

	return edges;
}

/**
 * Extract the module specifier string from an import/export/require line.
 * Returns null if the line is not an import statement.
 */
function extractModuleSpecifier(
	line: string
): string | null {
	// Pattern 1: import ... from '...' or "..."
	// Pattern 2: export ... from '...' or "..."
	if (
		line.startsWith('import') ||
		line.startsWith('export')
	) {
		const fromMatch = line.match(
			/\bfrom\s+['"]([^'"]+)['"]/
		);

		if (fromMatch) {
			return fromMatch[1];
		}

		// Pattern 3: import './path' (side-effect import)
		if (line.startsWith('import')) {
			const directMatch = line.match(
				/^import\s+['"]([^'"]+)['"]/
			);

			if (directMatch) {
				return directMatch[1];
			}
		}
	}

	// Pattern 4: const X = require('./path')
	if (line.includes('require(')) {
		const requireMatch = line.match(
			/require\(\s*['"]([^'"]+)['"]\s*\)/
		);

		if (requireMatch) {
			return requireMatch[1];
		}
	}

	return null;
}

// =====================
// Path resolution
// =====================

/**
 * Resolve a relative import specifier to a repo-relative file path.
 *
 * Handles extensionless imports by trying known extensions.
 * Handles directory imports by trying /index.ts, /index.js, etc.
 */
function resolveImportPath(
	sourceRelativePath: string,
	specifier: string,
	knownFiles: string[]
): string | null {
	// Build the set for O(1) lookup
	const fileSet = new Set(knownFiles);

	// Get the directory of the source file
	const sourceDir = getDirectory(
		sourceRelativePath
	);

	// Resolve the specifier relative to source directory
	const resolvedPath = normalizePath(
		sourceDir
			? `${sourceDir}/${specifier}`
			: specifier
	);

	// Try exact match first (specifier already has extension)
	if (fileSet.has(resolvedPath)) {
		return resolvedPath;
	}

	// Try appending known extensions
	for (const ext of RESOLVABLE_EXTENSIONS) {
		const withExt = `${resolvedPath}${ext}`;

		if (fileSet.has(withExt)) {
			return withExt;
		}
	}

	// Try as directory with index file
	for (const ext of RESOLVABLE_EXTENSIONS) {
		const indexPath = `${resolvedPath}/index${ext}`;

		if (fileSet.has(indexPath)) {
			return indexPath;
		}
	}

	return null;
}

/**
 * Normalize a path by resolving . and .. segments.
 */
function normalizePath(
	path: string
): string {
	const parts = path.split('/');
	const resolved: string[] = [];

	for (const part of parts) {
		if (part === '.' || part === '') {
			continue;
		}

		if (part === '..') {
			resolved.pop();
		} else {
			resolved.push(part);
		}
	}

	return resolved.join('/');
}

// =====================
// Utilities
// =====================

function getExtension(
	fileName: string
): string {
	const lastDot =
		fileName.lastIndexOf('.');

	if (lastDot === -1) {
		return '';
	}

	return fileName.slice(lastDot);
}

function getDirectory(
	filePath: string
): string {
	const lastSlash =
		filePath.lastIndexOf('/');

	if (lastSlash === -1) {
		return '';
	}

	return filePath.slice(0, lastSlash);
}

function emptyGraph(): ImportGraph {
	return {
		edges: [],
		files: [],
		nodeCount: 0,
		edgeCount: 0,
	};
}
