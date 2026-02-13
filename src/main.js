import './style.css';
import { initWorker, runCode, stopExecution, onStatus, retryLoad } from './executor.js';
import { initEditor, getCode, setCode } from './editor.js';
import { saveSnippet, loadSnippets, deleteSnippet } from './snippets.js';

const runBtn = document.getElementById('run-btn');
const stopBtn = document.getElementById('stop-btn');
const output = document.getElementById('output');
const executionDuration = document.getElementById('execution-duration');

// ── WebAssembly detection ──────────────────────────────────────────
if (typeof WebAssembly !== 'object') {
  const app = document.getElementById('app');
  app.innerHTML = `
    <header><h1>Python Playground</h1></header>
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
  }
});

// Initialize CodeMirror editor
const editorContainer = document.getElementById('editor-container');
initEditor(editorContainer);

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
  const code = getCode();
  if (!code.trim()) {
    // Clear previous output when running empty code
    output.textContent = '';
    output.classList.remove('error', 'timeout-error');
    executionDuration.classList.add('hidden');
    executionDuration.textContent = '';
    return;
  }

  // Clear previous output and show loading spinner
  output.innerHTML = '<span class="spinner"></span> Running\u2026';
  output.classList.remove('error');
  output.classList.remove('timeout-error');
  setExecutionState(true);

  try {
    const { output: result, duration } = await runCode(code);
    output.textContent = result || '(no output)';
    showDuration(duration);
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
  stopExecution();
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
      setCode(snippet.code);
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
  const code = getCode();
  if (!code.trim()) return;

  const name = window.prompt('Snippet name:');
  if (!name || !name.trim()) return;

  try {
    saveSnippet(name.trim(), code);
    renderSnippetList();
  } catch (err) {
    window.alert(err.message);
  }
});

// Render snippet list on page load
renderSnippetList();