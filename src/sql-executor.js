// SQL executor module: manages the sql.js WASM Web Worker and provides a Promise-based API
// NOTE: When the worker is recreated (e.g., after timeout), the in-memory SQLite database is lost.
// This is acceptable — the user will need to re-run CREATE TABLE / INSERT statements.

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

export function onSqlStatus(callback) {
  onStatusCallback = callback;
}

function setupWorker() {
  try {
    worker = new Worker(new URL('./sql-worker.js', import.meta.url));
  } catch (err) {
    console.error('Failed to create SQL worker:', err);
    if (onStatusCallback) {
      onStatusCallback({
        type: 'load-error',
        error: 'Failed to start SQL worker. Your browser may not support Web Workers.',
      });
    }
    return;
  }

  worker.onmessage = function (event) {
    const { type, output, error, id, message } = event.data;

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

    const pending = pendingRequests.get(id);
    if (!pending) return;

    pendingRequests.delete(id);

    if (type === 'result') {
      pending.resolve(output);
    } else if (type === 'error') {
      const err = new Error(error);
      err.stdout = '';
      pending.reject(err);
    }
  };

  worker.onerror = function (err) {
    console.error('SQL worker error:', err);
    if (onStatusCallback) {
      onStatusCallback({
        type: 'load-error',
        error: 'SQL worker encountered an error. Try refreshing the page.',
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

export function initSqlWorker() {
  setupWorker();
}

export function retrySqlLoad() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  workerReady = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  setupWorker();
}

export async function runSqlCode(code) {
  if (!worker) {
    throw new Error('SQL worker not initialized. Call initSqlWorker() first.');
  }

  await workerReady;

  const id = ++messageId;
  const startTime = performance.now();
  isExecuting = true;

  const executionPromise = new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    try {
      worker.postMessage({ type: 'run', code, id });
    } catch (err) {
      pendingRequests.delete(id);
      reject(new Error('Failed to send code to SQL worker: ' + err.message));
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
      recreateWorker();
    }
    err.duration = duration;
    throw err;
  }
}

export function stopSqlExecution() {
  if (isExecuting) {
    recreateWorker();
  }
}

export function getIsSqlExecuting() {
  return isExecuting;
}
