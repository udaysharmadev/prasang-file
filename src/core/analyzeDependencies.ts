import * as vscode from 'vscode';

export interface DependencyAnalysis {
	coreStack: string[];
	tooling: string[];
	architecturalSignals: string[];
}

export async function analyzeDependencies(): Promise<DependencyAnalysis | null> {
	const workspaceFolders =
		vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		return null;
	}

	try {
		const rootUri =
			workspaceFolders[0].uri;

		const packageJsonUri =
			vscode.Uri.joinPath(
				rootUri,
				'package.json'
			);

		const fileBytes =
			await vscode.workspace.fs.readFile(
				packageJsonUri
			);

		const packageJson =
			JSON.parse(
				Buffer.from(
					fileBytes
				).toString('utf-8')
			);

		const dependencies =
			Object.keys(
				packageJson.dependencies ??
					{}
			);

		const devDependencies =
			Object.keys(
				packageJson.devDependencies ??
					{}
			);

		const allDependencies = [
			...dependencies,
			...devDependencies,
		];

		const coreStack: string[] = [];
		const tooling: string[] = [];
		const architecturalSignals: string[] =
			[];

		// Core stack
		if (
			allDependencies.includes(
				'typescript'
			)
		) {
			coreStack.push(
				'TypeScript'
			);

			architecturalSignals.push(
				'TypeScript-first repository'
			);
		}

		if (
			allDependencies.includes(
				'esbuild'
			)
		) {
			coreStack.push(
				'esbuild'
			);

			architecturalSignals.push(
				'Bundled build pipeline'
			);
		}

		if (
			allDependencies.includes(
				'@types/vscode'
			)
		) {
			coreStack.push(
				'VS Code API'
			);

			architecturalSignals.push(
				'VS Code Extension Runtime'
			);
		}

		// Tooling
		if (
			allDependencies.some(
				(dep) =>
					dep.includes(
						'eslint'
					)
			)
		) {
			tooling.push(
				'ESLint'
			);
		}

		if (
			allDependencies.some(
				(dep) =>
					dep.includes(
						'@vscode/test'
					)
			)
		) {
			tooling.push(
				'VS Code Testing'
			);
		}

		return {
			coreStack,
			tooling,
			architecturalSignals,
		};
	} catch {
		return null;
	}
}