function createServiceMixins (execlib, templateslib, lockingjoblib, mylib) {
  'use strict';

  var produceServiceMixin = require('./serviceproducer')(execlib, templateslib, lockingjoblib, mylib);
  var produceUserMixin = require('./userproducer')(execlib, templateslib, mylib);

  function produceService (desc, code, targetservicename) {
    switch (code) {
      case 'ServiceServiceMixin':
        return produceServiceMixin(desc, targetservicename);
      case 'ServiceUserMixin':
        return produceUserMixin(desc, targetservicename);
      default:
        return {
          ServiceMixin: produceServiceMixin(desc, targetservicename),
          UserMixin: produceUserMixin(desc, targetservicename)
        };
    }
  }

  mylib.produceService = produceService;
}
module.exports = createServiceMixins;