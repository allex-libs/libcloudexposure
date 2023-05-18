function createUser2HotelProducer (execlib, templateslib, mylib) {
  'use strict';  

  var produceServiceMixin = require('./serviceproducer')(execlib, templateslib, mylib);

  function produceHotel2Service (desc, code) {
    switch (code) {
      case 'Hotel2ServiceServiceMixin':
        return produceServiceMixin(desc);
      default:
        return {
          ServiceMixin: produceServiceMixin(desc)
        };
    }
  }

  mylib.produceHotel2Service = produceHotel2Service;
}
module.exports = createUser2HotelProducer;