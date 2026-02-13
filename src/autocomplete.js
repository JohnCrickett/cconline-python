// Custom Python completion source for CodeMirror 6

const PYTHON_KEYWORDS = [
  'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except',
  'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'raise',
  'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'lambda',
  'global', 'nonlocal', 'assert', 'del', 'True', 'False', 'None',
];

const PYTHON_BUILTINS = [
  { label: 'print', info: 'print(*objects, sep=" ", end="\\n")' },
  { label: 'len', info: 'len(s) → int' },
  { label: 'range', info: 'range(stop) or range(start, stop[, step])' },
  { label: 'int', info: 'int(x=0) → integer' },
  { label: 'str', info: 'str(object="") → string' },
  { label: 'list', info: 'list(iterable) → list' },
  { label: 'dict', info: 'dict(**kwargs) → dictionary' },
  { label: 'set', info: 'set(iterable) → set object' },
  { label: 'tuple', info: 'tuple(iterable) → tuple' },
  { label: 'open', info: 'open(file, mode="r") → file object' },
  { label: 'input', info: 'input(prompt="") → string' },
  { label: 'type', info: 'type(object) → type of object' },
  { label: 'isinstance', info: 'isinstance(object, classinfo) → bool' },
  { label: 'enumerate', info: 'enumerate(iterable, start=0)' },
  { label: 'zip', info: 'zip(*iterables) → zip object' },
  { label: 'map', info: 'map(function, iterable) → map object' },
  { label: 'filter', info: 'filter(function, iterable) → filter object' },
  { label: 'sorted', info: 'sorted(iterable, key=None, reverse=False)' },
  { label: 'reversed', info: 'reversed(sequence) → reverse iterator' },
  { label: 'abs', info: 'abs(x) → absolute value' },
  { label: 'min', info: 'min(iterable) or min(a, b, ...)' },
  { label: 'max', info: 'max(iterable) or max(a, b, ...)' },
  { label: 'sum', info: 'sum(iterable, start=0) → number' },
  { label: 'round', info: 'round(number, ndigits=None)' },
  { label: 'any', info: 'any(iterable) → bool' },
  { label: 'all', info: 'all(iterable) → bool' },
  { label: 'hasattr', info: 'hasattr(object, name) → bool' },
  { label: 'getattr', info: 'getattr(object, name[, default])' },
  { label: 'setattr', info: 'setattr(object, name, value)' },
  { label: 'dir', info: 'dir([object]) → list of names' },
  { label: 'help', info: 'help([object]) → interactive help' },
  { label: 'id', info: 'id(object) → integer identity' },
  { label: 'hash', info: 'hash(object) → integer hash' },
  { label: 'repr', info: 'repr(object) → string representation' },
  { label: 'format', info: 'format(value[, format_spec])' },
  { label: 'bool', info: 'bool(x=False) → boolean' },
  { label: 'float', info: 'float(x=0) → floating point' },
  { label: 'complex', info: 'complex(real=0, imag=0)' },
  { label: 'bytes', info: 'bytes(source) → bytes object' },
  { label: 'bytearray', info: 'bytearray(source) → bytearray' },
  { label: 'memoryview', info: 'memoryview(object) → memoryview' },
  { label: 'frozenset', info: 'frozenset(iterable) → frozenset' },
  { label: 'chr', info: 'chr(i) → Unicode character' },
  { label: 'ord', info: 'ord(c) → Unicode code point' },
  { label: 'hex', info: 'hex(x) → hex string' },
  { label: 'oct', info: 'oct(x) → octal string' },
  { label: 'bin', info: 'bin(x) → binary string' },
  { label: 'pow', info: 'pow(base, exp[, mod])' },
  { label: 'divmod', info: 'divmod(a, b) → (quotient, remainder)' },
  { label: 'iter', info: 'iter(object[, sentinel]) → iterator' },
  { label: 'next', info: 'next(iterator[, default])' },
  { label: 'slice', info: 'slice(stop) or slice(start, stop[, step])' },
  { label: 'super', info: 'super() → proxy object' },
  { label: 'property', info: 'property(fget, fset, fdel, doc)' },
  { label: 'staticmethod', info: 'staticmethod(function)' },
  { label: 'classmethod', info: 'classmethod(function)' },
  { label: 'callable', info: 'callable(object) → bool' },
  { label: 'issubclass', info: 'issubclass(cls, classinfo) → bool' },
  { label: 'vars', info: 'vars([object]) → dict of attributes' },
  { label: 'globals', info: 'globals() → dict of global variables' },
  { label: 'locals', info: 'locals() → dict of local variables' },
  { label: 'exec', info: 'exec(code[, globals[, locals]])' },
  { label: 'eval', info: 'eval(expression[, globals[, locals]])' },
  { label: 'compile', info: 'compile(source, filename, mode)' },
];

const STDLIB_MODULES = [
  { label: 'os', info: 'Operating system interfaces' },
  { label: 'sys', info: 'System-specific parameters and functions' },
  { label: 'math', info: 'Mathematical functions' },
  { label: 'random', info: 'Generate pseudo-random numbers' },
  { label: 'json', info: 'JSON encoder and decoder' },
  { label: 're', info: 'Regular expression operations' },
  { label: 'datetime', info: 'Date and time types' },
  { label: 'collections', info: 'Container datatypes' },
  { label: 'itertools', info: 'Iterator building blocks' },
  { label: 'functools', info: 'Higher-order functions and operations' },
  { label: 'pathlib', info: 'Object-oriented filesystem paths' },
  { label: 'io', info: 'Core I/O tools' },
  { label: 'string', info: 'Common string operations' },
  { label: 'typing', info: 'Support for type hints' },
];

// Build the completions list once
const completions = [
  ...PYTHON_KEYWORDS.map((kw) => ({
    label: kw,
    type: 'keyword',
    boost: kw === 'True' || kw === 'False' || kw === 'None' ? -1 : 0,
  })),
  ...PYTHON_BUILTINS.map((b) => ({
    label: b.label,
    type: 'function',
    info: b.info,
  })),
  ...STDLIB_MODULES.map((m) => ({
    label: m.label,
    type: 'module',
    info: m.info,
  })),
];

/**
 * Custom Python completion source for CodeMirror 6.
 * Activates on typing with a minimum prefix of 2 characters.
 * @param {import('@codemirror/autocomplete').CompletionContext} context
 * @returns {import('@codemirror/autocomplete').CompletionResult | null}
 */
export function pythonCompletionSource(context) {
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

