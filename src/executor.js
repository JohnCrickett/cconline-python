// Executor module: manages the Pyodide Web Worker and provides a Promise-based API

const EXECUTION_TIMEOUT = 10000; // 10 seconds

let worker = null;
let messageId = 0;
const pendingRequests = new Map();
let readyResolve = null;
let workerReady = new Promise((resolve) => {
  readyResolve = resolve;
});
let isExecuting = false;

function setupWorker() {
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

function recreateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  // Reject all pending requests
  for (const [id, pending] of pendingRequests) {
    pending.reject(new Error('Execution cancelled'));
  }
  pendingRequests.clear();
  isExecuting = false;

  // Reset the ready promise
  workerReady = new Promise((resolve) => {
    readyResolve = resolve;
  });
  setupWorker();
}

export function initWorker() {
  setupWorker();
}

export async function runCode(code) {
  if (!worker) {
    throw new Error('Worker not initialized. Call initWorker() first.');
  }

  await workerReady;

  const id = ++messageId;
  const startTime = performance.now();
  isExecuting = true;

  const executionPromise = new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ type: 'run', code, id });
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        const err = new Error(
          `⏱ Execution timed out after ${EXECUTION_TIMEOUT / 1000} seconds. Your code may contain an infinite loop.`
        );
        err.isTimeout = true;
        reject(err);
      }
    }, EXECUTION_TIMEOUT);
  });

  try {
    const result = await Promise.race([executionPromise, timeoutPromise]);
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    isExecuting = false;
    return { output: result, duration };
  } catch (err) {
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    isExecuting = false;
    if (err.isTimeout) {
      // Terminate and recreate the worker for timeout
      recreateWorker();
    }
    err.duration = duration;
    throw err;
  }
}

export function stopExecution() {
  if (isExecuting) {
    recreateWorker();
  }
}

export function getIsExecuting() {
  return isExecuting;
}

