import * as vscode from 'vscode';

export interface RepositoryIdentity {
	name: string;
	language: string;
	packageManager: string;
	framework: string;
	repositoryType: string;
	criticalFiles: string[];
}

export async function analyzeRepository(): Promise<RepositoryIdentity | null> {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		return null;
	}

	const rootPath = workspaceFolders[0].uri;

	const files = await vscode.workspace.fs.readDirectory(rootPath);

	const fileNames = files.map(([name]) => name);

	let language = 'Unknown';
	let packageManager = 'Unknown';
	let framework = 'Unknown';
	let repositoryType = 'Unknown';

	let packageJson: any = null;

	if (fileNames.includes('package.json')) {
		const packageUri = vscode.Uri.joinPath(
			rootPath,
			'package.json'
		);

		const packageContent =
			await vscode.workspace.fs.readFile(packageUri);

		packageJson = JSON.parse(
			Buffer.from(packageContent).toString('utf8')
		);
	}

	if (fileNames.includes('tsconfig.json')) {
		language = 'TypeScript';
	}

	if (fileNames.includes('package-lock.json')) {
		packageManager = 'npm';
	}

	if (
		fileNames.includes('.vscode') &&
		fileNames.includes('package.json')
	) {
		repositoryType = 'VS Code Extension';
	}

	const dependencies = {
		...packageJson?.dependencies,
		...packageJson?.devDependencies
	};

	if (dependencies) {
	const dependencyNames = Object.keys(dependencies);

	if (dependencyNames.includes('next')) {
		framework = 'Next.js';
	}

	if (
		dependencyNames.includes('react') &&
		dependencyNames.includes('vite')
	) {
		framework = 'React + Vite';
	}

	if (dependencyNames.includes('express')) {
		framework = 'Express';
	}

	if (
		dependencyNames.includes('vscode') ||
		dependencyNames.includes('@types/vscode')
	) {
		framework = 'VS Code Extension';
	}
}

	const criticalFiles = fileNames.filter((file) =>
		[
			'package.json',
			'tsconfig.json',
			'README.md',
			'next.config.js',
			'vite.config.ts',
			'docker-compose.yml'
		].includes(file)
	);

	return {
		name: workspaceFolders[0].name,
		language,
		packageManager,
		framework,
		repositoryType,
		criticalFiles
	};
}