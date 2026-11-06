// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // react-three-fiber: <mesh position=… args=…> sind keine unbekannten DOM-Eigenschaften
    files: ['components/game/**/*.tsx'],
    rules: { 'react/no-unknown-property': 'off' },
  },
]);
