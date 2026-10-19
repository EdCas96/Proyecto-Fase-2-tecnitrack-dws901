/**
 * ESLint (configuración plana de ESLint 9): reglas recomendadas más unas pocas
 * de estilo y seguridad. Ejecutar con: npm run lint
 */
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/', 'coverage/', 'docs/fase1/', 'storage/', 'database/*.sql'],
  },
  js.configs.recommended,
  {
    // Servidor (CommonJS)
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Los parámetros sin usar con "_" o "next" son parte de la firma de Express
      'no-unused-vars': ['error', { argsIgnorePattern: '^(_|next$|req$|res$)' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },
  {
    // Scripts del navegador
    files: ['public/js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
  {
    // Mensajes de arranque del servidor y de los scripts de la terminal
    files: ['server.js', 'database/**/*.js', 'middlewares/logger.js'],
    rules: { 'no-console': 'off' },
  },
];
