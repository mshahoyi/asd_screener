const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'sql' to asset extensions
config.resolver.sourceExts.push('sql');

// Exclude test files from being treated as routes
config.resolver.blacklistRE = /.*\.test\.(js|jsx|ts|tsx)$/;

module.exports = config;
