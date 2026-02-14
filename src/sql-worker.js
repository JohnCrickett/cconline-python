// Web Worker that loads sql.js (SQLite WASM) and executes SQL queries
importScripts('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js');

let db = null;
let ready = false;

async function initSql() {
  self.postMessage({ type: 'loading', message: 'Loading SQLite runtime...' });
  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
    });
    db = new SQL.Database();
    ready = true;
    self.postMessage({ type: 'ready' });
  } catch (err) {
    self.postMessage({ type: 'load-error', error: err.message || 'Failed to load SQLite runtime.' });
  }
}

const initPromise = initSql();

function formatResults(results) {
  if (!results || results.length === 0) return 'Query executed successfully. No results to display.';

  const output = [];
  for (const result of results) {
    if (!result.columns || result.columns.length === 0) continue;

    const columns = result.columns;
    const values = result.values || [];

    // Calculate column widths
    const widths = columns.map((col, i) => {
      const colWidth = String(col).length;
      const maxValueWidth = values.reduce((max, row) => {
        const cellStr = row[i] === null ? 'NULL' : String(row[i]);
        return Math.max(max, cellStr.length);
      }, 0);
      return Math.max(colWidth, maxValueWidth);
    });

    // Build header
    const header = columns.map((col, i) => String(col).padEnd(widths[i])).join(' | ');
    const separator = widths.map(w => '-'.repeat(w)).join('-+-');

    output.push(header);
    output.push(separator);

    // Build rows
    for (const row of values) {
      const line = row.map((cell, i) => {
        const str = cell === null ? 'NULL' : String(cell);
        return str.padEnd(widths[i]);
      }).join(' | ');
      output.push(line);
    }

    output.push(`(${values.length} row${values.length !== 1 ? 's' : ''})`);
    output.push('');
  }

  return output.join('\n').trim();
}

self.onmessage = async function (event) {
  const { type, code, id } = event.data;

  if (type === 'reload') {
    ready = false;
    db = null;
    await initSql();
    return;
  }

  if (type !== 'run') return;

  await initPromise;

  if (!ready || !db) {
    self.postMessage({ type: 'error', error: 'SQLite runtime is not loaded. Please retry loading.', id });
    return;
  }

  try {
    // Use db.exec which handles multiple statements separated by semicolons
    const queryResults = db.exec(code);

    if (queryResults.length > 0) {
      self.postMessage({ type: 'result', output: formatResults(queryResults), id });
    } else {
      // DML/DDL statements (INSERT, UPDATE, CREATE, etc.) — report changes
      const changes = db.getRowsModified();
      let msg = 'Query executed successfully.';
      if (changes > 0) {
        msg += ` ${changes} row${changes !== 1 ? 's' : ''} affected.`;
      }
      self.postMessage({ type: 'result', output: msg, id });
    }
  } catch (err) {
    self.postMessage({ type: 'error', error: err.message || String(err), id });
  }
};

