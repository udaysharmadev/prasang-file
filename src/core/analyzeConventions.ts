import type {
	DetectedConvention,
	ConventionAnalysis,
} from '../types/prasangTypes';

// =====================
// Casing classifiers
// =====================

/** kebab-case: `my-component` */
const KEBAB_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;

/** camelCase: `myComponent` (must contain >= 1 uppercase) */
const CAMEL_RE = /^[a-z][a-zA-Z0-9]*$/;

/** PascalCase: `MyComponent` */
const PASCAL_RE = /^[A-Z][a-zA-Z0-9]*$/;

/** snake_case: `my_component` */
const SNAKE_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

/** Flat lowercase: single word, no separators */
const FLAT_RE = /^[a-z][a-z0-9]*$/;

type CasingKind =
	| 'kebab-case'
	| 'camelCase'
	| 'PascalCase'
	| 'snake_case'
	| 'flat lowercase'
	| 'unknown';

/**
 * Classify a single basename (no extension, no dots) into its casing style.
 *
 * Order matters: kebab/snake must be checked before camel/flat
 * because camel and flat regexes would match single-segment
 * kebab/snake names as well.
 */
function classifyCasing(name: string): CasingKind {
	if (KEBAB_RE.test(name)) {
		return 'kebab-case';
	}
	if (SNAKE_RE.test(name)) {
		return 'snake_case';
	}
	if (PASCAL_RE.test(name)) {
		return 'PascalCase';
	}
	// camelCase must contain at least one uppercase letter
	if (CAMEL_RE.test(name) && /[A-Z]/.test(name)) {
		return 'camelCase';
	}
	if (FLAT_RE.test(name)) {
		return 'flat lowercase';
	}
	return 'unknown';
}

// =====================
// Suffix patterns
// =====================

/**
 * Recognised file suffix conventions.
 * Each entry is the compound extension we look for at the end of a filename.
 */
const KNOWN_SUFFIXES: string[] = [
	'.controller.ts',
	'.service.ts',
	'.module.ts',
	'.spec.ts',
	'.test.ts',
	'.dto.ts',
	'.entity.ts',
	'.guard.ts',
	'.pipe.ts',
	'.resolver.ts',
	'.middleware.ts',
	'.util.ts',
	'.helper.ts',
	'.config.ts',
	'.constant.ts',
	'.type.ts',
	'.interface.ts',
	'.enum.ts',
	'.model.ts',
	'.schema.ts',
	'.route.ts',
	'.handler.ts',
	'.factory.ts',
	'.provider.ts',
	'.adapter.ts',
	'.mapper.ts',
	'.transformer.ts',
	'.validator.ts',
	'.decorator.ts',
	'.interceptor.ts',
	'.filter.ts',
	'.strategy.ts',
	'.repository.ts',
	'.component.tsx',
	'.page.tsx',
	'.layout.tsx',
	'.hook.ts',
	'.story.tsx',
	'.stories.tsx',
];

// =====================
// Prefix patterns
// =====================

/**
 * Common verb prefixes used in function/file naming.
 * We look for basenames starting with these (case-insensitive).
 */
const KNOWN_PREFIXES: string[] = [
	'analyze',
	'create',
	'use',
	'get',
	'is',
	'handle',
	'render',
	'format',
	'parse',
	'validate',
];

// =====================
// Helpers
// =====================

/** Extract the basename without extension from a full path. */
function extractBasename(filePath: string): string {
	// Get the filename part (after last / or \)
	const fileName = filePath.replace(
		/^.*[/\\]/,
		''
	);

	// Remove the first extension (e.g. `.ts`, `.tsx`, `.js`)
	const dotIndex = fileName.indexOf('.');
	if (dotIndex === -1) {
		return fileName;
	}
	return fileName.slice(0, dotIndex);
}

/** Extract the full filename (after last separator) from a path. */
function extractFileName(filePath: string): string {
	return filePath.replace(/^.*[/\\]/, '');
}

/** Get the directory portion of a file path. */
function extractDir(filePath: string): string {
	const lastSep = Math.max(
		filePath.lastIndexOf('/'),
		filePath.lastIndexOf('\\')
	);
	if (lastSep === -1) {
		return '';
	}
	return filePath.slice(0, lastSep);
}

/**
 * Check whether a basename contains a dot (compound name like `vite.config`).
 * These are skipped for casing analysis because they are multi-part names.
 */
function isCompoundBasename(
	basename: string
): boolean {
	return basename.includes('.');
}

// =====================
// Test-file detection
// =====================

const TEST_PATTERNS = ['.test.', '.spec.'];
const TEST_DIRS = new Set([
	'test',
	'tests',
	'__tests__',
]);

function isTestFile(filePath: string): boolean {
	const fileName = extractFileName(filePath);
	return TEST_PATTERNS.some((p) =>
		fileName.includes(p)
	);
}

// =====================
// Index-file detection
// =====================

function isIndexFile(filePath: string): boolean {
	const fileName = extractFileName(
		filePath
	).toLowerCase();
	return (
		fileName === 'index.ts' ||
		fileName === 'index.js' ||
		fileName === 'index.tsx' ||
		fileName === 'index.jsx' ||
		fileName === 'index.mts' ||
		fileName === 'index.mjs'
	);
}

// =====================
// Main export
// =====================

/**
 * Analyze repository conventions from the list of source files.
 * Pure function — no I/O, fully deterministic.
 */
export function analyzeConventions(
	files: string[]
): ConventionAnalysis {
	const conventions: DetectedConvention[] = [];

	detectNamingConventions(files, conventions);
	detectSuffixConventions(files, conventions);
	detectStructuralConventions(
		files,
		conventions
	);
	detectExportConventions(files, conventions);

	return { conventions };
}

// =====================
// Naming conventions
// =====================

function detectNamingConventions(
	files: string[],
	out: DetectedConvention[]
): void {
	// Build list of classifiable basenames
	const basenames: string[] = [];
	for (const file of files) {
		const base = extractBasename(file);
		if (base && !isCompoundBasename(base)) {
			basenames.push(base);
		}
	}

	if (basenames.length === 0) {
		return;
	}

	// Tally each casing kind
	const counts = new Map<CasingKind, string[]>();
	for (const base of basenames) {
		const kind = classifyCasing(base);
		if (kind === 'unknown') {
			continue;
		}
		let list = counts.get(kind);
		if (!list) {
			list = [];
			counts.set(kind, list);
		}
		list.push(base);
	}

	// Report dominant casing (>= 50% of classifiable files)
	const classifiable = basenames.filter(
		(b) => classifyCasing(b) !== 'unknown'
	).length;

	if (classifiable > 0) {
		// Sort keys deterministically for stable output
		const sortedKinds = [...counts.entries()].sort(
			(a, b) => b[1].length - a[1].length
		);

		for (const [kind, examples] of sortedKinds) {
			const ratio =
				examples.length / classifiable;
			if (ratio >= 0.5) {
				out.push({
					category: 'naming',
					pattern: kind,
					occurrences: examples.length,
					examples: examples
						.slice(0, 3)
						.sort(),
				});
				// Only report the single dominant casing
				break;
			}
		}
	}

	// Detect prefix patterns
	detectPrefixPatterns(basenames, out);
}

function detectPrefixPatterns(
	basenames: string[],
	out: DetectedConvention[]
): void {
	for (const prefix of KNOWN_PREFIXES) {
		const lowerPrefix = prefix.toLowerCase();
		const matching = basenames.filter((b) =>
			b.toLowerCase().startsWith(lowerPrefix)
		);

		if (matching.length >= 3) {
			out.push({
				category: 'naming',
				pattern: `${prefix}* prefix`,
				occurrences: matching.length,
				examples: matching
					.slice(0, 3)
					.sort(),
			});
		}
	}
}

// =====================
// Suffix conventions
// =====================

function detectSuffixConventions(
	files: string[],
	out: DetectedConvention[]
): void {
	for (const suffix of KNOWN_SUFFIXES) {
		const matching: string[] = [];

		for (const file of files) {
			const fileName = extractFileName(file);
			if (
				fileName
					.toLowerCase()
					.endsWith(suffix)
			) {
				matching.push(
					extractBasename(file)
				);
			}
		}

		if (matching.length >= 2) {
			out.push({
				category: 'suffixes',
				pattern: suffix,
				occurrences: matching.length,
				examples: matching
					.slice(0, 3)
					.sort(),
			});
		}
	}
}

// =====================
// Structural conventions
// =====================

function detectStructuralConventions(
	files: string[],
	out: DetectedConvention[]
): void {
	const testFiles = files.filter(isTestFile);

	if (testFiles.length === 0) {
		return;
	}

	// Determine colocation: a test file is "colocated" when its
	// directory does NOT match a known test-only directory name.
	let colocatedCount = 0;
	let separatedCount = 0;

	for (const testFile of testFiles) {
		const dir = extractDir(testFile);
		// Get the last segment of the directory path
		const dirName = dir
			.replace(/^.*[/\\]/, '')
			.toLowerCase();

		if (TEST_DIRS.has(dirName)) {
			separatedCount++;
		} else {
			colocatedCount++;
		}
	}

	if (colocatedCount >= separatedCount) {
		out.push({
			category: 'structure',
			pattern: 'colocated tests',
			occurrences: colocatedCount,
			examples: testFiles
				.filter((f) => {
					const dir = extractDir(f);
					const dirName = dir
						.replace(/^.*[/\\]/, '')
						.toLowerCase();
					return !TEST_DIRS.has(dirName);
				})
				.map(extractFileName)
				.slice(0, 3)
				.sort(),
		});
	} else {
		out.push({
			category: 'structure',
			pattern: 'separated tests',
			occurrences: separatedCount,
			examples: testFiles
				.filter((f) => {
					const dir = extractDir(f);
					const dirName = dir
						.replace(/^.*[/\\]/, '')
						.toLowerCase();
					return TEST_DIRS.has(dirName);
				})
				.map(extractFileName)
				.slice(0, 3)
				.sort(),
		});
	}
}

// =====================
// Export conventions
// =====================

function detectExportConventions(
	files: string[],
	out: DetectedConvention[]
): void {
	const indexFiles = files.filter(isIndexFile);

	if (indexFiles.length >= 2) {
		out.push({
			category: 'exports',
			pattern:
				'barrel exports (index files)',
			occurrences: indexFiles.length,
			examples: indexFiles
				.map((f) => {
					const dir = extractDir(f);
					// Show the parent directory for context
					return dir
						? `${dir.replace(/^.*[/\\]/, '')}/index`
						: 'index';
				})
				.slice(0, 3)
				.sort(),
		});
	}
}
