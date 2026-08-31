import js from '@eslint/js';

// Two separate rule sets because this project has two runtime environments
// sharing one repo: public/js runs in the browser, server/ runs in Node.
// Mixing their globals together would let a browser file reference `window`
// from Node code, or a server file reference `document`, without either
// mistake ever getting flagged.
const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  history: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  AbortController: 'readonly',
  ResizeObserver: 'readonly',
  Blob: 'readonly',
  Event: 'readonly',
  CSS: 'readonly',
  requestAnimationFrame: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
};

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  AbortController: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
};

// These match how the codebase already writes JavaScript. The goal is to
// catch a file quietly drifting away from that over time, not to force a
// rewrite of code that already follows it.
const sharedRules = {
  ...js.configs.recommended.rules,
  // "== null" and "!= null" are still allowed on purpose: that is the normal
  // way to check for both null and undefined in one step, and several files
  // already rely on it.
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
};

export default [
  {
    files: ['public/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: sharedRules,
  },
  {
    files: ['server/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: sharedRules,
  },
];
