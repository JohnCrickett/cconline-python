// Multi-file project state management

const DEFAULT_CODE = 'print("Hello, World!")';
const DEFAULT_GO_CODE = 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}';
const DEFAULT_JS_CODE = 'console.log("Hello, World!")';
const DEFAULT_TS_CODE = 'const greeting: string = "Hello, World!";\nconsole.log(greeting);';
const DEFAULT_SQL_CODE = '-- Create a sample table\nCREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  email TEXT\n);\n\n-- Insert some data\nINSERT INTO users (name, email) VALUES (\'Alice\', \'alice@example.com\');\nINSERT INTO users (name, email) VALUES (\'Bob\', \'bob@example.com\');\n\n-- Query the data\nSELECT * FROM users;';

/** Get the main filename and extension for a language */
export function getLangConfig(language) {
  switch (language) {
    case 'go': return { mainFile: 'main.go', ext: '.go', defaultCode: DEFAULT_GO_CODE };
    case 'javascript': return { mainFile: 'main.js', ext: '.js', defaultCode: DEFAULT_JS_CODE };
    case 'typescript': return { mainFile: 'main.ts', ext: '.ts', defaultCode: DEFAULT_TS_CODE };
    case 'sql': return { mainFile: 'main.sql', ext: '.sql', defaultCode: DEFAULT_SQL_CODE };
    default: return { mainFile: 'main.py', ext: '.py', defaultCode: DEFAULT_CODE };
  }
}

let state = {
  files: [{ name: 'main.py', code: DEFAULT_CODE }],
  activeFile: 'main.py',
};

/** Initialize files state with default main file for the given language */
export function initFiles(language = 'python') {
  const config = getLangConfig(language);
  state = {
    files: [{ name: config.mainFile, code: config.defaultCode }],
    activeFile: config.mainFile,
  };
}

/** Returns all files array */
export function getFiles() {
  return state.files;
}

/** Returns active filename */
export function getActiveFile() {
  return state.activeFile;
}

/** Sets active file */
export function setActiveFile(name) {
  const file = state.files.find((f) => f.name === name);
  if (!file) throw new Error(`File "${name}" not found.`);
  state.activeFile = name;
}

/** Returns code for a file */
export function getFileCode(name) {
  const file = state.files.find((f) => f.name === name);
  if (!file) throw new Error(`File "${name}" not found.`);
  return file.code;
}

/** Updates code for a file */
export function setFileCode(name, code) {
  const file = state.files.find((f) => f.name === name);
  if (!file) throw new Error(`File "${name}" not found.`);
  file.code = code;
}

/** Creates a new file with the appropriate extension */
export function addFile(name, language = 'python') {
  if (!name || !name.trim()) throw new Error('File name cannot be empty.');
  name = name.trim();
  const { ext } = getLangConfig(language);
  if (!name.endsWith(ext)) throw new Error(`File name must end in ${ext}`);
  if (state.files.some((f) => f.name === name)) {
    throw new Error(`File "${name}" already exists.`);
  }
  state.files.push({ name, code: '' });
}

/** Removes a file (cannot delete last file or main files) */
export function deleteFile(name) {
  const mainFiles = ['main.py', 'main.go', 'main.js', 'main.ts', 'main.sql'];
  if (mainFiles.includes(name)) throw new Error(`Cannot delete ${name}`);
  if (state.files.length <= 1) throw new Error('Cannot delete the last file.');
  state.files = state.files.filter((f) => f.name !== name);
  if (state.activeFile === name) {
    state.activeFile = state.files[0].name;
  }
}

/** Renames a file */
export function renameFile(oldName, newName, language = 'python') {
  if (!newName || !newName.trim()) throw new Error('New file name cannot be empty.');
  newName = newName.trim();
  const { ext } = getLangConfig(language);
  if (!newName.endsWith(ext)) throw new Error(`File name must end in ${ext}`);
  if (state.files.some((f) => f.name === newName)) {
    throw new Error(`File "${newName}" already exists.`);
  }
  const file = state.files.find((f) => f.name === oldName);
  if (!file) throw new Error(`File "${oldName}" not found.`);
  file.name = newName;
  if (state.activeFile === oldName) {
    state.activeFile = newName;
  }
}

/** Returns [{name, code}] for all files (used by executor) */
export function getAllFilesForExecution() {
  return state.files.map((f) => ({ name: f.name, code: f.code }));
}

/** Loads files from a snippet (handles backward compat) */
export function loadFromSnippet(snippetData) {
  if (snippetData.files && Array.isArray(snippetData.files) && snippetData.files.length > 0) {
    state.files = snippetData.files.map((f) => ({ name: f.name, code: f.code }));
  } else if (snippetData.code) {
    state.files = [{ name: 'main.py', code: snippetData.code }];
  } else {
    state.files = [{ name: 'main.py', code: DEFAULT_CODE }];
  }
  state.activeFile = state.files[0].name;
}

/** Exports files array for saving */
export function exportForSnippet() {
  return state.files.map((f) => ({ name: f.name, code: f.code }));
}

