// Custom JavaScript completion source for CodeMirror 6

const JS_KEYWORDS = [
  'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'default', 'break', 'continue', 'try', 'catch',
  'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof', 'in', 'of',
  'void', 'this', 'class', 'extends', 'super', 'import', 'export', 'from',
  'async', 'await', 'yield', 'true', 'false', 'null', 'undefined',
];

const JS_BUILTINS = [
  { label: 'console.log', info: 'console.log(...data: any[]): void' },
  { label: 'console.error', info: 'console.error(...data: any[]): void' },
  { label: 'console.warn', info: 'console.warn(...data: any[]): void' },
  { label: 'Math.floor', info: 'Math.floor(x: number): number' },
  { label: 'Math.random', info: 'Math.random(): number' },
  { label: 'Math.round', info: 'Math.round(x: number): number' },
  { label: 'Math.max', info: 'Math.max(...values: number[]): number' },
  { label: 'Math.min', info: 'Math.min(...values: number[]): number' },
  { label: 'parseInt', info: 'parseInt(string: string, radix?: number): number' },
  { label: 'parseFloat', info: 'parseFloat(string: string): number' },
  { label: 'isNaN', info: 'isNaN(number: number): boolean' },
  { label: 'isFinite', info: 'isFinite(number: number): boolean' },
  { label: 'JSON.stringify', info: 'JSON.stringify(value: any, replacer?: any, space?: number): string' },
  { label: 'JSON.parse', info: 'JSON.parse(text: string, reviver?: Function): any' },
  { label: 'Array.isArray', info: 'Array.isArray(arg: any): boolean' },
  { label: 'Object.keys', info: 'Object.keys(o: object): string[]' },
  { label: 'Object.values', info: 'Object.values(o: object): any[]' },
  { label: 'Object.entries', info: 'Object.entries(o: object): [string, any][]' },
  { label: 'Promise.all', info: 'Promise.all(values: Iterable<Promise>): Promise<any[]>' },
  { label: 'Promise.resolve', info: 'Promise.resolve(value?: any): Promise<any>' },
  { label: 'setTimeout', info: 'setTimeout(handler: Function, timeout?: number, ...args: any[]): number' },
  { label: 'setInterval', info: 'setInterval(handler: Function, timeout?: number, ...args: any[]): number' },
  { label: 'fetch', info: 'fetch(input: RequestInfo, init?: RequestInit): Promise<Response>' },
  { label: 'Map', info: 'new Map(entries?: Iterable<[any, any]>): Map' },
  { label: 'Set', info: 'new Set(values?: Iterable<any>): Set' },
  { label: 'WeakMap', info: 'new WeakMap(entries?: Iterable<[object, any]>): WeakMap' },
  { label: 'WeakSet', info: 'new WeakSet(values?: Iterable<object>): WeakSet' },
  { label: 'Symbol', info: 'Symbol(description?: string): symbol' },
  { label: 'Proxy', info: 'new Proxy(target: object, handler: ProxyHandler): Proxy' },
  { label: 'Reflect', info: 'Reflect — built-in object for interceptable JavaScript operations' },
];

const COMMON_GLOBALS = [
  { label: 'Array', info: 'Array constructor and static methods' },
  { label: 'Object', info: 'Object constructor and static methods' },
  { label: 'String', info: 'String constructor and static methods' },
  { label: 'Number', info: 'Number constructor and static methods' },
  { label: 'Boolean', info: 'Boolean constructor' },
  { label: 'Date', info: 'Date constructor for date/time operations' },
  { label: 'RegExp', info: 'RegExp constructor for regular expressions' },
  { label: 'Error', info: 'Error constructor for error objects' },
  { label: 'Promise', info: 'Promise constructor for async operations' },
  { label: 'JSON', info: 'JSON parsing and serialization' },
  { label: 'Math', info: 'Math object with mathematical constants and functions' },
  { label: 'console', info: 'Console object for logging and debugging' },
];

// Build the completions list once
const completions = [
  ...JS_KEYWORDS.map((kw) => ({
    label: kw,
    type: 'keyword',
    boost: kw === 'true' || kw === 'false' || kw === 'null' || kw === 'undefined' ? -1 : 0,
  })),
  ...JS_BUILTINS.map((b) => ({
    label: b.label,
    type: 'function',
    info: b.info,
  })),
  ...COMMON_GLOBALS.map((g) => ({
    label: g.label,
    type: 'class',
    info: g.info,
  })),
];

/**
 * Custom JavaScript completion source for CodeMirror 6.
 * Activates on typing with a minimum prefix of 2 characters.
 * @param {import('@codemirror/autocomplete').CompletionContext} context
 * @returns {import('@codemirror/autocomplete').CompletionResult | null}
 */
export function jsCompletionSource(context) {
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

