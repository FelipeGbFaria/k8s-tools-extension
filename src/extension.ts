import * as vscode from 'vscode';
import { existsSync, lstatSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

// globals
const extensionName = 'k8s-tools';
const k8sToolName = 'k8s-tool.sh';

const execShell = (args: string[], cwd: string): Promise<{ success: boolean, error?: string }> =>
	new Promise(resolve => {
		const child = spawn(join(cwd, k8sToolName), args, { cwd });
		let error: string;
		
		child.stderr.on('data', (data) => {
			error = data;
		});

		child.on('close', (code) => {
			if (Number(code) !== 0) {
				resolve({ success: false, error })
			} else {
				resolve({ success: true });
			}
		});
	});

export function activate(context: vscode.ExtensionContext) {
	const sync = vscode.commands.registerCommand(`${extensionName}.syncPod`, async () => {
		const config = vscode.workspace.getConfiguration(extensionName);
		const k8sFolder: string|undefined = config.get("k8s-folder");
		const syncablePods: string[]|undefined = config.get("syncable-pods");

		if (!k8sFolder) {
			vscode.window.showErrorMessage(`${extensionName}.k8s-folder setting was not defined`);
			return;
		}

		if (!existsSync(k8sFolder) || !lstatSync(k8sFolder).isDirectory()) {
			vscode.window.showErrorMessage(`${extensionName}.k8s-folder setting is not a valid directory`);
			return;
		}

		if (!existsSync(join(k8sFolder, k8sToolName))) {
			vscode.window.showErrorMessage(`${k8sToolName} not found in ${extensionName}.k8s-folder setting directory`);
			return;
		}

		if (!syncablePods || syncablePods.length === 0) {
			vscode.window.showErrorMessage(`Please provide options in ${extensionName}.syncable-pods`);
			return;
		}

		const podName = await vscode.window.showQuickPick(syncablePods, { title: 'Select pod' });
		if (!podName) {
			return;
		}

		vscode.window.showInformationMessage(`Starting sync for ${podName}...`);

		const result = await execShell(['sync', podName], k8sFolder);
		if (result.success) {
			vscode.window.showInformationMessage(`Sync successfull for ${podName}`);
		} else {
			vscode.window.showErrorMessage(result.error!);
		}
	});

	const redeployAll = vscode.commands.registerCommand(`${extensionName}.redeployAll`, async () => {
		const config = vscode.workspace.getConfiguration(extensionName);
		const k8sFolder: string|undefined = config.get("k8s-folder");

		if (!k8sFolder) {
			vscode.window.showErrorMessage(`${extensionName}.k8s-folder setting was not defined`);
			return;
		}

		if (!existsSync(k8sFolder) || !lstatSync(k8sFolder).isDirectory()) {
			vscode.window.showErrorMessage(`${extensionName}.k8s-folder setting is not a valid directory`);
			return;
		}

		if (!existsSync(join(k8sFolder, k8sToolName))) {
			vscode.window.showErrorMessage(`${k8sToolName} not found in ${extensionName}.k8s-folder setting directory`);
			return;
		}

		vscode.window.showInformationMessage('Redeploying all components...');

		const result = await execShell(['redeploy', 'all'], k8sFolder);
		if (result.success) {
			vscode.window.showInformationMessage('Redeploy all successfull');
		} else {
			vscode.window.showErrorMessage(result.error!);
		}
	});

	context.subscriptions.push(sync, redeployAll);
}

export function deactivate() {}
