(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function createMixinSuiteFrom (execlib, mylib) {
  'use strict';

  var lib = execlib.lib;

  function descForUser2Hotel (res, servicedesc) {
    lib.extend(res, servicedesc.desc);
    return res;
  }

  mylib.mixinSuiteFrom = function (desc, code) {
    var dsrvcs, finaldescs;
    dsrvcs = desc.services || [];
    finaldescs = dsrvcs.reduce(descForUser2Hotel, {});
    switch (code) {
      case 'methoddescriptors':
        return dsrvcs.reduce(descForUser2Hotel, {});
    }
    return finaldescs;
  };
}
module.exports = createMixinSuiteFrom;
},{}],2:[function(require,module,exports){
(function createLib (execlib) {
  'use strict';

  var lR = execlib.execSuite.libRegistry;
  var mylib = {};

  require('./mixinsuitecreatorweb')(execlib, mylib);

  lR.register('allex_libcloudexposurelib', {
    mixinSuiteFrom: mylib.mixinSuiteFrom
  });
})(ALLEX);

},{"./mixinsuitecreatorweb":1}]},{},[2]);
