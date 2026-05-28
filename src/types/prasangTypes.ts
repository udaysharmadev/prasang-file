/**
 * Shared type definitions for the PRASANG repository intelligence engine.
 *
 * Only cross-module types live here. Module-internal types
 * remain in their source files for cohesion.
 */

// =====================
// Framework Intelligence
// =====================

/** Result of framework fingerprinting — one per detected framework */
export interface FrameworkFingerprint {
	name: string;
	category: FrameworkCategory;
	confidence: number;
	signals: string[];
	evidence: FrameworkEvidence[];
}

export type FrameworkCategory =
	| 'frontend'
	| 'backend'
	| 'mobile'
	| 'desktop'
	| 'infra';

export interface FrameworkEvidence {
	type: FrameworkSignalType;
	signal: string;
	weight: number;
}

export type FrameworkSignalType =
	| 'dependency'
	| 'devDependency'
	| 'configFile'
	| 'folder'
	| 'fileContent'
	| 'entryPoint';

// =====================
// Architecture Patterns
// =====================

/** Detected architecture pattern with confidence and signals */
export interface ArchitecturePattern {
	name: string;
	confidence: number;
	signals: string[];
}

// =====================
// Convention Intelligence
// =====================

/** A single detected naming or structural convention */
export interface DetectedConvention {
	category:
		| 'naming'
		| 'structure'
		| 'exports'
		| 'suffixes';
	pattern: string;
	occurrences: number;
	examples: string[];
}

/** Full convention analysis result */
export interface ConventionAnalysis {
	conventions: DetectedConvention[];
}

// =====================
// AI Reasoning (Optional)
// =====================

/** A single AI-derived insight — clearly labeled as AI-inferred */
export interface AIInsight {
	category:
		| 'hidden_pattern'
		| 'risk'
		| 'refactor_suggestion'
		| 'observation';
	insight: string;
	confidence: 'low' | 'medium' | 'high';
	basedOn: string[];
}

/** Configuration for the optional AI reasoning layer */
export interface AIReasoningConfig {
	enabled: boolean;
}

// =====================
// Shared Utility Types
// =====================

/** Parsed package.json data — read once, shared across analyzers */
export interface PackageJsonData {
	name?: string;
	description?: string;
	version?: string;
	main?: string;
	bin?: string | Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	scripts?: Record<string, string>;
	contributes?: {
		commands?: Array<{
			command: string;
			title: string;
			category?: string;
		}>;
	};
	workspaces?:
		| string[]
		| { packages: string[] };
	[key: string]: unknown;
}

// =====================
// Core Stack Intelligence
// =====================

export type StackLayerKind =
	| 'runtime'
	| 'language'
	| 'build'
	| 'validation'
	| 'testing'
	| 'packageManager';

/** A single detected layer in the project's technology stack */
export interface CoreStackLayer {
	layer: StackLayerKind;
	name: string;
	signals: string[];
}

// =====================
// Risk & Importance
// =====================

export type RiskLevel =
	| 'LOW'
	| 'MEDIUM'
	| 'HIGH'
	| 'CRITICAL';

export type ImportanceLevel =
	| 'LOW'
	| 'MEDIUM'
	| 'HIGH';
