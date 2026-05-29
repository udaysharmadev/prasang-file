import * as vscode from 'vscode';
import type { AIProviderConfig } from '../types/prasangTypes';

// =====================
// Types
// =====================

export interface AIAdvisorResult {
	strengths: string[];
	weaknesses: string[];
	suggestions: string[];
	engineeringRisk: 'Low' | 'Medium' | 'High';
}

export interface AIAdvisorContext {
	repositoryName: string;
	language: string;
	repositoryType: string;
	architecture: string;
	frameworkName: string;
	dependencyCount: number;
	architecturalSignals: string[];
	highImpactFiles: {
		path: string;
		category: string;
	}[];
	blastRadiusRisks: {
		path: string;
		totalAffected: number;
	}[];
	healthStrengths: string[];
	healthRisks: string[];
}

// =====================
// Constants
// =====================

const GEMINI_ENDPOINT =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const REQUEST_TIMEOUT_MS = 10_000;

const FALLBACK_SECTION = `## AI Repository Advisor

> AI Repository Advisor unavailable.
> Add API key in settings (\`prasang.ai.apiKey\`) to enable advanced intelligence.
`;

// =====================
// Main export
// =====================

/**
 * Generate the AI Repository Advisor markdown section.
 *
 * Returns a fully-rendered markdown string — either the AI analysis
 * or the graceful fallback message.
 *
 * Never throws. All errors are caught and produce the fallback.
 */
export async function getAIAdvisorSection(
	config: AIProviderConfig,
	context: AIAdvisorContext
): Promise<string> {
	if (!config.enabled) {
		return '';
	}

	if (!config.apiKey) {
		return FALLBACK_SECTION;
	}

	try {
		const result =
			await callGeminiAdvisor(
				config.apiKey,
				context
			);

		return renderAIAdvisorSection(result);
	} catch {
		return FALLBACK_SECTION;
	}
}

/**
 * Read AI configuration from VS Code settings.
 * Returns a fully-typed config object.
 */
export function getAIConfig(): AIProviderConfig {
	const config =
		vscode.workspace.getConfiguration(
			'prasang.ai'
		);

	return {
		enabled:
			config.get<boolean>('enabled') ??
			false,
		provider:
			config.get<'gemini'>('provider') ??
			'gemini',
		apiKey:
			config.get<string>('apiKey') ?? '',
	};
}

// =====================
// Gemini API
// =====================

/**
 * Call the Gemini API with compressed repository context.
 *
 * Uses a structured prompt that requests JSON output
 * for reliable parsing. Enforces a hard timeout.
 */
async function callGeminiAdvisor(
	apiKey: string,
	context: AIAdvisorContext
): Promise<AIAdvisorResult> {
	const prompt = buildAdvisorPrompt(context);

	const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;

	const body = {
		contents: [
			{
				parts: [{ text: prompt }],
			},
		],
		generationConfig: {
			temperature: 0.3,
			maxOutputTokens: 512,
			responseMimeType:
				'application/json',
		},
	};

	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		REQUEST_TIMEOUT_MS
	);

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type':
					'application/json',
			},
			body: JSON.stringify(body),
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(
				`Gemini API error: ${response.status}`
			);
		}

		const data =
			(await response.json()) as GeminiResponse;

		return parseGeminiResponse(data);
	} finally {
		clearTimeout(timeout);
	}
}

// =====================
// Prompt construction
// =====================

/**
 * Build a token-optimized prompt from compressed context.
 *
 * Keeps total input under ~500 tokens by using
 * abbreviated labels and capped list lengths.
 */
function buildAdvisorPrompt(
	context: AIAdvisorContext
): string {
	const highImpact = context.highImpactFiles
		.slice(0, 5)
		.map(
			(f) =>
				`${f.path.split('/').pop()} (${f.category})`
		)
		.join(', ');

	const blastRisks = context.blastRadiusRisks
		.slice(0, 3)
		.map(
			(r) =>
				`${r.path.split('/').pop()} affects ${r.totalAffected} files`
		)
		.join(', ');

	const signals =
		context.architecturalSignals
			.slice(0, 5)
			.join(', ');

	const strengths =
		context.healthStrengths
			.slice(0, 5)
			.join(', ');

	const risks = context.healthRisks
		.slice(0, 5)
		.join(', ');

	return `You are a senior software architect. Analyze this repository and provide engineering feedback.

Repository: ${context.repositoryName}
Language: ${context.language}
Type: ${context.repositoryType}
Architecture: ${context.architecture}
Framework: ${context.frameworkName}
Dependencies: ${context.dependencyCount}
Signals: ${signals || 'none'}
High-impact files: ${highImpact || 'none'}
Blast radius risks: ${blastRisks || 'none'}
Current strengths: ${strengths || 'none'}
Current risks: ${risks || 'none'}

Respond with a JSON object containing exactly these fields:
- "strengths": array of 3-5 concise strength observations
- "weaknesses": array of 2-4 concise weakness observations  
- "suggestions": array of 2-4 actionable engineering suggestions (numbered)
- "engineeringRisk": one of "Low", "Medium", or "High"

Be specific to this repository. Reference actual file names and patterns from the context provided.`;
}

// =====================
// Response parsing
// =====================

interface GeminiResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{
				text?: string;
			}>;
		};
	}>;
}

interface GeminiParsedPayload {
	strengths?: unknown;
	weaknesses?: unknown;
	suggestions?: unknown;
	engineeringRisk?: unknown;
}

/**
 * Parse the Gemini API response into a typed AIAdvisorResult.
 *
 * Handles malformed responses by falling back to safe defaults
 * for each individual field.
 */
function parseGeminiResponse(
	response: GeminiResponse
): AIAdvisorResult {
	const text =
		response.candidates?.[0]?.content
			?.parts?.[0]?.text;

	if (!text) {
		throw new Error(
			'Empty response from Gemini'
		);
	}

	const parsed = JSON.parse(
		text
	) as GeminiParsedPayload;

	return {
		strengths: toStringArray(
			parsed.strengths,
			3
		),
		weaknesses: toStringArray(
			parsed.weaknesses,
			2
		),
		suggestions: toStringArray(
			parsed.suggestions,
			2
		),
		engineeringRisk: toRiskLevel(
			parsed.engineeringRisk
		),
	};
}

// =====================
// Rendering
// =====================

/**
 * Render the AI advisor result as a markdown section.
 */
function renderAIAdvisorSection(
	result: AIAdvisorResult
): string {
	const lines: string[] = [
		'## AI Repository Advisor',
		'',
	];

	if (result.strengths.length > 0) {
		lines.push('**Strengths**');
		lines.push('');
		for (const s of result.strengths) {
			lines.push(`- ${s}`);
		}
		lines.push('');
	}

	if (result.weaknesses.length > 0) {
		lines.push('**Weaknesses**');
		lines.push('');
		for (const w of result.weaknesses) {
			lines.push(`- ${w}`);
		}
		lines.push('');
	}

	if (result.suggestions.length > 0) {
		lines.push('**Suggestions**');
		lines.push('');
		for (let i = 0; i < result.suggestions.length; i++) {
			lines.push(
				`${i + 1}. ${result.suggestions[i]}`
			);
		}
		lines.push('');
	}

	lines.push(
		`**Engineering Risk:** ${result.engineeringRisk}`
	);
	lines.push('');

	return lines.join('\n');
}

// =====================
// Utilities
// =====================

/**
 * Safely coerce an unknown value to a string array.
 * Returns at least `minLength` empty strings if input is invalid.
 */
function toStringArray(
	value: unknown,
	minLength: number
): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const result = value
		.filter(
			(item): item is string =>
				typeof item === 'string' &&
				item.length > 0
		)
		.slice(0, 8);

	if (result.length < minLength) {
		return result;
	}

	return result;
}

/**
 * Safely coerce an unknown value to a valid risk level.
 */
function toRiskLevel(
	value: unknown
): 'Low' | 'Medium' | 'High' {
	if (typeof value !== 'string') {
		return 'Medium';
	}

	const normalized =
		value.charAt(0).toUpperCase() +
		value.slice(1).toLowerCase();

	if (
		normalized === 'Low' ||
		normalized === 'Medium' ||
		normalized === 'High'
	) {
		return normalized;
	}

	return 'Medium';
}
