(function createLib (execlib) {
  'use strict';

  var lR = execlib.execSuite.libRegistry;
  var mylib = {};

  require('./mixinsuitecreatorweb')(execlib, mylib);

  lR.register('allex_libcloudexposurelib', {
    mixinSuiteFrom: mylib.mixinSuiteFrom
  });
})(ALLEX);
