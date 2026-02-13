// Snippet CRUD module — persists named code snippets in localStorage

const STORAGE_KEY = 'python-playground-snippets';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(snippets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch (err) {
    if (
      err.name === 'QuotaExceededError' ||
      (err instanceof DOMException && err.code === 22)
    ) {
      throw new Error(
        'Storage is full. Delete some snippets to free up space.'
      );
    }
    throw err;
  }
}

/**
 * Save a new snippet or update an existing one with the same name.
 * @param {string} name - Display name for the snippet
 * @param {string} code - The Python source code
 * @returns {object} The saved snippet object
 */
export function saveSnippet(name, code) {
  const snippets = readAll();
  const now = new Date().toISOString();

  // Update existing snippet with the same name
  const existing = snippets.find((s) => s.name === name);
  if (existing) {
    existing.code = code;
    existing.updatedAt = now;
    writeAll(snippets);
    return existing;
  }

  // Create new snippet
  const snippet = {
    id: generateId(),
    name,
    code,
    createdAt: now,
    updatedAt: now,
  };
  snippets.push(snippet);
  writeAll(snippets);
  return snippet;
}

/**
 * Return all saved snippets.
 * @returns {Array<object>} Array of snippet objects
 */
export function loadSnippets() {
  return readAll();
}

/**
 * Load a single snippet by ID.
 * @param {string} id
 * @returns {object|undefined}
 */
export function loadSnippet(id) {
  return readAll().find((s) => s.id === id);
}

/**
 * Delete a snippet by ID.
 * @param {string} id
 */
export function deleteSnippet(id) {
  const snippets = readAll().filter((s) => s.id !== id);
  writeAll(snippets);
}

