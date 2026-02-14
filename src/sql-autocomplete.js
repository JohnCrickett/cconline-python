// Custom SQL completion source for CodeMirror 6

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'INDEX', 'JOIN',
  'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'IN',
  'BETWEEN', 'LIKE', 'IS', 'NULL', 'AS', 'ORDER', 'BY', 'ASC', 'DESC',
  'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'UNION', 'ALL',
  'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'PRIMARY', 'KEY',
  'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'DEFAULT', 'CHECK', 'UNIQUE',
  'AUTOINCREMENT', 'IF', 'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
  // Lowercase versions of common keywords
  'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set',
  'delete', 'create', 'table', 'drop', 'join', 'on', 'and', 'or', 'not',
  'order', 'by', 'group', 'having', 'limit',
];

const SQL_FUNCTIONS = [
  { label: 'COUNT', info: 'COUNT(*) — count rows' },
  { label: 'SUM', info: 'SUM(col) — sum of values' },
  { label: 'AVG', info: 'AVG(col) — average of values' },
  { label: 'MIN', info: 'MIN(col) — minimum value' },
  { label: 'MAX', info: 'MAX(col) — maximum value' },
  { label: 'COALESCE', info: 'COALESCE(a,b) — first non-null value' },
  { label: 'IFNULL', info: 'IFNULL(a,b) — if a is null return b' },
  { label: 'NULLIF', info: 'NULLIF(a,b) — null if a equals b' },
  { label: 'CAST', info: 'CAST(expr AS type) — type conversion' },
  { label: 'SUBSTR', info: 'SUBSTR(str,start,len) — substring' },
  { label: 'LENGTH', info: 'LENGTH(str) — string length' },
  { label: 'UPPER', info: 'UPPER(str) — uppercase string' },
  { label: 'LOWER', info: 'LOWER(str) — lowercase string' },
  { label: 'TRIM', info: 'TRIM(str) — remove whitespace' },
  { label: 'REPLACE', info: 'REPLACE(str,from,to) — replace substring' },
  { label: 'ROUND', info: 'ROUND(num,digits) — round number' },
  { label: 'ABS', info: 'ABS(num) — absolute value' },
  { label: 'RANDOM', info: 'RANDOM() — random integer' },
  { label: 'DATE', info: 'DATE(time) — extract date' },
  { label: 'TIME', info: 'TIME(time) — extract time' },
  { label: 'DATETIME', info: 'DATETIME(time) — date and time' },
  { label: 'TYPEOF', info: 'TYPEOF(expr) — type of expression' },
  { label: 'TOTAL', info: 'TOTAL(col) — sum as float' },
  { label: 'GROUP_CONCAT', info: 'GROUP_CONCAT(col) — concatenate group values' },
];

const SQL_TYPES = [
  { label: 'INTEGER', info: 'SQLite integer type' },
  { label: 'REAL', info: 'SQLite floating-point type' },
  { label: 'TEXT', info: 'SQLite text/string type' },
  { label: 'BLOB', info: 'SQLite binary large object type' },
  { label: 'NULL', info: 'SQLite null type' },
];

// Build the completions list once
const completions = [
  ...SQL_KEYWORDS.map((kw) => ({
    label: kw,
    type: 'keyword',
    boost: kw === kw.toLowerCase() ? -1 : 0,
  })),
  ...SQL_FUNCTIONS.map((f) => ({
    label: f.label,
    type: 'function',
    info: f.info,
  })),
  ...SQL_TYPES.map((t) => ({
    label: t.label,
    type: 'type',
    info: t.info,
  })),
];

/**
 * Custom SQL completion source for CodeMirror 6.
 * Activates on typing with a minimum prefix of 2 characters.
 * @param {import('@codemirror/autocomplete').CompletionContext} context
 * @returns {import('@codemirror/autocomplete').CompletionResult | null}
 */
export function sqlCompletionSource(context) {
  const word = context.matchBefore(/[a-zA-Z_]\w*/);
  if (!word) return null;
  if (word.from === word.to && !context.explicit) return null;
  if (word.to - word.from < 2 && !context.explicit) return null;

  return {
    from: word.from,
    options: completions,
    validFor: /^[a-zA-Z_]\w*$/,
  };
}

