// Web Worker that executes JavaScript code natively

let ready = false;

// Capture console output
const outputLines = [];
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
};

function captureConsole() {
  outputLines.length = 0;
  console.log = (...args) => outputLines.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  console.warn = (...args) => outputLines.push('[warn] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  console.error = (...args) => outputLines.push('[error] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  console.info = (...args) => outputLines.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
}

function restoreConsole() {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
}

// JS is ready immediately — no runtime to load
self.postMessage({ type: 'ready' });
ready = true;

self.onmessage = async function (event) {
  const { type, code, id } = event.data;

  if (type === 'reload') {
    ready = true;
    self.postMessage({ type: 'ready' });
    return;
  }

  if (type !== 'run') return;

  if (!ready) {
    self.postMessage({ type: 'error', error: 'JavaScript runtime is not ready.', id });
    return;
  }

  captureConsole();
  try {
    // Use indirect eval for global scope
    const result = (0, eval)(code);
    // If code returns a value and nothing was logged, show the return value
    if (outputLines.length === 0 && result !== undefined) {
      outputLines.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
    }
    restoreConsole();
    self.postMessage({ type: 'result', output: outputLines.join('\n'), id });
  } catch (err) {
    restoreConsole();
    self.postMessage({ type: 'error', error: err.message || String(err), id });
  }
};

