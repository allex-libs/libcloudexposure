function createMixinSuiteFrom (execlib, templateslib, lockingjoblib, mylib) {
  'use strict';

  var lib = execlib.lib;

  require('./user2hotel')(execlib, templateslib, mylib);
  require('./hotel2service')(execlib, templateslib, mylib);
  require('./service')(execlib, templateslib, lockingjoblib, mylib);

  function descForUser2Hotel (res, servicedesc) {
    lib.extend(res, servicedesc.desc);
    return res;
  }

  function listenerpicker (thingy) {
    return lib.pickExcept(thingy, ['listener']);
    return thingy.name;
  }

  function listentoForUser2Hotel (res, servicedesc) {
    if (lib.isArray(servicedesc.listeners)) {
      Array.prototype.push.apply(res, servicedesc.listeners.map(listenerpicker))
    }
    return res;
  }

  mylib.mixinSuiteFrom = function (desc, code, targetservicename) {
    var dsrvcs, finaldescs, user2hoteldesc, hotel2servicedesc;
    dsrvcs = desc.services || [];
    finaldescs = dsrvcs.reduce(descForUser2Hotel, {});
    switch (code) {
      case 'User2HotelServiceMixin':
      case 'User2HotelUserMixin':
        user2hoteldesc = {
          name: desc.name,
          desc: finaldescs,
          listento: dsrvcs.reduce(listentoForUser2Hotel, [])
        };
        return mylib.produceUser2Hotel(user2hoteldesc, code)
      case 'Hotel2ServiceServiceMixin':
        hotel2servicedesc = lib.extend({}, desc, {alldesc: finaldescs});
        return mylib.produceHotel2Service(hotel2servicedesc, code);
      case 'ServiceServiceMixin':
      case 'ServiceUserMixin':
          hotel2servicedesc = lib.extend({}, desc, {alldesc: finaldescs});
          return mylib.produceService(hotel2servicedesc, code, targetservicename);
      case 'methoddescriptors':
        dsrvcs = desc.services || [];
        return dsrvcs.reduce(descForUser2Hotel, {});
    }
    user2hoteldesc = {
      name: desc.name,
      desc: finaldescs,
      listento: dsrvcs.reduce(listentoForUser2Hotel, [])
    };
    hotel2servicedesc = lib.extend({}, desc, {alldesc: finaldescs});
    return {
      User2Hotel: mylib.produceUser2Hotel(user2hoteldesc),
      Hotel2Service: mylib.produceHotel2Service(hotel2servicedesc),
      Service: mylib.produceService(hotel2servicedesc, targetservicename),
      methoddescriptors: finaldescs
    }
  };
}
module.exports = createMixinSuiteFrom;