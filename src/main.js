import './style.css';
import { initWorker, runCode, stopExecution, onStatus, retryLoad } from './executor.js';
import { initGoWorker, runGoCode, stopGoExecution, onGoStatus, retryGoLoad } from './go-executor.js';
import { initJsWorker, runJsCode, stopJsExecution, onJsStatus, retryJsLoad } from './js-executor.js';
import { initTsWorker, runTsCode, stopTsExecution, onTsStatus, retryTsLoad } from './ts-executor.js';
import { initSqlWorker, runSqlCode, stopSqlExecution, onSqlStatus, retrySqlLoad } from './sql-executor.js';
import { initEditor, getCode, setCode, setEditorTheme, setEditorLanguage } from './editor.js';
import { saveSnippet, loadSnippets, deleteSnippet } from './snippets.js';
import { initTheme, toggleTheme, getTheme } from './theme.js';
import {
  initFiles, getFiles, getActiveFile, setActiveFile,
  getFileCode, setFileCode, addFile, deleteFile,
  getAllFilesForExecution, loadFromSnippet, exportForSnippet, getLangConfig
} from './files.js';

const runBtn = document.getElementById('run-btn');
const stopBtn = document.getElementById('stop-btn');
const output = document.getElementById('output');
const executionDuration = document.getElementById('execution-duration');
const languageSelect = document.getElementById('language-select');

let currentLanguage = 'python';
let goWorkerInitialized = false;
let jsWorkerInitialized = false;
let tsWorkerInitialized = false;
let sqlWorkerInitialized = false;

// ── WebAssembly detection ──────────────────────────────────────────
if (typeof WebAssembly !== 'object') {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header><h1>Code Playground</h1></header>
    <div class="wasm-unsupported">
      <h2>⚠ WebAssembly Not Supported</h2>
      <p>Your browser doesn't support WebAssembly. Please upgrade to a modern browser
      (Chrome 57+, Firefox 52+, Safari 11+, Edge 16+).</p>
    </div>
  `;
  // Stop execution of the rest of the module
  throw new Error('WebAssembly not supported');
}

// Initialize the Pyodide worker
initWorker();

// Listen for Pyodide loading status
let pyodideLoaded = false;

onStatus((status) => {
  if (status.type === 'loading') {
    output.innerHTML = '<span class="spinner"></span> ' + status.message;
    output.classList.remove('error', 'timeout-error');
    runBtn.disabled = true;
  } else if (status.type === 'ready') {
    pyodideLoaded = true;
    output.textContent = 'Python runtime ready.';
    output.classList.remove('error', 'timeout-error');
    runBtn.disabled = false;
  } else if (status.type === 'load-error') {
    pyodideLoaded = false;
    output.innerHTML = '';
    output.classList.add('error');
    output.classList.remove('timeout-error');

    const msgEl = document.createElement('div');
    msgEl.textContent = 'Failed to load Python runtime. Check your internet connection.';
    output.appendChild(msgEl);

    if (status.error) {
      const detailEl = document.createElement('div');
      detailEl.className = 'error-detail';
      detailEl.textContent = status.error;
      output.appendChild(detailEl);
    }

    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', () => {
      retryLoad();
    });
    output.appendChild(retryBtn);

    runBtn.disabled = true;
  } else if (status.type === 'package-loading') {
    output.innerHTML = '<span class="spinner"></span> 📦 Loading packages: ' + status.packages.join(', ') + '…';
    output.classList.remove('error', 'timeout-error');
  } else if (status.type === 'packages-loaded') {
    output.innerHTML = '<span class="spinner"></span> Running…';
    output.classList.remove('error', 'timeout-error');
  }
});

onGoStatus((status) => {
  if (status.type === 'loading') {
    output.innerHTML = '<span class="spinner"></span> ' + status.message;
    output.classList.remove('error', 'timeout-error');
    runBtn.disabled = true;
  } else if (status.type === 'ready') {
    output.textContent = 'Go runtime ready.';
    output.classList.remove('error', 'timeout-error');
    runBtn.disabled = false;
  } else if (status.type === 'load-error') {
    output.innerHTML = '';
    output.classList.add('error');
    output.classList.remove('timeout-error');

    const msgEl = document.createElement('div');
    msgEl.textContent = 'Failed to load Go runtime. Check your internet connection.';
    output.appendChild(msgEl);

    if (status.error) {
      const detailEl = document.createElement('div');
      detailEl.className = 'error-detail';
      detailEl.textContent = status.error;
      output.appendChild(detailEl);
    }

    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', () => {
      retryGoLoad();
    });
    output.appendChild(retryBtn);

    runBtn.disabled = true;
  }
});

onJsStatus((status) => {
  if (status.type === 'ready') {
    output.textContent = 'JavaScript ready.';
    output.classList.remove('error', 'timeout-error');
    runBtn.disabled = false;
  } else if (status.type === 'load-error') {
    output.innerHTML = '';
    output.classList.add('error');
    output.classList.remove('timeout-error');
    const msgEl = document.createElement('div');
    msgEl.textContent = 'Failed to initialize JavaScript worker.';
    output.appendChild(msgEl);
    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', () => { retryJsLoad(); });
    output.appendChild(retryBtn);
    runBtn.disabled = true;
  }
});

onTsStatus((status) => {
  if (status.type === 'loading') {
    output.innerHTML = '<span class="spinner"></span> ' + status.message;
    output.classList.remove('error', 'timeout-error');
    runBtn.disabled = true;
  } else if (status.type === 'ready') {
    output.textContent = 'TypeScript compiler ready.';
    output.classList.remove('error', 'timeout-error');
    runBtn.disabled = false;
  } else if (status.type === 'load-error') {
    output.innerHTML = '';
    output.classList.add('error');
    output.classList.remove('timeout-error');
    const msgEl = document.createElement('div');
    msgEl.textContent = 'Failed to load TypeScript compiler.';
    output.appendChild(msgEl);
    if (status.error) {
      const detailEl = document.createElement('div');
      detailEl.className = 'error-detail';
      detailEl.textContent = status.error;
      output.appendChild(detailEl);
    }
    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', () => { retryTsLoad(); });
    output.appendChild(retryBtn);
    runBtn.disabled = true;
  }
});

onSqlStatus((status) => {
  if (status.type === 'loading') {
    output.innerHTML = '<span class="spinner"></span> ' + status.message;
    output.classList.remove('error', 'timeout-error');
    runBtn.disabled = true;
  } else if (status.type === 'ready') {
    output.textContent = 'SQLite runtime ready.';
    output.classList.remove('error', 'timeout-error');
    runBtn.disabled = false;
  } else if (status.type === 'load-error') {
    output.innerHTML = '';
    output.classList.add('error');
    output.classList.remove('timeout-error');
    const msgEl = document.createElement('div');
    msgEl.textContent = 'Failed to load SQLite runtime. Check your internet connection.';
    output.appendChild(msgEl);
    if (status.error) {
      const detailEl = document.createElement('div');
      detailEl.className = 'error-detail';
      detailEl.textContent = status.error;
      output.appendChild(detailEl);
    }
    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', () => { retrySqlLoad(); });
    output.appendChild(retryBtn);
    runBtn.disabled = true;
  }
});

// Initialize CodeMirror editor
const editorContainer = document.getElementById('editor-container');
initEditor(editorContainer);

// ── Language selector ────────────────────────────────────────────────
languageSelect.addEventListener('change', () => {
  // Save current editor content
  setFileCode(getActiveFile(), getCode());

  currentLanguage = languageSelect.value;
  setEditorLanguage(currentLanguage);
  initFiles(currentLanguage);
  setCode(getFileCode(getActiveFile()));
  renderFileTabs();

  // Lazy-load runtimes on first selection
  if (currentLanguage === 'go' && !goWorkerInitialized) {
    goWorkerInitialized = true;
    initGoWorker();
  } else if (currentLanguage === 'javascript' && !jsWorkerInitialized) {
    jsWorkerInitialized = true;
    initJsWorker();
  } else if (currentLanguage === 'typescript' && !tsWorkerInitialized) {
    tsWorkerInitialized = true;
    initTsWorker();
  } else if (currentLanguage === 'sql' && !sqlWorkerInitialized) {
    sqlWorkerInitialized = true;
    initSqlWorker();
  }

  // Update output panel for ready runtimes
  if (currentLanguage === 'python' && pyodideLoaded) {
    output.textContent = 'Python runtime ready.';
  } else if (currentLanguage === 'javascript') {
    // JS is always ready instantly (no runtime to load)
    output.textContent = 'JavaScript ready.';
  }
});

// ── Multi-file project tabs ──────────────────────────────────────────
initFiles();

function renderFileTabs() {
  const fileTabs = document.getElementById('file-tabs');
  if (!fileTabs) return;
  fileTabs.innerHTML = '';

  const files = getFiles();
  const active = getActiveFile();

  files.forEach((file) => {
    const tab = document.createElement('button');
    tab.className = 'file-tab' + (file.name === active ? ' active' : '');
    tab.textContent = file.name;
    tab.addEventListener('click', () => {
      // Save current editor content before switching
      setFileCode(getActiveFile(), getCode());
      setActiveFile(file.name);
      setCode(getFileCode(file.name));
      renderFileTabs();
    });

    // Add delete button for non-main files
    const { mainFile } = getLangConfig(currentLanguage);
    if (file.name !== mainFile) {
      const delBtn = document.createElement('span');
      delBtn.className = 'file-tab-delete';
      delBtn.textContent = '×';
      delBtn.title = 'Delete ' + file.name;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.confirm(`Delete "${file.name}"?`)) {
          // Save current editor content first
          setFileCode(getActiveFile(), getCode());
          deleteFile(file.name);
          setCode(getFileCode(getActiveFile()));
          renderFileTabs();
        }
      });
      tab.appendChild(delBtn);
    }

    fileTabs.appendChild(tab);
  });

  // Add "+" button
  const addBtn = document.createElement('button');
  addBtn.className = 'file-tab-add';
  addBtn.textContent = '+';
  addBtn.title = 'Add new file';
  addBtn.addEventListener('click', () => {
    const { ext } = getLangConfig(currentLanguage);
    let name = window.prompt(`New file name (must end in ${ext}):`);
    if (!name || !name.trim()) return;
    name = name.trim();
    if (!name.endsWith(ext)) name += ext;
    try {
      // Save current editor content before switching
      setFileCode(getActiveFile(), getCode());
      addFile(name, currentLanguage);
      setActiveFile(name);
      setCode(getFileCode(name));
      renderFileTabs();
    } catch (err) {
      window.alert(err.message);
    }
  });
  fileTabs.appendChild(addBtn);
}

renderFileTabs();

// ── Theme toggle ────────────────────────────────────────────────────
initTheme((theme) => setEditorTheme(theme));
setEditorTheme(getTheme());

function updateToggleIcon() {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = getTheme() === 'dark' ? '☀️' : '🌙';
}
updateToggleIcon();

document.getElementById('theme-toggle').addEventListener('click', () => {
  toggleTheme();
  updateToggleIcon();
});

/**
 * Parse a Python traceback string into structured parts.
 * Returns { errorType, errorMessage, traceback (full string) }
 */
function parseError(errorText) {
  const lines = errorText.trimEnd().split('\n');

  // The last line typically contains "ErrorType: message"
  const lastLine = lines[lines.length - 1] || '';
  const match = lastLine.match(/^(\w+Error|Exception|KeyboardInterrupt):\s*(.*)/);

  let errorType = '';
  let errorMessage = '';

  if (match) {
    errorType = match[1];
    errorMessage = match[2];
  } else if (lastLine.match(/^(\w+Error|Exception|KeyboardInterrupt)$/)) {
    // Error with no message (e.g., just "KeyboardInterrupt")
    errorType = lastLine;
  }

  return {
    errorType,
    errorMessage,
    traceback: errorText,
  };
}

/**
 * Render an error into the output panel with structured formatting.
 */
function renderError(container, errorText, stdout) {
  container.innerHTML = '';
  container.classList.add('error');

  // Show any stdout captured before the error
  if (stdout && stdout.trim()) {
    const stdoutEl = document.createElement('div');
    stdoutEl.className = 'error-stdout';
    stdoutEl.textContent = stdout;
    container.appendChild(stdoutEl);
  }

  const parsed = parseError(errorText);

  // Show the full traceback
  const tracebackEl = document.createElement('div');
  tracebackEl.className = 'error-traceback';
  tracebackEl.textContent = parsed.traceback;
  container.appendChild(tracebackEl);
}

function setExecutionState(running) {
  runBtn.disabled = running;
  stopBtn.classList.toggle('hidden', !running);
  if (running) {
    executionDuration.classList.add('hidden');
    executionDuration.textContent = '';
  }
}

function showDuration(seconds) {
  executionDuration.textContent = `Completed in ${seconds}s`;
  executionDuration.classList.remove('hidden');
}

runBtn.addEventListener('click', async () => {
  setFileCode(getActiveFile(), getCode());
  const code = getCode();
  if (!code.trim()) {
    output.textContent = '';
    output.classList.remove('error', 'timeout-error');
    executionDuration.classList.add('hidden');
    executionDuration.textContent = '';
    return;
  }

  output.innerHTML = '<span class="spinner"></span> Running…';
  output.classList.remove('error');
  output.classList.remove('timeout-error');
  setExecutionState(true);

  try {
    let result;
    switch (currentLanguage) {
      case 'go':
        result = await runGoCode(code);
        break;
      case 'javascript':
        result = await runJsCode(code);
        break;
      case 'typescript':
        result = await runTsCode(code);
        break;
      case 'sql':
        result = await runSqlCode(code);
        break;
      default: // python
        result = await runCode(code, getAllFilesForExecution());
        break;
    }
    output.textContent = result.output || '(no output)';
    showDuration(result.duration);
  } catch (err) {
    if (err.isTimeout) {
      output.innerHTML = '';
      output.classList.add('error', 'timeout-error');
      output.textContent = err.message;
    } else {
      renderError(output, err.message, err.stdout);
    }
    if (err.duration) {
      showDuration(err.duration);
    }
  } finally {
    setExecutionState(false);
  }
});

stopBtn.addEventListener('click', () => {
  switch (currentLanguage) {
    case 'go': stopGoExecution(); break;
    case 'javascript': stopJsExecution(); break;
    case 'typescript': stopTsExecution(); break;
    case 'sql': stopSqlExecution(); break;
    default: stopExecution(); break;
  }
  output.textContent = 'Execution stopped.';
  output.classList.remove('error');
  output.classList.remove('timeout-error');
  setExecutionState(false);
});


// ── Snippet management ──────────────────────────────────────────────

const saveBtn = document.getElementById('save-btn');
const snippetList = document.getElementById('snippet-list');

function renderSnippetList() {
  const snippets = loadSnippets();
  snippetList.innerHTML = '';

  if (snippets.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'snippet-empty';
    empty.textContent = 'No saved snippets yet.';
    snippetList.appendChild(empty);
    return;
  }

  snippets.forEach((snippet) => {
    const li = document.createElement('li');
    li.className = 'snippet-item';

    const nameBtn = document.createElement('button');
    nameBtn.className = 'snippet-name';
    nameBtn.textContent = snippet.name;
    nameBtn.title = 'Load this snippet';
    nameBtn.addEventListener('click', () => {
      const snippetLang = snippet.language || 'python';
      if (snippetLang !== currentLanguage) {
        currentLanguage = snippetLang;
        languageSelect.value = currentLanguage;
        setEditorLanguage(currentLanguage);
        // Lazy-load runtime if needed
        if (currentLanguage === 'go' && !goWorkerInitialized) {
          goWorkerInitialized = true;
          initGoWorker();
        } else if (currentLanguage === 'javascript' && !jsWorkerInitialized) {
          jsWorkerInitialized = true;
          initJsWorker();
        } else if (currentLanguage === 'typescript' && !tsWorkerInitialized) {
          tsWorkerInitialized = true;
          initTsWorker();
        } else if (currentLanguage === 'sql' && !sqlWorkerInitialized) {
          sqlWorkerInitialized = true;
          initSqlWorker();
        }
      }
      loadFromSnippet(snippet);
      setCode(getFileCode(getActiveFile()));
      renderFileTabs();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'snippet-delete';
    delBtn.textContent = 'Delete';
    delBtn.title = 'Delete this snippet';
    delBtn.addEventListener('click', () => {
      if (window.confirm(`Delete snippet "${snippet.name}"?`)) {
        deleteSnippet(snippet.id);
        renderSnippetList();
      }
    });

    li.appendChild(nameBtn);
    li.appendChild(delBtn);
    snippetList.appendChild(li);
  });
}

saveBtn.addEventListener('click', () => {
  // Save current editor content before exporting
  setFileCode(getActiveFile(), getCode());
  const files = exportForSnippet();
  // Check if there's any code to save
  const hasCode = files.some((f) => f.code.trim());
  if (!hasCode) return;

  const name = window.prompt('Snippet name:');
  if (!name || !name.trim()) return;

  try {
    saveSnippet(name.trim(), files, currentLanguage);
    renderSnippetList();
  } catch (err) {
    window.alert(err.message);
  }
});

// Render snippet list on page load
renderSnippetList();