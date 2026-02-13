// CodeMirror 6 editor module
import { EditorView, basicSetup } from 'codemirror';
import { python } from '@codemirror/lang-python';
import { go } from '@codemirror/lang-go';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { Compartment } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import { pythonCompletionSource } from './autocomplete.js';
import { goCompletionSource } from './go-autocomplete.js';

let editorView = null;
const themeCompartment = new Compartment();
const languageCompartment = new Compartment();
const autocompleteCompartment = new Compartment();

/**
 * Initialize CodeMirror 6 in the given container element.
 * @param {HTMLElement} container - DOM element to mount the editor in
 * @returns {EditorView} The created editor view
 */
export function initEditor(container) {
  editorView = new EditorView({
    doc: 'print("Hello, World!")',
    extensions: [
      basicSetup,
      languageCompartment.of(python()),
      themeCompartment.of(oneDark),
      keymap.of([indentWithTab]),
      EditorView.lineWrapping,
      autocompleteCompartment.of(autocompletion({ override: [pythonCompletionSource] })),
    ],
    parent: container,
  });

  return editorView;
}

/**
 * Get the current editor content.
 * @returns {string} The current code in the editor
 */
export function getCode() {
  if (!editorView) return '';
  return editorView.state.doc.toString();
}

/**
 * Set the editor content.
 * @param {string} code - The code to set in the editor
 */
export function setCode(code) {
  if (!editorView) return;
  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: code,
    },
  });
}


/**
 * Dynamically swap the CodeMirror theme between dark and light.
 * @param {'dark' | 'light'} themeName
 */
export function setEditorTheme(themeName) {
  if (!editorView) return;
  editorView.dispatch({
    effects: themeCompartment.reconfigure(
      themeName === 'dark' ? oneDark : [],
    ),
  });
}

/**
 * Dynamically swap the CodeMirror language mode and autocomplete source.
 * @param {'python' | 'go'} lang
 */
export function setEditorLanguage(lang) {
  if (!editorView) return;
  editorView.dispatch({
    effects: [
      languageCompartment.reconfigure(lang === 'go' ? go() : python()),
      autocompleteCompartment.reconfigure(
        autocompletion({ override: [lang === 'go' ? goCompletionSource : pythonCompletionSource] })
      ),
    ],
  });
}