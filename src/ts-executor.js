// TypeScript executor module: manages the TS Web Worker and provides a Promise-based API

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

export function onTsStatus(callback) {
  onStatusCallback = callback;
}

function setupWorker() {
  try {
    worker = new Worker(new URL('./ts-worker.js', import.meta.url), { type: 'module' });
  } catch (err) {
    console.error('Failed to create TypeScript worker:', err);
    if (onStatusCallback) {
      onStatusCallback({
        type: 'load-error',
        error: 'Failed to start TypeScript worker. Your browser may not support Web Workers.',
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
    console.error('TypeScript worker error:', err);
    if (onStatusCallback) {
      onStatusCallback({
        type: 'load-error',
        error: 'TypeScript worker encountered an error. Try refreshing the page.',
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

export function initTsWorker() {
  setupWorker();
}

export function retryTsLoad() {
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

export async function runTsCode(code) {
  if (!worker) {
    throw new Error('TypeScript worker not initialized. Call initTsWorker() first.');
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
      reject(new Error('Failed to send code to TypeScript worker: ' + err.message));
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

export function stopTsExecution() {
  if (isExecuting) {
    recreateWorker();
  }
}

export function getIsTsExecuting() {
  return isExecuting;
}

