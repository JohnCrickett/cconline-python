// Web Worker that loads Pyodide and executes Python code
importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js');

const MAX_OUTPUT_LINES = 10000;
const MAX_OUTPUT_BYTES = 500 * 1024; // 500KB

const STDLIB_MODULES = new Set([
  'abc', 'aifc', 'argparse', 'array', 'ast', 'asynchat', 'asyncio', 'asyncore',
  'atexit', 'base64', 'bdb', 'binascii', 'binhex', 'bisect', 'builtins',
  'bz2', 'calendar', 'cgi', 'cgitb', 'chunk', 'cmath', 'cmd', 'code',
  'codecs', 'codeop', 'collections', 'colorsys', 'compileall', 'concurrent',
  'configparser', 'contextlib', 'contextvars', 'copy', 'copyreg', 'cProfile',
  'csv', 'ctypes', 'curses', 'dataclasses', 'datetime', 'dbm', 'decimal',
  'difflib', 'dis', 'distutils', 'doctest', 'email', 'encodings', 'enum',
  'errno', 'faulthandler', 'fcntl', 'filecmp', 'fileinput', 'fnmatch',
  'formatter', 'fractions', 'ftplib', 'functools', 'gc', 'getopt', 'getpass',
  'gettext', 'glob', 'grp', 'gzip', 'hashlib', 'heapq', 'hmac', 'html',
  'http', 'idlelib', 'imaplib', 'imghdr', 'imp', 'importlib', 'inspect',
  'io', 'ipaddress', 'itertools', 'json', 'keyword', 'lib2to3', 'linecache',
  'locale', 'logging', 'lzma', 'mailbox', 'mailcap', 'marshal', 'math',
  'mimetypes', 'mmap', 'modulefinder', 'multiprocessing', 'netrc', 'nis',
  'nntplib', 'numbers', 'operator', 'optparse', 'os', 'ossaudiodev',
  'pathlib', 'pdb', 'pickle', 'pickletools', 'pipes', 'pkgutil', 'platform',
  'plistlib', 'poplib', 'posix', 'posixpath', 'pprint', 'profile', 'pstats',
  'pty', 'pwd', 'py_compile', 'pyclbr', 'pydoc', 'queue', 'quopri',
  'random', 're', 'readline', 'reprlib', 'resource', 'rlcompleter', 'runpy',
  'sched', 'secrets', 'select', 'selectors', 'shelve', 'shlex', 'shutil',
  'signal', 'site', 'smtpd', 'smtplib', 'sndhdr', 'socket', 'socketserver',
  'sqlite3', 'ssl', 'stat', 'statistics', 'string', 'stringprep', 'struct',
  'subprocess', 'sunau', 'symtable', 'sys', 'sysconfig', 'syslog', 'tabnanny',
  'tarfile', 'telnetlib', 'tempfile', 'termios', 'test', 'textwrap', 'threading',
  'time', 'timeit', 'tkinter', 'token', 'tokenize', 'trace', 'traceback',
  'tracemalloc', 'tty', 'turtle', 'turtledemo', 'types', 'typing',
  'unicodedata', 'unittest', 'urllib', 'uu', 'uuid', 'venv', 'warnings',
  'wave', 'weakref', 'webbrowser', 'winreg', 'winsound', 'wsgiref',
  'xdrlib', 'xml', 'xmlrpc', 'zipapp', 'zipfile', 'zipimport', 'zlib',
  '_thread', '__future__',
]);

function detectImports(code, projectFiles) {
  const imports = new Set();
  const projectModules = new Set(
    (projectFiles || []).map(f => f.name.replace(/\.py$/, ''))
  );

  // Match: import X, import X as Y, from X import ...
  const importRegex = /^\s*(?!#)(?:import|from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const mod = match[1];
    if (!STDLIB_MODULES.has(mod) && !projectModules.has(mod)) {
      imports.add(mod);
    }
  }
  return [...imports];
}

let pyodide = null;

async function initPyodide() {
  self.postMessage({ type: 'loading', message: 'Loading Python runtime...' });
  try {
    pyodide = await loadPyodide();
    await pyodide.loadPackage('micropip');
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
  const { type, code, id, files } = event.data;

  if (type === 'reload') {
    // Re-attempt Pyodide initialization
    pyodide = null;
    self.postMessage({ type: 'loading', message: 'Retrying Python runtime load...' });
    try {
      pyodide = await loadPyodide();
      await pyodide.loadPackage('micropip');
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

  // Auto-detect and load third-party packages
  const packages = detectImports(code, files);
  if (packages.length > 0) {
    self.postMessage({ type: 'package-loading', packages, id });
    try {
      await pyodide.loadPackage(packages);
    } catch (e) {
      // Try micropip as fallback for pure-Python packages
      const micropip = pyodide.pyimport('micropip');
      for (const pkg of packages) {
        try {
          await micropip.install(pkg);
        } catch (installErr) {
          // Package not available — let the import fail naturally in Python
          console.warn(`Failed to install ${pkg}:`, installErr.message);
        }
      }
    }
    self.postMessage({ type: 'packages-loaded', id });
  }

  // Write project files to virtual filesystem for cross-file imports
  if (files && files.length > 0) {
    for (const file of files) {
      pyodide.FS.writeFile('/home/pyodide/' + file.name, file.code);
    }
  }

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

