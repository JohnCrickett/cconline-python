// Custom Go completion source for CodeMirror 6

const GO_KEYWORDS = [
  'func', 'package', 'import', 'var', 'const', 'type', 'struct', 'interface',
  'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default',
  'defer', 'go', 'select', 'chan', 'map', 'make', 'len', 'cap', 'append',
  'copy', 'delete', 'new', 'panic', 'recover', 'close', 'true', 'false',
  'nil', 'iota', 'break', 'continue', 'fallthrough', 'goto',
];

const GO_BUILTINS = [
  { label: 'fmt.Println', info: 'fmt.Println(a ...any) (n int, err error)' },
  { label: 'fmt.Printf', info: 'fmt.Printf(format string, a ...any) (n int, err error)' },
  { label: 'fmt.Sprintf', info: 'fmt.Sprintf(format string, a ...any) string' },
  { label: 'make', info: 'make(t Type, size ...IntegerType) Type' },
  { label: 'len', info: 'len(v Type) int' },
  { label: 'cap', info: 'cap(v Type) int' },
  { label: 'append', info: 'append(slice []Type, elems ...Type) []Type' },
  { label: 'copy', info: 'copy(dst, src []Type) int' },
  { label: 'delete', info: 'delete(m map[Type]Type1, key Type)' },
  { label: 'new', info: 'new(Type) *Type' },
  { label: 'panic', info: 'panic(v any)' },
  { label: 'recover', info: 'recover() any' },
  { label: 'close', info: 'close(c chan<- Type)' },
  { label: 'print', info: 'print(args ...Type)' },
  { label: 'println', info: 'println(args ...Type)' },
  { label: 'error', info: 'error interface { Error() string }' },
];

const STDLIB_PACKAGES = [
  { label: 'fmt', info: 'Formatted I/O with functions analogous to C\'s printf and scanf' },
  { label: 'strings', info: 'Functions to manipulate UTF-8 encoded strings' },
  { label: 'strconv', info: 'Conversions to and from string representations of basic data types' },
  { label: 'math', info: 'Basic constants and mathematical functions' },
  { label: 'sort', info: 'Primitives for sorting slices and user-defined collections' },
  { label: 'errors', info: 'Functions to manipulate errors' },
  { label: 'io', info: 'Basic interfaces to I/O primitives' },
  { label: 'os', info: 'Platform-independent interface to operating system functionality' },
  { label: 'time', info: 'Functionality for measuring and displaying time' },
  { label: 'regexp', info: 'Regular expression search' },
  { label: 'bytes', info: 'Functions for the manipulation of byte slices' },
  { label: 'bufio', info: 'Buffered I/O' },
  { label: 'log', info: 'Simple logging package' },
  { label: 'sync', info: 'Basic synchronization primitives' },
  { label: 'context', info: 'Carries deadlines, cancellation signals, and request-scoped values' },
  { label: 'encoding/json', info: 'Encoding and decoding of JSON' },
  { label: 'net/http', info: 'HTTP client and server implementations' },
  { label: 'math/rand', info: 'Pseudo-random number generators' },
];

// Build the completions list once
const completions = [
  ...GO_KEYWORDS.map((kw) => ({
    label: kw,
    type: 'keyword',
    boost: kw === 'true' || kw === 'false' || kw === 'nil' ? -1 : 0,
  })),
  ...GO_BUILTINS.map((b) => ({
    label: b.label,
    type: 'function',
    info: b.info,
  })),
  ...STDLIB_PACKAGES.map((p) => ({
    label: p.label,
    type: 'module',
    info: p.info,
  })),
];

/**
 * Custom Go completion source for CodeMirror 6.
 * Activates on typing with a minimum prefix of 2 characters.
 * @param {import('@codemirror/autocomplete').CompletionContext} context
 * @returns {import('@codemirror/autocomplete').CompletionResult | null}
 */
export function goCompletionSource(context) {
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

