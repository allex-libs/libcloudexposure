function createServiceMixin (execlib, templateslib, mylib) {
  'use strict';

  var lib = execlib.lib;
  var q = lib.q;
  var qlib = lib.qlib;
  var execSuite = execlib.execSuite;
  var taskRegistry = execlib.execSuite.taskRegistry;

  function serviceMixinCtorListener (mixinname, srvdesc) {
    var servicename = srvdesc.service;
    var funcname = servicename.toUpperCase();
    var funcpath = servicename.toLowerCase()+'path';
    var nofuncpathcode = 'NO_'+funcname+'_PATH_IN_PROPHASH';
    return templateslib.process({
      template: [
        "\tif (!prophash.FUNCTIONALITYPATH) {",
        "\t\tthrow new lib.Error('NOFUNCPATHCODE', 'Property hash has to have a \"FUNCTIONALITYPATH\" property');",
        "\t}",
        "\tthis.findRemote(prophash.FUNCTIONALITYPATH, null, 'FUNCTIONALITYNAME');",
        "\tthis.state.data.listenFor('FUNCTIONALITYNAME', this.ONNAME.bind(this), true);"
      ].join('\n'),
      replacements: {
        FUNCTIONALITYNAME: funcname,
        FUNCTIONALITYPATH: funcpath,
        NOFUNCPATHCODE: nofuncpathcode,
        ONNAME: 'on'+servicename+'for'+mixinname
      }
    });
  }

  function serviceMixinServiceStateMaterializer (listener) {
    var template = [

    ];
    if (listener.debughotel) {
      template.push(
        "\ttaskRegistry.run('readState', {",
        '\t\tstate: state,',
        "\t\tname: 'STATEPROP',",
        "\t\tcb: console.log.bind(console, 'hotel setting MYSTATENAME to')",
        '\t});'
      );
    }
    template.push(
      "\ttaskRegistry.run('readState', {",
      '\t\tstate: state,',
      "\t\tname: 'STATEPROP',",
      "\t\tcb: this.set.bind(this, 'MYSTATENAME')",
      '\t});'
    );
    return templateslib.process({
      template: template.join('\n'),
      replacements: {
        STATEPROP: listener.state,
        MYSTATENAME: listener.name
      }
    });
  }

  function serviceMixinOnServiceCreator (mixinname, srvdesc) {
    var servicename;
    if (!lib.isArray(srvdesc.listeners)) {
      return '';
    }
    servicename = srvdesc.service;
    return templateslib.process({
      template: [
        'ret.prototype.METHODNAME = function (sink) {',
        '\tvar state;',
        '\tif (!sink) {',
        '\t\treturn;',
        '\t}',
        "\tstate = taskRegistry.run('materializeState', {sink: sink});",
        'READERS',
        '};'
      ].join('\n'),
      replacements: {
        METHODNAME: 'on'+servicename+'for'+mixinname,
        READERS: srvdesc.listeners.map(serviceMixinServiceStateMaterializer)
      }
    });
  }

  function produceServerMixinCtor (desc) {
    var ret;
    var name = desc.name;
    eval('ret = '+templateslib.process({
      template: [
        'function FUNCTIONNAME (prophash) {',
        'LISTENERS',
        '}'
      ].join('\n'),
      replacements: {
        FUNCTIONNAME: desc.name+'ServiceMixin',
        LISTENERS: (desc.services||[]).map(serviceMixinCtorListener.bind(null, name)).join('\n')
      }
    }));
    eval((desc.services||[]).map(serviceMixinOnServiceCreator.bind(null, name)).join('\n'));
    name = null;
    return ret;
  }

  function produceServerMixinDtor (ctor, desc) {
    ctor.prototype.destroy = Function ();
  }

  function produceServerMixinMethod (mixin, servicename, methoddescs, methodname) {
    var methoddescarry = mylib.utils.makeUpDescriptors(methoddescs);
    var funcparams = methoddescarry.map(mylib.utils.parameterProducer);
    var methodparams = ['sink'].concat(funcparams).concat(['defer']);
    var sinkcallparams = ["'"+methodname+"'"].concat(funcparams);
    var params = methoddescarry.join(', ');
    eval('mixin.prototype[methodname] = '+templateslib.process({
      template: [
        "execSuite.dependentServiceMethod([], ['FUNCTIONALITYNAME'], function (METHODPARAMS) {",
        "\tqlib.promise2defer(sink.call(SINKCALLPARAMS), defer);",
        "});"
      ].join('\n'),
      replacements: {
        FUNCTIONALITYNAME: servicename.toUpperCase(),
        METHODNAME: methodname,
        METHODPARAMS: methodparams.join(', '),
        SINKCALLPARAMS: sinkcallparams.join(', '),
        PARAMS: params
      }
    }));
    //mixin.prototype[methodname] = Function.apply (null, funcparams);
  }
  function produceServerMixinMethodForService (mixin, servicedesc) {
    var servicename = servicedesc.service;
    var _mixin = mixin;
    lib.traverseShallow(servicedesc.desc, produceServerMixinMethod.bind(null, _mixin, servicename));
    _mixin = null;
    servicename = null;
  }
  function produceServiceMixin (desc) {
    var mixin = produceServerMixinCtor(desc), _mixin = mixin;
    produceServerMixinDtor(mixin, desc);
    (desc.services||[]).forEach(produceServerMixinMethodForService.bind(null, _mixin));
    mylib.utils.produceAddMethods(mixin, desc);
    _mixin = null;
    return mixin;
  }

  return produceServiceMixin;
}
module.exports = createServiceMixin;