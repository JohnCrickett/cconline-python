// Web Worker that loads Pyodide and executes Python code
importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js');

let pyodide = null;

async function initPyodide() {
  pyodide = await loadPyodide();
  self.postMessage({ type: 'ready' });
}

const pyodideReady = initPyodide();

self.onmessage = async function (event) {
  const { type, code, id } = event.data;

  if (type !== 'run') return;

  await pyodideReady;

  // Capture stdout by redirecting it before each run
  let output = '';
  pyodide.setStdout({
    batched: (text) => {
      output += text + '\n';
    },
  });

  try {
    pyodide.runPython(code);
    self.postMessage({ type: 'result', output: output, id });
  } catch (err) {
    // Send full traceback and any stdout captured before the error
    self.postMessage({
      type: 'error',
      error: err.message,
      stdout: output,
      id,
    });
  }
};

