/**
 * Folder taxonomy — static dictionary mapping folder names to
 * purpose, role, confidence, and signal information.
 *
 * Expanded from 18 entries to 50+ covering common patterns
 * across frontend, backend, mobile, and infra repositories.
 */

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
	// =====================
	// Editor & Workspace
	// =====================

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

	'.idea': {
		purpose:
			'JetBrains IDE configuration',
		role: 'Workspace Configuration',
		confidenceBoost: 85,
		signals: ['jetbrains convention'],
	},

	// =====================
	// Source Roots
	// =====================

	src: {
		purpose:
			'Primary application source code',
		role: 'Application Root',
		confidenceBoost: 35,
		signals: [
			'source folder convention',
		],
	},

	lib: {
		purpose:
			'Shared library code',
		role: 'Library Layer',
		confidenceBoost: 40,
		signals: ['library convention'],
	},

	app: {
		purpose:
			'Application entry layer',
		role: 'Application Layer',
		confidenceBoost: 40,
		signals: [
			'application folder convention',
		],
	},

	// =====================
	// Architecture Layers
	// =====================

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

	services: {
		purpose:
			'Business logic services',
		role: 'Service Layer',
		confidenceBoost: 40,
		signals: [
			'service convention',
		],
	},

	controllers: {
		purpose:
			'Request handling controllers',
		role: 'Controller Layer',
		confidenceBoost: 45,
		signals: [
			'controller convention',
			'MVC pattern',
		],
	},

	models: {
		purpose:
			'Data model definitions',
		role: 'Model Layer',
		confidenceBoost: 40,
		signals: [
			'model convention',
			'data layer',
		],
	},

	entities: {
		purpose:
			'Domain entity definitions',
		role: 'Entity Layer',
		confidenceBoost: 45,
		signals: [
			'entity convention',
			'domain-driven design',
		],
	},

	domain: {
		purpose:
			'Domain logic layer',
		role: 'Domain Layer',
		confidenceBoost: 45,
		signals: [
			'domain convention',
			'clean architecture',
		],
	},

	infrastructure: {
		purpose:
			'Infrastructure implementations',
		role: 'Infrastructure Layer',
		confidenceBoost: 45,
		signals: [
			'infrastructure convention',
			'clean architecture',
		],
	},

	adapters: {
		purpose:
			'Port adapters / integration layer',
		role: 'Adapter Layer',
		confidenceBoost: 45,
		signals: [
			'adapter convention',
			'hexagonal architecture',
		],
	},

	ports: {
		purpose:
			'Interface ports for external systems',
		role: 'Port Layer',
		confidenceBoost: 45,
		signals: [
			'port convention',
			'hexagonal architecture',
		],
	},

	// =====================
	// API & Routing
	// =====================

	api: {
		purpose: 'API layer',
		role: 'API Layer',
		confidenceBoost: 45,
		signals: [
			'api convention',
		],
	},

	routes: {
		purpose:
			'Route definitions',
		role: 'Routing Layer',
		confidenceBoost: 45,
		signals: [
			'routing convention',
		],
	},

	middleware: {
		purpose:
			'Middleware processing layer',
		role: 'Middleware Layer',
		confidenceBoost: 45,
		signals: [
			'middleware convention',
		],
	},

	handlers: {
		purpose:
			'Request/event handlers',
		role: 'Handler Layer',
		confidenceBoost: 40,
		signals: [
			'handler convention',
		],
	},

	resolvers: {
		purpose:
			'GraphQL resolvers',
		role: 'Resolver Layer',
		confidenceBoost: 45,
		signals: [
			'resolver convention',
			'GraphQL pattern',
		],
	},

	graphql: {
		purpose:
			'GraphQL schema and operations',
		role: 'GraphQL Layer',
		confidenceBoost: 45,
		signals: [
			'GraphQL convention',
		],
	},

	// =====================
	// UI & Frontend
	// =====================

	components: {
		purpose: 'UI components',
		role: 'UI Layer',
		confidenceBoost: 45,
		signals: [
			'component convention',
		],
	},

	pages: {
		purpose:
			'Page-level components or routes',
		role: 'Page Layer',
		confidenceBoost: 45,
		signals: [
			'page convention',
		],
	},

	views: {
		purpose:
			'View layer components',
		role: 'View Layer',
		confidenceBoost: 40,
		signals: [
			'view convention',
			'MVC pattern',
		],
	},

	layouts: {
		purpose:
			'Layout wrapper components',
		role: 'Layout Layer',
		confidenceBoost: 40,
		signals: [
			'layout convention',
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

	composables: {
		purpose:
			'Vue composition functions',
		role: 'Composable Layer',
		confidenceBoost: 45,
		signals: [
			'composable convention',
			'Vue pattern',
		],
	},

	// =====================
	// State Management
	// =====================

	store: {
		purpose:
			'Application state management',
		role: 'State Layer',
		confidenceBoost: 45,
		signals: [
			'store convention',
			'state management',
		],
	},

	state: {
		purpose:
			'Application state management',
		role: 'State Layer',
		confidenceBoost: 40,
		signals: [
			'state convention',
		],
	},

	reducers: {
		purpose:
			'State reducers',
		role: 'State Layer',
		confidenceBoost: 45,
		signals: [
			'reducer convention',
			'Redux pattern',
		],
	},

	actions: {
		purpose:
			'State action definitions',
		role: 'State Layer',
		confidenceBoost: 40,
		signals: [
			'action convention',
		],
	},

	// =====================
	// Data & Database
	// =====================

	database: {
		purpose:
			'Database connection and setup',
		role: 'Data Layer',
		confidenceBoost: 45,
		signals: [
			'database convention',
		],
	},

	db: {
		purpose:
			'Database layer',
		role: 'Data Layer',
		confidenceBoost: 40,
		signals: [
			'database convention',
		],
	},

	migrations: {
		purpose:
			'Database migration scripts',
		role: 'Migration Layer',
		confidenceBoost: 50,
		signals: [
			'migration convention',
		],
	},

	schemas: {
		purpose:
			'Data schema definitions',
		role: 'Schema Layer',
		confidenceBoost: 45,
		signals: [
			'schema convention',
		],
	},

	repositories: {
		purpose:
			'Data access repositories',
		role: 'Repository Layer',
		confidenceBoost: 45,
		signals: [
			'repository convention',
			'repository pattern',
		],
	},

	// =====================
	// Shared & Utilities
	// =====================

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

	helpers: {
		purpose:
			'Helper functions',
		role: 'Utility Layer',
		confidenceBoost: 40,
		signals: [
			'helper convention',
		],
	},

	common: {
		purpose:
			'Shared common modules',
		role: 'Shared Layer',
		confidenceBoost: 35,
		signals: [
			'common convention',
		],
	},

	shared: {
		purpose:
			'Shared modules across features',
		role: 'Shared Layer',
		confidenceBoost: 35,
		signals: [
			'shared convention',
		],
	},

	constants: {
		purpose:
			'Application constants',
		role: 'Constants',
		confidenceBoost: 40,
		signals: [
			'constants convention',
		],
	},

	config: {
		purpose:
			'Application configuration',
		role: 'Configuration',
		confidenceBoost: 45,
		signals: [
			'configuration convention',
		],
	},

	// =====================
	// Features & Modules
	// =====================

	features: {
		purpose:
			'Feature modules',
		role: 'Feature Layer',
		confidenceBoost: 45,
		signals: [
			'feature-first convention',
		],
	},

	modules: {
		purpose:
			'Application modules',
		role: 'Module Layer',
		confidenceBoost: 40,
		signals: [
			'module convention',
		],
	},

	// =====================
	// Auth & Security
	// =====================

	auth: {
		purpose:
			'Authentication and authorization',
		role: 'Auth Layer',
		confidenceBoost: 45,
		signals: [
			'auth convention',
		],
	},

	guards: {
		purpose:
			'Route or access guards',
		role: 'Guard Layer',
		confidenceBoost: 45,
		signals: [
			'guard convention',
			'NestJS pattern',
		],
	},

	// =====================
	// Background Processing
	// =====================

	workers: {
		purpose:
			'Background worker processes',
		role: 'Worker Layer',
		confidenceBoost: 45,
		signals: [
			'worker convention',
		],
	},

	jobs: {
		purpose:
			'Background job definitions',
		role: 'Job Layer',
		confidenceBoost: 45,
		signals: [
			'job convention',
		],
	},

	queues: {
		purpose:
			'Message queue handlers',
		role: 'Queue Layer',
		confidenceBoost: 45,
		signals: [
			'queue convention',
		],
	},

	events: {
		purpose:
			'Event definitions and handlers',
		role: 'Event Layer',
		confidenceBoost: 40,
		signals: [
			'event convention',
		],
	},

	// =====================
	// Providers & DI
	// =====================

	providers: {
		purpose:
			'Dependency injection providers',
		role: 'Provider Layer',
		confidenceBoost: 40,
		signals: [
			'provider convention',
		],
	},

	context: {
		purpose:
			'React context providers',
		role: 'Context Layer',
		confidenceBoost: 40,
		signals: [
			'context convention',
			'React pattern',
		],
	},

	// =====================
	// Internationalization
	// =====================

	i18n: {
		purpose:
			'Internationalization support',
		role: 'i18n Layer',
		confidenceBoost: 50,
		signals: [
			'i18n convention',
		],
	},

	locales: {
		purpose:
			'Locale translation files',
		role: 'Localization',
		confidenceBoost: 45,
		signals: [
			'locale convention',
		],
	},

	translations: {
		purpose:
			'Translation files',
		role: 'Localization',
		confidenceBoost: 45,
		signals: [
			'translation convention',
		],
	},

	// =====================
	// Styling
	// =====================

	styles: {
		purpose:
			'Stylesheets and design tokens',
		role: 'Styling Layer',
		confidenceBoost: 40,
		signals: [
			'style convention',
		],
	},

	theme: {
		purpose:
			'Theme configuration',
		role: 'Theme Layer',
		confidenceBoost: 40,
		signals: [
			'theme convention',
		],
	},

	// =====================
	// Testing
	// =====================

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

	fixtures: {
		purpose:
			'Test fixture data',
		role: 'Test Data',
		confidenceBoost: 45,
		signals: [
			'fixture convention',
		],
	},

	'__mocks__': {
		purpose:
			'Test mock definitions',
		role: 'Test Mocks',
		confidenceBoost: 50,
		signals: [
			'mock convention',
		],
	},

	// =====================
	// Documentation & Assets
	// =====================

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

	static: {
		purpose:
			'Static files served directly',
		role: 'Static Assets',
		confidenceBoost: 40,
		signals: [
			'static asset convention',
		],
	},

	// =====================
	// Monorepo
	// =====================

	packages: {
		purpose:
			'Monorepo package directory',
		role: 'Monorepo Packages',
		confidenceBoost: 50,
		signals: [
			'monorepo convention',
		],
	},

	apps: {
		purpose:
			'Monorepo application directory',
		role: 'Monorepo Apps',
		confidenceBoost: 50,
		signals: [
			'monorepo convention',
		],
	},

	libs: {
		purpose:
			'Monorepo shared libraries',
		role: 'Monorepo Libraries',
		confidenceBoost: 45,
		signals: [
			'monorepo convention',
		],
	},

	// =====================
	// DevOps & CI
	// =====================

	'.github': {
		purpose:
			'GitHub configuration and workflows',
		role: 'CI/CD',
		confidenceBoost: 50,
		signals: [
			'GitHub convention',
		],
	},

	'.circleci': {
		purpose:
			'CircleCI configuration',
		role: 'CI/CD',
		confidenceBoost: 50,
		signals: [
			'CircleCI convention',
		],
	},

	deploy: {
		purpose:
			'Deployment configuration',
		role: 'Deployment',
		confidenceBoost: 40,
		signals: [
			'deployment convention',
		],
	},

	// =====================
	// Go-specific
	// =====================

	cmd: {
		purpose:
			'CLI command entrypoints',
		role: 'Command Entry',
		confidenceBoost: 45,
		signals: [
			'Go convention',
		],
	},

	pkg: {
		purpose:
			'Public library packages',
		role: 'Public API',
		confidenceBoost: 40,
		signals: [
			'Go convention',
		],
	},

	internal: {
		purpose:
			'Internal-only packages',
		role: 'Internal Layer',
		confidenceBoost: 45,
		signals: [
			'internal convention',
		],
	},
};

/**
 * Look up a folder name in the taxonomy.
 *
 * Case-insensitive matching: tries exact match first,
 * then lowercased match.
 */
export function getFolderTaxonomy(
	folderName: string
): FolderTaxonomyEntry | null {
	// Exact match first
	const exact =
		FOLDER_TAXONOMY[folderName];

	if (exact) {
		return exact;
	}

	// Case-insensitive fallback
	const lower = folderName.toLowerCase();

	if (
		lower !== folderName &&
		FOLDER_TAXONOMY[lower]
	) {
		return FOLDER_TAXONOMY[lower];
	}

	return null;
}