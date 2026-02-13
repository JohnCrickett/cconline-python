// CodeMirror 6 editor module
import { EditorView, basicSetup } from 'codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';

let editorView = null;

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
      python(),
      oneDark,
      keymap.of([indentWithTab]),
      EditorView.lineWrapping,
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

