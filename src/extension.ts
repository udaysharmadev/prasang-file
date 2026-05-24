import * as vscode from 'vscode';
import { generatePrasangCommand } from './commands/generatePrasangCommand';

export function activate(context: vscode.ExtensionContext) {
	console.log('Prasang File activated');

	const disposable = vscode.commands.registerCommand(
		'prasang-file.generatePrasang',
		generatePrasangCommand
	);

	context.subscriptions.push(disposable);
}

export function deactivate() {}