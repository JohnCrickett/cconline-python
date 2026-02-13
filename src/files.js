// Multi-file project state management

const DEFAULT_CODE = 'print("Hello, World!")';

let state = {
  files: [{ name: 'main.py', code: DEFAULT_CODE }],
  activeFile: 'main.py',
};

/** Initialize files state with default main.py */
export function initFiles() {
  state = {
    files: [{ name: 'main.py', code: DEFAULT_CODE }],
    activeFile: 'main.py',
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

/** Creates a new .py file */
export function addFile(name) {
  if (!name || !name.trim()) throw new Error('File name cannot be empty.');
  name = name.trim();
  if (!name.endsWith('.py')) throw new Error('File name must end in .py');
  if (state.files.some((f) => f.name === name)) {
    throw new Error(`File "${name}" already exists.`);
  }
  state.files.push({ name, code: '' });
}

/** Removes a file (cannot delete last file or main.py) */
export function deleteFile(name) {
  if (name === 'main.py') throw new Error('Cannot delete main.py');
  if (state.files.length <= 1) throw new Error('Cannot delete the last file.');
  state.files = state.files.filter((f) => f.name !== name);
  if (state.activeFile === name) {
    state.activeFile = state.files[0].name;
  }
}

/** Renames a file */
export function renameFile(oldName, newName) {
  if (!newName || !newName.trim()) throw new Error('New file name cannot be empty.');
  newName = newName.trim();
  if (!newName.endsWith('.py')) throw new Error('File name must end in .py');
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

