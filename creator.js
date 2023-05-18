function createLib (execlib, templateslib, arrayopslib, lockingjoblib) {
  'use strict';

  var mylib = {};

  require('./utils')(execlib, templateslib, arrayopslib, mylib);
  require('./mixinsuitecreator')(execlib, templateslib, lockingjoblib, mylib);

  mylib.addMethodsToApartmentService = function (klass) {
    if (klass && klass.prototype) {
      klass.prototype.personalizedHash = mylib.utils.personalizedHash;
    }
  };

  return {
    mixinSuiteFrom: mylib.mixinSuiteFrom,
    addMethodsToApartmentService: mylib.addMethodsToApartmentService
  };
}
module.exports = createLib;