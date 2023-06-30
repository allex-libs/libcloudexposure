function createUserMixin (execlib, templateslib, mylib) {
  'use strict';

  var lib = execlib.lib;

  function serviceMixinCtorListener (listento) {
    return templateslib.process({
      template: "\tthis.LISTENERNAME = this.__hotel.state.data.listenFor('LISTENTO', this.set.bind(this, 'LISTENTO'), true);",
      replacements: {
        LISTENERNAME: listento+'Listener',
        LISTENTO: listento
      }
    });
  }

  function produceCtor (desc) {
    var ret;
    eval('ret = '+templateslib.process({
      template: [
        'function FUNCTIONNAME () {',
        '}'
      ].join('\n'),
      replacements: {
        FUNCTIONNAME: desc.name+'UserMixin',
      }
    }));
    return ret;
  }

  function produceDtor (ctor, desc) {
    ctor.prototype.destroy = Function ();
  }

  function produceMethod (mixin, methoddescs, methodname) {
    var methoddescarry, funcparams, params, svcinvoc, vfindex;
    svcinvoc = mylib.utils.serviceInvocationFromDescriptors(methoddescs);
    if (svcinvoc && svcinvoc.state) {
      mixin.visibleStateFields = mixin.visibleStateFields || [];
      vfindex = mixin.visibleStateFields.indexOf(svcinvoc.state);
      if (vfindex<0) {
        mixin.visibleStateFields.push(svcinvoc.state);
      }
    }
    methoddescarry = mylib.utils.makeUpDescriptors(methoddescs);
    funcparams = methoddescarry.map(mylib.utils.parameterProducer);
    params = funcparams.join(', ');
    funcparams.push('defer');
    eval('mixin.prototype[methodname] = '+templateslib.process({
      template: [
        'function (FUNCTIONPARAMS) {',
        '\tif (!this.__service) {',
        '\t\tdefer.reject(new lib.Error("ALREADY_DESTROYED", "This service is already destroyed"));',
        '\t\treturn;',
        '\t}',
        '\tif (!this.__service.destroyed) {',
        '\t\tdefer.reject(new lib.Error("SERVICE_IS_ALREADY_DESTROYED", "This service\'s service is already destroyed"));',
        '\t\treturn;',
        '\t}',
        '\tthis.__service.METHODNAME(FUNCTIONPARAMS);',
        '};'
      ].join('\n'),
      replacements: {
        METHODNAME: methodname,
        FUNCTIONPARAMS: funcparams.join(', ')
      }
    }));
    //mixin.prototype[methodname] = Function.apply (null, funcparams);
  }
  function produceServiceMethods (targetservicename, mixin, servicedesc) {
    var _mixin;
    if (!servicedesc) {
      return mixin;
    }
    if (targetservicename != servicedesc.service) {
      return mixin;
    }
    _mixin = mixin;
    lib.traverseShallow(servicedesc.desc, produceMethod.bind(null, mixin));
    _mixin = null;
    return mixin;
  }
  function produceUserMixin (desc, targetservicename) {
    var mixin = produceCtor(desc);
    produceDtor(mixin, desc);
    (desc.services||[]).reduce(produceServiceMethods.bind(null, targetservicename), mixin);
    mylib.utils.produceAddMethods(mixin, desc, targetservicename);
    return mixin;
  }

  return produceUserMixin;
}
module.exports = createUserMixin;