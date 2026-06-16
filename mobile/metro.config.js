// Metro config so the app can import framework-agnostic code from the repo's
// top-level ../shared directory (shared with the web client). Metro only
// bundles files inside the project root by default, so ../shared must be added
// to `watchFolders`, and the `@shared` alias is mapped to it.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@shared': sharedRoot,
};

module.exports = config;
