module.exports = (api) => {
  // Cache the configuration
  api.cache.using(() => process.env.NODE_ENV);

  return {
    presets: [
      ['@babel/preset-env', {
        targets: {
          node: 'current',
          browsers: ['>0.25%', 'not ie 11', 'not op_mini all'],
        },
        // Use ES modules for Jest
        modules: 'auto',
        // Enable modern JavaScript features
        useBuiltIns: 'usage',
        corejs: 3,
      }],
    ],
    // Add plugins for modern JavaScript features
    plugins: [
      ['@babel/plugin-transform-runtime', {
        corejs: 3,
        regenerator: true,
        useESModules: true
      }]
    ],
  };
};
