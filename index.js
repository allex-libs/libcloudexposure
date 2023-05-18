function createLib (execlib) {
  'use strict';
  return execlib.loadDependencies('client', ['allex:templateslite:lib', 'allex:arrayoperations:lib', 'allex:lockingjob:lib'], require('./creator').bind(null, execlib));
}
module.exports = createLib;