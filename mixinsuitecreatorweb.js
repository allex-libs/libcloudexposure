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