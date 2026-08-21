// metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ─── Firebase v10: Package Exports ────────────────────────────────────────────
// Firebase v10 uses the `exports` field in package.json to serve different
// bundles per environment. Without this, Metro falls back to file-based
// resolution and loads the browser bundle, where `auth` never self-registers.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  'react-native',
  'require',
  'default',
];

// ─── CSS Module Mock ──────────────────────────────────────────────────────────
// Some Expo packages (e.g. @expo/log-box) import .module.css files that Metro
// cannot resolve in a React Native bundle. Redirect all .css imports to an
// empty stub so bundling succeeds.
const CSS_MOCK = path.resolve(__dirname, 'css-mock.js');

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.css')) {
    return { filePath: CSS_MOCK, type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'cjs', 'json'];

module.exports = config;
