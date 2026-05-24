export interface FolderTaxonomyEntry {
	purpose: string;
	role?: string;
	confidenceBoost: number;
	signals: string[];
}

export const FOLDER_TAXONOMY: Record<
	string,
	FolderTaxonomyEntry
> = {
	'.vscode': {
		purpose:
			'VS Code workspace configuration',
		role: 'Workspace Configuration',
		confidenceBoost: 90,
		signals: [
			'vscode convention',
			'editor configuration',
		],
	},

	src: {
		purpose:
			'Primary application source code',
		role: 'Application Root',
		confidenceBoost: 35,
		signals: [
			'source folder convention',
		],
	},

	commands: {
		purpose:
			'Command orchestration layer',
		role: 'Command Layer',
		confidenceBoost: 50,
		signals: [
			'command convention',
		],
	},

	core: {
		purpose:
			'Core application logic',
		role: 'Analysis Engine',
		confidenceBoost: 40,
		signals: [
			'core logic convention',
		],
	},

	intelligence: {
		purpose:
			'Repository intelligence layer',
		role: 'Intelligence Layer',
		confidenceBoost: 45,
		signals: [
			'intelligence convention',
		],
	},

	generation: {
		purpose:
			'Content generation layer',
		role: 'Generation Layer',
		confidenceBoost: 40,
		signals: [
			'generation convention',
		],
	},

	test: {
		purpose:
			'Testing infrastructure',
		role: 'Testing',
		confidenceBoost: 50,
		signals: [
			'testing convention',
		],
	},

	tests: {
		purpose:
			'Testing infrastructure',
		role: 'Testing',
		confidenceBoost: 50,
		signals: [
			'testing convention',
		],
	},

	'__tests__': {
		purpose:
			'Testing infrastructure',
		role: 'Testing',
		confidenceBoost: 55,
		signals: [
			'testing convention',
		],
	},

	types: {
		purpose:
			'Shared type definitions',
		role: 'Shared Contracts',
		confidenceBoost: 45,
		signals: [
			'typescript convention',
		],
	},

	utils: {
		purpose:
			'Shared helper utilities',
		role: 'Utility Layer',
		confidenceBoost: 40,
		signals: [
			'utility convention',
		],
	},

	services: {
		purpose:
			'Business logic services',
		role: 'Service Layer',
		confidenceBoost: 40,
		signals: [
			'service convention',
		],
	},

	api: {
		purpose: 'API layer',
		role: 'API Layer',
		confidenceBoost: 45,
		signals: [
			'api convention',
		],
	},

	components: {
		purpose: 'UI components',
		role: 'UI Layer',
		confidenceBoost: 45,
		signals: [
			'component convention',
		],
	},

	hooks: {
		purpose:
			'Reusable application hooks',
		role: 'Hook Layer',
		confidenceBoost: 45,
		signals: [
			'hook convention',
		],
	},

	docs: {
		purpose:
			'Project documentation',
		role: 'Documentation',
		confidenceBoost: 45,
		signals: [
			'documentation convention',
		],
	},

	scripts: {
		purpose:
			'Automation scripts',
		role: 'Automation',
		confidenceBoost: 45,
		signals: [
			'script convention',
		],
	},

	assets: {
		purpose:
			'Static project assets',
		role: 'Asset Layer',
		confidenceBoost: 40,
		signals: [
			'asset convention',
		],
	},

	public: {
		purpose:
			'Public static assets',
		role: 'Public Assets',
		confidenceBoost: 45,
		signals: [
			'public asset convention',
		],
	},
};

export function getFolderTaxonomy(
	folderName: string
): FolderTaxonomyEntry | null {
	return (
		FOLDER_TAXONOMY[
			folderName
		] ?? null
	);
}