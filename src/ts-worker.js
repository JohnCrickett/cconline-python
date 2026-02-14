// Web Worker that transpiles TypeScript and executes the resulting JavaScript
import ts from 'typescript';

let ready = false;

// Capture console output (same pattern as a JS worker would use)
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

// Initialize — TypeScript compiler is already bundled, so just mark ready
self.postMessage({ type: 'loading', message: 'Loading TypeScript compiler...' });
try {
  // Verify the compiler loaded correctly
  if (typeof ts.transpileModule !== 'function') {
    throw new Error('TypeScript compiler not loaded correctly');
  }
  ready = true;
  self.postMessage({ type: 'ready' });
} catch (err) {
  self.postMessage({ type: 'load-error', error: err.message || 'Failed to load TypeScript compiler.' });
}

self.onmessage = async function (event) {
  const { type, code, id } = event.data;

  if (type === 'reload') {
    // TS compiler is bundled, so just re-check
    ready = typeof ts.transpileModule === 'function';
    if (ready) {
      self.postMessage({ type: 'ready' });
    } else {
      self.postMessage({ type: 'load-error', error: 'TypeScript compiler not available.' });
    }
    return;
  }

  if (type !== 'run') return;

  if (!ready) {
    self.postMessage({ type: 'error', error: 'TypeScript compiler is not loaded.', id });
    return;
  }

  // Step 1: Transpile TS → JS
  let jsCode;
  try {
    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.None,
        strict: false,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
      reportDiagnostics: true,
    });

    // Check for diagnostics (transpile errors)
    if (result.diagnostics && result.diagnostics.length > 0) {
      const errors = result.diagnostics
        .map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
        .join('\n');
      self.postMessage({ type: 'error', error: errors, id });
      return;
    }

    jsCode = result.outputText;
  } catch (err) {
    self.postMessage({ type: 'error', error: 'Transpilation error: ' + (err.message || String(err)), id });
    return;
  }

  // Step 2: Execute the transpiled JS
  captureConsole();
  try {
    const result = (0, eval)(jsCode);
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

