// Executor module: manages the Pyodide Web Worker and provides a Promise-based API

let worker = null;
let messageId = 0;
const pendingRequests = new Map();
let readyResolve = null;
const workerReady = new Promise((resolve) => {
  readyResolve = resolve;
});

export function initWorker() {
  worker = new Worker(new URL('./pyodide-worker.js', import.meta.url));

  worker.onmessage = function (event) {
    const { type, output, error, stdout, id } = event.data;

    if (type === 'ready') {
      readyResolve();
      return;
    }

    const pending = pendingRequests.get(id);
    if (!pending) return;

    pendingRequests.delete(id);

    if (type === 'result') {
      pending.resolve(output);
    } else if (type === 'error') {
      const err = new Error(error);
      err.stdout = stdout || '';
      pending.reject(err);
    }
  };

  worker.onerror = function (err) {
    console.error('Worker error:', err);
  };
}

export async function runCode(code) {
  if (!worker) {
    throw new Error('Worker not initialized. Call initWorker() first.');
  }

  await workerReady;

  const id = ++messageId;

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ type: 'run', code, id });
  });
}

