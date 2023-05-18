function createUserMixin (execlib, templateslib, mylib) {
  'use strict';

  var lib = execlib.lib;

  function namer (listentoitem) {
    return mylib.utils.quoter(listentoitem.name);
  }

  function produceCtor (desc) {
    var ret;
    var body = templateslib.process({
      template: [
        'ret = function FUNCTIONNAME () {',
        '};',
        'VISIBLEFIELDS'
      ].join('\n'),
      prereplacements: {
        VISIBLEFIELDS: lib.isArray(desc.listento) ? 'ret.visibleStateFields = ['+desc.listento.map(namer).join(', ')+'];' : ''
      },
      replacements: {
        FUNCTIONNAME: desc.name+'UserMixin'
      }
    });
    eval(body);
    return ret;
  }

  function produceDtor (ctor, desc) {
    ctor.prototype.destroy = Function ();
  }

  function produceMethod (mixin, methoddescs, methodname) {
    var methoddescarry = mylib.utils.makeUpDescriptors(methoddescs);
    var funcparams = methoddescarry.map(mylib.utils.parameterProducer);
    var params = funcparams.join(', ');
    funcparams.push('defer');
    eval('mixin.prototype[methodname] = '+templateslib.process({
      template: [
        'function (FUNCTIONPARAMS) {',
        '\tif (!this.__service) {',
        '\t\tdefer.reject(new lib.Error("ALREADY_DESTROYED", "This apartment is already destroyed"));',
        '\t\treturn;',
        '\t}',
        '\tif (!this.__service.destroyed) {',
        '\t\tdefer.reject(new lib.Error("SERVICE_IS_ALREADY_DESTROYED", "This apartment\'s service is already destroyed"));',
        '\t\treturn;',
        '\t}',
        '\texeclib.lib.qlib.promise2defer(this.__service.METHODNAME(PARAMS), defer);',
        '};'
      ].join('\n'),
      replacements: {
        METHODNAME: methodname,
        FUNCTIONPARAMS: funcparams.join(', '),
        PARAMS: params
      }
    }));
    //mixin.prototype[methodname] = Function.apply (null, funcparams);
  }
  function produceUserMixin (desc) {
    var mixin = produceCtor(desc), _mixin = mixin;
    produceDtor(mixin, desc);
    lib.traverseShallow(desc.desc, produceMethod.bind(null, _mixin));
    mylib.utils.produceAddMethods(_mixin, desc);
    _mixin = null;
    return mixin;
  }

  return produceUserMixin;
}
module.exports = createUserMixin;