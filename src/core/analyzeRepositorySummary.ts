export interface RepositorySummary {
	summary: string;
	criticalModules: string[];
	riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface SummaryInput {
	repositoryName: string;
	entryPoints: {
		path: string;
		role: string;
	}[];
	highImpactFiles: {
	path: string;
}[];
	architecturePattern?: {
		pattern: string;
		confidence: number;
	};
}

export function analyzeRepositorySummary(
	input: SummaryInput
): RepositorySummary {
	const runtimeEntry =
		input.entryPoints.find(
			(entry) =>
				entry.role
					.toLowerCase()
					.includes('runtime')
		);

	const commandEntry =
		input.entryPoints.find(
			(entry) =>
				entry.role
					.toLowerCase()
					.includes('command')
		);

	const orchestrationFile =
		input.highImpactFiles.find(
			(file) =>
				file.path.includes(
					'create'
				)
		);

	const criticalModules =
		input.highImpactFiles
			.slice(0, 3)
			.map((file) =>
				file.path
					.split('/')
					.pop()
			)
			.filter(Boolean) as string[];

	const riskLevel =
	orchestrationFile
		? 'HIGH'
		: 'MEDIUM';

	const architectureText =
		input.architecturePattern
			?.pattern
			? `${input.architecturePattern.pattern} architecture`
			: 'layered architecture';

	const summary = `${input.repositoryName} follows a ${architectureText} focused on repository intelligence and AI-optimized code understanding.

Execution begins in:
${runtimeEntry ? `- ${runtimeEntry.path}` : '- Unknown runtime entry'}

Command orchestration delegates to:
${commandEntry ? `- ${commandEntry.path}` : '- Unknown command entry'}

Repository synthesis is centralized in:
${orchestrationFile ? `- ${orchestrationFile.path}` : '- Unknown orchestration module'}

Major responsibilities include:
- dependency intelligence
- folder intelligence
- architecture detection
- blast radius analysis

Critical modules:
${criticalModules.length
	? criticalModules
			.map(
				(module) =>
					`- ${module}`
			)
			.join('\n')
	: '- None detected'}

Risk concentration:
${riskLevel} due to orchestration dependency centrality.`;

	return {
		summary,
		criticalModules,
		riskLevel,
	};
}