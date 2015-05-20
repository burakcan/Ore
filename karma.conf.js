module.exports = function(config) {
  config.set({
    basePath: '',

    frameworks: ['browserify', 'mocha', 'chai'],

    files: [ 'test/ore.spec.js' ],

    preprocessors: {
      'test/ore.spec.js': [ 'browserify' ]
    },

    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,

    client: {
      captureConsole: true
    },

    browsers: ['Chrome'],

    singleRun: true
  });
};
