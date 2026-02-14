// Custom TypeScript completion source for CodeMirror 6

const TS_KEYWORDS = [
  // JS keywords
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
  'if', 'import', 'in', 'instanceof', 'let', 'new', 'return', 'super',
  'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while',
  'with', 'yield', 'async', 'await', 'of', 'true', 'false', 'null', 'undefined',
  // TS-specific keywords
  'interface', 'type', 'enum', 'namespace', 'readonly', 'abstract', 'implements',
  'declare', 'module', 'keyof', 'infer', 'is', 'asserts', 'override', 'satisfies',
  'as', 'any', 'unknown', 'never', 'string', 'number', 'boolean', 'symbol',
  'bigint', 'object',
];

const TS_UTILITY_TYPES = [
  { label: 'Partial', info: 'Partial<T> — Make all properties optional' },
  { label: 'Required', info: 'Required<T> — Make all properties required' },
  { label: 'Readonly', info: 'Readonly<T> — Make all properties readonly' },
  { label: 'Record', info: 'Record<K, V> — Construct type with keys K and values V' },
  { label: 'Pick', info: 'Pick<T, K> — Pick properties K from T' },
  { label: 'Omit', info: 'Omit<T, K> — Omit properties K from T' },
  { label: 'Exclude', info: 'Exclude<T, U> — Exclude types assignable to U from T' },
  { label: 'Extract', info: 'Extract<T, U> — Extract types assignable to U from T' },
  { label: 'NonNullable', info: 'NonNullable<T> — Exclude null and undefined from T' },
  { label: 'ReturnType', info: 'ReturnType<T> — Get the return type of a function type' },
  { label: 'Parameters', info: 'Parameters<T> — Get parameter types of a function type as a tuple' },
  { label: 'InstanceType', info: 'InstanceType<T> — Get the instance type of a constructor function type' },
  { label: 'Awaited', info: 'Awaited<T> — Recursively unwrap Promise types' },
  { label: 'Promise', info: 'Promise<T> — Represents an asynchronous operation' },
];

const JS_BUILTINS = [
  { label: 'console.log', info: 'console.log(...args: any[]): void' },
  { label: 'console.warn', info: 'console.warn(...args: any[]): void' },
  { label: 'console.error', info: 'console.error(...args: any[]): void' },
  { label: 'console.info', info: 'console.info(...args: any[]): void' },
  { label: 'JSON.stringify', info: 'JSON.stringify(value: any, replacer?, space?): string' },
  { label: 'JSON.parse', info: 'JSON.parse(text: string, reviver?): any' },
  { label: 'Array.isArray', info: 'Array.isArray(arg: any): arg is any[]' },
  { label: 'Array.from', info: 'Array.from<T>(iterable: Iterable<T>): T[]' },
  { label: 'Object.keys', info: 'Object.keys(o: object): string[]' },
  { label: 'Object.values', info: 'Object.values(o: object): any[]' },
  { label: 'Object.entries', info: 'Object.entries(o: object): [string, any][]' },
  { label: 'Object.assign', info: 'Object.assign(target: object, ...sources: any[]): any' },
  { label: 'Math.floor', info: 'Math.floor(x: number): number' },
  { label: 'Math.ceil', info: 'Math.ceil(x: number): number' },
  { label: 'Math.round', info: 'Math.round(x: number): number' },
  { label: 'Math.random', info: 'Math.random(): number' },
  { label: 'Math.max', info: 'Math.max(...values: number[]): number' },
  { label: 'Math.min', info: 'Math.min(...values: number[]): number' },
  { label: 'Math.abs', info: 'Math.abs(x: number): number' },
  { label: 'parseInt', info: 'parseInt(string: string, radix?: number): number' },
  { label: 'parseFloat', info: 'parseFloat(string: string): number' },
  { label: 'isNaN', info: 'isNaN(number: number): boolean' },
  { label: 'isFinite', info: 'isFinite(number: number): boolean' },
  { label: 'setTimeout', info: 'setTimeout(handler: Function, timeout?: number): number' },
  { label: 'setInterval', info: 'setInterval(handler: Function, timeout?: number): number' },
  { label: 'Map', info: 'Map<K, V> — Key-value collection with any key type' },
  { label: 'Set', info: 'Set<T> — Collection of unique values' },
  { label: 'WeakMap', info: 'WeakMap<K, V> — Weakly referenced key-value collection' },
  { label: 'WeakSet', info: 'WeakSet<T> — Weakly referenced collection of unique objects' },
  { label: 'Symbol', info: 'Symbol(description?: string): symbol' },
  { label: 'RegExp', info: 'RegExp(pattern: string, flags?: string)' },
  { label: 'Date', info: 'Date — Represents a single moment in time' },
  { label: 'Error', info: 'Error(message?: string)' },
  { label: 'TypeError', info: 'TypeError(message?: string)' },
];

// Build the completions list once
const completions = [
  ...TS_KEYWORDS.map((kw) => ({
    label: kw,
    type: 'keyword',
    boost: kw === 'true' || kw === 'false' || kw === 'null' || kw === 'undefined' ? -1 : 0,
  })),
  ...TS_UTILITY_TYPES.map((t) => ({
    label: t.label,
    type: 'type',
    info: t.info,
  })),
  ...JS_BUILTINS.map((b) => ({
    label: b.label,
    type: 'function',
    info: b.info,
  })),
];

/**
 * Custom TypeScript completion source for CodeMirror 6.
 * Activates on typing with a minimum prefix of 2 characters.
 * @param {import('@codemirror/autocomplete').CompletionContext} context
 * @returns {import('@codemirror/autocomplete').CompletionResult | null}
 */
export function tsCompletionSource(context) {
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

