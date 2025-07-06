const {getDefaultConfig} = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Exclude test files from being treated as routes
config.resolver.blacklistRE = /.*\.test\.(js|jsx|ts|tsx)$/;

// Alternative approach - you can also use sourceExts to exclude test files
// config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => !ext.match(/test\.(js|jsx|ts|tsx)$/));

module.exports = config;
