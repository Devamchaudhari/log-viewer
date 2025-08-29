# Log Viewer

A simple and interactive **Log Viewer for VSCode** that lets you see `console.log` outputs directly in the Explorer sidebar — neatly structured and expandable.

## ✨ Features

- Automatically captures `console.log` outputs when saving your file.
- Displays logs grouped by **file name**.
- Expands **objects** and **arrays** into a tree structure.
- Inline tooltips for raw values.
- Supports refreshing logs via command: **Log Viewer: Refresh**.

### Example

![Log Viewer Screenshot](images/log-viewer-screenshot.png)

---

## 🚀 Usage

1. Open any JavaScript/TypeScript file.
2. Save the file (`Ctrl+S` / `Cmd+S`).
3. Logs will appear in the **LOG VIEWER** section of the Explorer.
4. Expand objects/arrays to inspect deeply.

---

## ⚙️ Extension Settings

This extension contributes the following commands:

- `log-viewer.refresh`: Manually refresh log output.

---

## 🛠 Requirements

- Node.js installed (used to run files and capture logs).

---

## 📌 Known Issues

- Currently works best with `console.log`.
- Future support may include `console.error`, `console.warn`, etc.

---

## 📖 Release Notes

### 1.0.0

- Initial release with:
  - Auto log capture on file save.
  - Tree view for arrays/objects.
  - Manual refresh command.

---

## 💡 Contributing

Pull requests and suggestions are welcome!  
[Open an issue](https://github.com/Devamchaudhari/log-viewer) to report bugs or request features.

---

**Enjoy debugging with Log Viewer! 🎉**
