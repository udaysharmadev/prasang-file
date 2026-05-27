/**
 * Shared file utilities for the PRASANG intelligence engine.
 *
 * Eliminates duplicated workspace/file operations across analyzers.
 */

import * as vscode from 'vscode';
import type { PackageJsonData } from '../types/prasangTypes';

// =====================
// Workspace access
// =====================

/**
 * Get the root URI of the first workspace folder.
 * Returns null if no workspace is open.
 */
export function getWorkspaceRoot(): vscode.Uri | null {
	const folders =
		vscode.workspace.workspaceFolders;

	if (!folders || folders.length === 0) {
		return null;
	}

	return folders[0].uri;
}

// =====================
// File operations
// =====================

/**
 * Read a file from the workspace as UTF-8 text.
 * Returns null if the file does not exist or cannot be read.
 */
export async function readWorkspaceFile(
	relativePath: string
): Promise<string | null> {
	const root = getWorkspaceRoot();

	if (!root) {
		return null;
	}

	try {
		const uri = vscode.Uri.joinPath(
			root,
			relativePath
		);

		const bytes =
			await vscode.workspace.fs.readFile(
				uri
			);

		return Buffer.from(bytes).toString(
			'utf-8'
		);
	} catch {
		return null;
	}
}

/**
 * Check whether a file exists in the workspace.
 */
export async function fileExistsInWorkspace(
	relativePath: string
): Promise<boolean> {
	const root = getWorkspaceRoot();

	if (!root) {
		return false;
	}

	try {
		const uri = vscode.Uri.joinPath(
			root,
			relativePath
		);

		await vscode.workspace.fs.stat(uri);
		return true;
	} catch {
		return false;
	}
}

/**
 * Parse a JSON file from the workspace.
 * Returns null if the file does not exist or cannot be parsed.
 */
export async function readJsonFile<T>(
	relativePath: string
): Promise<T | null> {
	const content =
		await readWorkspaceFile(relativePath);

	if (content === null) {
		return null;
	}

	try {
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Read and parse package.json from the workspace root.
 * Cached per call — callers should store the result.
 */
export async function readPackageJson(): Promise<PackageJsonData | null> {
	return readJsonFile<PackageJsonData>(
		'package.json'
	);
}

/**
 * List directory entries at a workspace-relative path.
 * Returns empty array if the directory does not exist.
 */
export async function listDirectoryEntries(
	dirUri: vscode.Uri
): Promise<[string, vscode.FileType][]> {
	try {
		return await vscode.workspace.fs.readDirectory(
			dirUri
		);
	} catch {
		return [];
	}
}

/**
 * Read file content at an absolute URI.
 * Returns null on any error.
 */
export async function readFileContent(
	uri: vscode.Uri
): Promise<string | null> {
	try {
		const bytes =
			await vscode.workspace.fs.readFile(
				uri
			);

		return Buffer.from(bytes).toString(
			'utf-8'
		);
	} catch {
		return null;
	}
}
