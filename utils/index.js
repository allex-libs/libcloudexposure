function createUtils (execlib, templateslib, arrayopslib, outerlib) {
  'use strict';

  var lib = execlib.lib;
  var mylib = {};

  require('./historybuildercreator')(lib, templateslib, arrayopslib, outerlib);
  require('./levelbasedhistorystagecreator')(lib, templateslib, arrayopslib, outerlib);

  function quoter (thingy) {
    return "'"+thingy+"'";
  }
  mylib.quoter = quoter;

  function parameterProducer (methoddesc, index) {
    return 'param' + (index>0 ? index : '');
  }
  mylib.parameterProducer = parameterProducer;

  function makeUpDescriptors (descs) {
    if (!descs) {
      return [];
    }
    if (!lib.isArray(descs)) {
      if (descs.title) {
        return [descs];
      }
      return [];
    }
    return descs;
  }
  mylib.makeUpDescriptors = makeUpDescriptors;

  function serviceInvocationFromDescriptors (descs) {
    if (!descs) {
      return null;
    }
    if (!lib.isArray(descs)) {
      return descs;
    }
    return descs.length>0 ? descs[0] : null;
  }
  mylib.serviceInvocationFromDescriptors = serviceInvocationFromDescriptors;

  function addMethodsMethodProducer (ret, methoddesc, methodname) {
    ret.push('\t\t, '+quoter(methodname));
  }
  function produceAddMethodsMethodsFromServiceListeners (targetservicename, mixinname, res, servicedesc) {
    if (!(servicedesc) && lib.isString(servicedesc.service)) {
      return res;
    }
    if (targetservicename && targetservicename!=servicedesc.service) {
      return res;
    }
    return lib.joinStringsWith(res, quoter('on'+servicedesc.service+'for'+mixinname), '\n\t\t,')
  }
  function produceAddMethodsMethods (desc) {
    return lib.reduceShallow(desc, function (res, val, name) {
      return lib.joinStringsWith(res, quoter(name), '\n\t\t,');
    }, ' ');
  }
  function produceAddMethods (mixin, desc, targetservicename) {
    var descname = desc.name;
    var f = templateslib.process({
      template: [
        "var MIXINNAME = mixin;",
        "MIXINNAME.addMethods = function (klass) {",
        "\tlib.inheritMethods(klass, MIXINNAME",
        "METHODS",
        "\t);",
        "};",
      ].join('\n'),
      replacements: {
        MIXINNAME: mixin.name,
        METHODS: lib.joinStringsWith(
          produceAddMethodsMethods(desc.alldesc||desc.desc),
          (desc.services||[]).reduce(produceAddMethodsMethodsFromServiceListeners.bind(null, targetservicename, descname), ' '),
          '\n'
        )
      }
    });
    targetservicename = null;
    descname = null;
    eval (f);
  }
  mylib.produceAddMethods = produceAddMethods;

  function personalizedHash (hash) {
    var i, arg, phash = {
      gUserId: this.state.get('profile_user_id')
    };
    for (i=1; i<arguments.length; i++) {
      arg = arguments[i];
      phash[arg] = this.state.get('profile_'+arg);
    }
    return lib.extend({}, hash, phash);
  }
  mylib.personalizedHash = personalizedHash;

  outerlib.utils = mylib;
}
module.exports = createUtils;