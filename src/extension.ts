import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { exec } from "child_process";
import * as vscode from "vscode";

interface LogItem {
  label: string;
  data: any;
}

export function activate(context: vscode.ExtensionContext) {
  const logProvider = new LogTreeProvider();
  vscode.window.registerTreeDataProvider("customLogs", logProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand("log-viewer.refresh", () => {
      logProvider.refresh();
      vscode.window.showInformationMessage("Log Viewer refreshed!");
    })
  );

  vscode.workspace.onDidSaveTextDocument((doc) => {
    logProvider.extractLogsFromFile(doc);
  });

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "log-viewer.generateLaunchJson",
      async () => {
        if (!vscode.workspace.workspaceFolders) {
          vscode.window.showErrorMessage("No workspace opened.");
          return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const vscodeDir = path.join(workspaceRoot, ".vscode");
        const launchPath = path.join(vscodeDir, "launch.json");

        if (!fs.existsSync(vscodeDir)) {
          fs.mkdirSync(vscodeDir);
        }

        const pkgPath = path.join(workspaceRoot, "package.json");
        let projectType: "frontend" | "backend" = "backend";

        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
            if (
              pkg.dependencies?.react ||
              pkg.dependencies?.next ||
              pkg.dependencies?.vue
            ) {
              projectType = "frontend";
            }
          } catch (err) {
            console.error("Error reading package.json:", err);
          }
        }

        const chromeConfig = {
          version: "0.2.0",
          configurations: [
            {
              type: "chrome",
              request: "launch",
              name: "Launch React App",
              url: "http://localhost:3000",
              webRoot: "${workspaceFolder}/src",
            },
          ],
        };

        const nodeConfig = {
          version: "0.2.0",
          configurations: [
            {
              type: "pwa-node",
              request: "launch",
              name: "Launch Node App",
              program: "${workspaceFolder}/server.js",
            },
          ],
        };

        const config = projectType === "frontend" ? chromeConfig : nodeConfig;
        fs.writeFileSync(launchPath, JSON.stringify(config, null, 2), "utf-8");

        vscode.window.showInformationMessage(
          `launch.json created for ${projectType} project!`
        );
      }
    )
  );
}

class LogTreeProvider implements vscode.TreeDataProvider<LogTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    LogTreeItem | undefined | void
  > = new vscode.EventEmitter<LogTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<LogTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private logs: Map<string, LogItem[]> = new Map();

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  extractLogsFromFile(doc: vscode.TextDocument) {
    const fileName = path.basename(doc.fileName);

    const runner = `
                  const origLog = console.log;
                  console.log = (...args) => {
                    const label = typeof args[0] === "string" ? args[0] : "Log";
                    const data =
                      args.length === 2 ? args[1] :
                      args.length > 1 ? args.slice(1) :
                      args[0];
                    process.stdout.write(JSON.stringify({ label, data }) + "\\n");
                  };
                  require("${doc.fileName.replace(/\\/g, "\\\\")}");
      `;

    const tempFile = path.join(os.tmpdir(), `log_runner_${Date.now()}.js`);
    fs.writeFileSync(tempFile, runner);

    exec(`node "${tempFile}"`, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr);
        return;
      }

      const logs: LogItem[] = [];

      stdout
        .trim()
        .split("\n")
        .forEach((line) => {
          try {
            const parsed = JSON.parse(line);
            logs.push({
              label: parsed.label,
              data: parsed.data,
            });
          } catch (e) {
            logs.push({
              label: "Unknown Log",
              data: line,
            });
          }
        });

      this.logs.set(fileName, logs);
      this.refresh();
    });
  }

  getTreeItem(element: LogTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: LogTreeItem): Thenable<LogTreeItem[]> {
    if (!element) {
      return Promise.resolve(
        Array.from(this.logs.entries()).map(
          ([file, fileLogs]) =>
            new LogTreeItem(
              file,
              vscode.TreeItemCollapsibleState.Collapsed,
              fileLogs
            )
        )
      );
    }

    if (
      Array.isArray(element.data) &&
      element.data.length &&
      element.data[0].label !== undefined
    ) {
      const logs = element.data as LogItem[];
      return Promise.resolve(
        logs.map(
          (log) =>
            new LogTreeItem(
              log.label,
              vscode.TreeItemCollapsibleState.Collapsed,
              log.data
            )
        )
      );
    }

    if (Array.isArray(element.data)) {
      return Promise.resolve(
        element.data.map((item, i) => {
          if (typeof item === "object" && item !== null) {
            return new LogTreeItem(
              `Item ${i + 1}`,
              vscode.TreeItemCollapsibleState.Collapsed,
              item
            );
          } else {
            return new LogTreeItem(
              `Item ${i + 1}: ${String(item)}`,
              vscode.TreeItemCollapsibleState.None,
              item
            );
          }
        })
      );
    }

    if (typeof element.data === "object" && element.data !== null) {
      return Promise.resolve(
        Object.entries(element.data).map(
          ([key, value]) =>
            new LogTreeItem(
              `${key}`,
              typeof value === "object"
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
              value
            )
        )
      );
    }

    return Promise.resolve([]);
  }
}

class LogTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly data?: any
  ) {
    super(label, collapsibleState);

    if (data !== undefined) {
      this.tooltip = JSON.stringify(data, null, 2);
      if (typeof data !== "object" || data === null) {
        this.description = String(data);
      }
    }
  }
}
