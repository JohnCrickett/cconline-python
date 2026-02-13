// Web Worker that loads Go WASM (Yaegi interpreter) and executes Go code
importScripts('/wasm_exec.js');

let goReady = false;

async function initGo() {
  self.postMessage({ type: 'loading', message: 'Loading Go runtime...' });
  try {
    const go = new Go();
    const result = await WebAssembly.instantiateStreaming(
      fetch('/yaegi.wasm'),
      go.importObject
    );
    // Run the Go program (sets up runGoCode on globalThis)
    go.run(result.instance);

    // Wait briefly for the Go runtime to initialize
    // The Go main() sets runGoCode on js.Global() before blocking
    let attempts = 0;
    while (typeof globalThis.runGoCode !== 'function' && attempts < 50) {
      await new Promise((r) => setTimeout(r, 100));
      attempts++;
    }

    if (typeof globalThis.runGoCode !== 'function') {
      throw new Error('runGoCode not available after WASM initialization');
    }

    goReady = true;
    self.postMessage({ type: 'ready' });
  } catch (err) {
    self.postMessage({
      type: 'load-error',
      error: err.message || 'Failed to load Go runtime.',
    });
  }
}

const goReadyPromise = initGo();

self.onmessage = async function (event) {
  const { type, code, id } = event.data;

  if (type === 'reload') {
    goReady = false;
    await initGo();
    return;
  }

  if (type !== 'run') return;

  await goReadyPromise;

  if (!goReady) {
    self.postMessage({
      type: 'error',
      error: 'Go runtime is not loaded. Please retry loading.',
      id,
    });
    return;
  }

  try {
    const output = globalThis.runGoCode(code);
    self.postMessage({ type: 'result', output: output || '', id });
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err.message || String(err),
      id,
    });
  }
};

