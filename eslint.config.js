const reactNativeConfig = require('@react-native/eslint-config/flat');

// This project is pure TypeScript (no Flow). Drop the Flow-specific override
// from the upstream flat config: eslint-plugin-ft-flow is incompatible with
// ESLint 9's flat config API and crashes on every plain .js file otherwise.
const withoutFlow = reactNativeConfig.filter(
  entry => !(entry.plugins && entry.plugins['ft-flow']),
);

module.exports = [
  {
    ignores: ['node_modules/**', 'ios/**', 'android/**'],
  },
  ...withoutFlow,
];
