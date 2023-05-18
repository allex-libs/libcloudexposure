function createUser2HotelProducer (execlib, templateslib, mylib) {
  'use strict';  

  var produceServiceMixin = require('./serviceproducer')(execlib, templateslib, mylib);
  var produceUserMixin = require('./userproducer')(execlib, templateslib, mylib);

  function produceUser2Hotel (desc, code) {
    switch (code) {
      case 'User2HotelServiceMixin':
        return produceServiceMixin(desc);
      case 'User2HotelUserMixin':
        return produceUserMixin(desc);
      default:
        return {
          ServiceMixin: produceServiceMixin(desc),
          UserMixin: produceUserMixin(desc)
        };
    }
  }

  mylib.produceUser2Hotel = produceUser2Hotel;
}
module.exports = createUser2HotelProducer;