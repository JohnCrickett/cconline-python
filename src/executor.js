// Executor module: manages the Pyodide Web Worker and provides a Promise-based API

const EXECUTION_TIMEOUT = 10000; // 10 seconds

let worker = null;
let messageId = 0;
const pendingRequests = new Map();
let readyResolve = null;
let readyReject = null;
let currentTimeoutId = null;
let currentExecutionId = null;
let workerReady = new Promise((resolve, reject) => {
  readyResolve = resolve;
  readyReject = reject;
});
let isExecuting = false;

// Callback for status updates (loading, load-error)
let onStatusCallback = null;

export function onStatus(callback) {
  onStatusCallback = callback;
}

function setupWorker() {
  try {
    worker = new Worker(new URL('./pyodide-worker.js', import.meta.url));
  } catch (err) {
    console.error('Failed to create worker:', err);
    if (onStatusCallback) {
      onStatusCallback({
        type: 'load-error',
        error: 'Failed to start Python worker. Your browser may not support Web Workers.',
      });
    }
    return;
  }

  worker.onmessage = function (event) {
    const { type, output, error, stdout, id, message } = event.data;

    if (type === 'loading') {
      if (onStatusCallback) {
        onStatusCallback({ type: 'loading', message: message });
      }
      return;
    }

    if (type === 'ready') {
      if (onStatusCallback) {
        onStatusCallback({ type: 'ready' });
      }
      readyResolve();
      return;
    }

    if (type === 'load-error') {
      if (onStatusCallback) {
        onStatusCallback({ type: 'load-error', error: error });
      }
      readyReject(new Error(error));
      return;
    }

    if (type === 'package-loading') {
      if (onStatusCallback) {
        onStatusCallback({ type: 'package-loading', packages: event.data.packages });
      }
      // Pause timeout during package downloading
      if (id === currentExecutionId && currentTimeoutId !== null) {
        clearTimeout(currentTimeoutId);
        currentTimeoutId = null;
      }
      return;
    }

    if (type === 'packages-loaded') {
      if (onStatusCallback) {
        onStatusCallback({ type: 'packages-loaded' });
      }
      // Restart timeout now that packages are loaded — fresh 10s for code execution
      if (id === currentExecutionId && pendingRequests.has(id)) {
        currentTimeoutId = setTimeout(() => {
          if (pendingRequests.has(id)) {
            const pending = pendingRequests.get(id);
            const err = new Error(
              `⏱ Execution timed out after ${EXECUTION_TIMEOUT / 1000} seconds. Your code may contain an infinite loop.`
            );
            err.isTimeout = true;
            pending.reject(err);
          }
        }, EXECUTION_TIMEOUT);
      }
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
    if (onStatusCallback) {
      onStatusCallback({
        type: 'load-error',
        error: 'Python worker encountered an error. Try refreshing the page.',
      });
    }
  };
}

function recreateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  // Reject all pending requests
  for (const [, pending] of pendingRequests) {
    pending.reject(new Error('Execution cancelled'));
  }
  pendingRequests.clear();
  isExecuting = false;

  // Reset the ready promise
  workerReady = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  setupWorker();
}

export function initWorker() {
  setupWorker();
}

/**
 * Retry loading Pyodide by sending a reload message to the worker.
 */
export function retryLoad() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  // Reset the ready promise
  workerReady = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  setupWorker();
}

export async function runCode(code, files) {
  if (!worker) {
    throw new Error('Worker not initialized. Call initWorker() first.');
  }

  await workerReady;

  const id = ++messageId;
  const startTime = performance.now();
  isExecuting = true;

  const executionPromise = new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    try {
      worker.postMessage({ type: 'run', code, files: files || [], id });
    } catch (err) {
      pendingRequests.delete(id);
      reject(new Error('Failed to send code to worker: ' + err.message));
    }
  });

  currentExecutionId = id;
  const timeoutPromise = new Promise((_, reject) => {
    currentTimeoutId = setTimeout(() => {
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
    if (currentTimeoutId !== null) {
      clearTimeout(currentTimeoutId);
      currentTimeoutId = null;
    }
    currentExecutionId = null;
    return { output: result, duration };
  } catch (err) {
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    isExecuting = false;
    if (currentTimeoutId !== null) {
      clearTimeout(currentTimeoutId);
      currentTimeoutId = null;
    }
    currentExecutionId = null;
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

