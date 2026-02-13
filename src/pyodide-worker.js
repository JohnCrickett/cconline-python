// Web Worker that loads Pyodide and executes Python code
importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js');

const MAX_OUTPUT_LINES = 10000;
const MAX_OUTPUT_BYTES = 500 * 1024; // 500KB

let pyodide = null;

async function initPyodide() {
  self.postMessage({ type: 'loading', message: 'Loading Python runtime...' });
  try {
    pyodide = await loadPyodide();
    self.postMessage({ type: 'ready' });
  } catch (err) {
    self.postMessage({
      type: 'load-error',
      error: err.message || 'Failed to load Python runtime.',
    });
  }
}

const pyodideReady = initPyodide();

/**
 * Truncate output if it exceeds line or byte limits.
 * Returns the (possibly truncated) string.
 */
function truncateOutput(text) {
  let truncated = false;

  // Check byte size first
  if (text.length > MAX_OUTPUT_BYTES) {
    text = text.slice(0, MAX_OUTPUT_BYTES);
    truncated = true;
  }

  // Check line count
  const lines = text.split('\n');
  if (lines.length > MAX_OUTPUT_LINES) {
    text = lines.slice(0, MAX_OUTPUT_LINES).join('\n');
    truncated = true;
  }

  if (truncated) {
    text += '\n\n⚠ Output truncated (exceeded ' + MAX_OUTPUT_LINES + ' lines or ' + (MAX_OUTPUT_BYTES / 1024) + 'KB). Showing first portion only.';
  }

  return text;
}

self.onmessage = async function (event) {
  const { type, code, id } = event.data;

  if (type === 'reload') {
    // Re-attempt Pyodide initialization
    pyodide = null;
    self.postMessage({ type: 'loading', message: 'Retrying Python runtime load...' });
    try {
      pyodide = await loadPyodide();
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({
        type: 'load-error',
        error: err.message || 'Failed to load Python runtime.',
      });
    }
    return;
  }

  if (type !== 'run') return;

  await pyodideReady;

  if (!pyodide) {
    self.postMessage({
      type: 'error',
      error: 'Python runtime is not loaded. Please retry loading.',
      stdout: '',
      id,
    });
    return;
  }

  // Capture stdout by redirecting it before each run
  let output = '';
  pyodide.setStdout({
    batched: (text) => {
      output += text + '\n';
    },
  });

  try {
    pyodide.runPython(code);
    self.postMessage({ type: 'result', output: truncateOutput(output), id });
  } catch (err) {
    // Send full traceback and any stdout captured before the error
    self.postMessage({
      type: 'error',
      error: err.message,
      stdout: truncateOutput(output),
      id,
    });
  }
};

