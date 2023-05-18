function createServiceMixin (execlib, templateslib, mylib) {
  'use strict';

  var lib = execlib.lib;
  var q = lib.q;

  function serviceMixinCtorListener (listento) {
    var lines, ret;
    lines = listento.debuguserservice
      ?
      [
        "\tfunction DEBUGSETTER (thingy) {",
        "\t\tconsole.log('setting', thingy, 'as LISTENTO');",
        "\t\tthis.set('LISTENTO', thingy);",
        "\t}",
        "\tthis.LISTENERNAME = this.__hotel.state.data.listenFor('LISTENTO', DEBUGSETTER.bind(this), true);",
        "\tconsole.log('Listener LISTENERNAME set for LISTENTO');"
      ]
      :
      [
        "\tthis.LISTENERNAME = this.__hotel.state.data.listenFor('LISTENTO', this.set.bind(this, 'LISTENTO'), true);"
      ]
    ret = templateslib.process({
      template: lines.join('\n'),
      replacements: {
        LISTENERNAME: listento.name+'Listener',
        LISTENTO: listento.name,
        DEBUGSETTER: listento.name+'DebugSetter'
      }
    });
    return ret;
  }

  function produceServerMixinCtor (desc) {
    var ret;
    eval('ret = '+templateslib.process({
      template: [
        'function FUNCTIONNAME () {',
        'LISTENERS',
        '}'
      ].join('\n'),
      replacements: {
        FUNCTIONNAME: desc.name+'ServiceMixin',
        LISTENERS: (desc.listento||[]).map(serviceMixinCtorListener).join('\n')
      }
    }));
    return ret;
  }

  function serviceMixinListenerCleaner (listento) {
    return templateslib.process({
      template: [
        "\tif (this.LISTENERNAME) {",
        "\t\tthis.LISTENERNAME.destroy();",
        "\t}",
        "\tthis.LISTENERNAME = null;"
      ].join('\n'),
      replacements: {
        LISTENERNAME: listento.name+'Listener'
      }
    });
  }

  function produceServerMixinDtor (ctor, desc) {
    ctor.prototype.destroy = Function (templateslib.process({
      template: 'LISTENERDESTRUCTORS',
      replacements: {
        LISTENERDESTRUCTORS: (desc.listento||[]).map(serviceMixinListenerCleaner).join('\n')
      }
    }));
  }

  function maybePersonalize(methoddesc, index) {
    var personalizeparams = [];
    var paramname = mylib.utils.parameterProducer(methoddesc, index);
    if (!(methoddesc && methoddesc.personalize)) {
      return paramname;
    }
    personalizeparams.push(paramname);
    if (lib.isArrayOfStrings(methoddesc.personalize)) {
      Array.prototype.push.apply(personalizeparams, methoddesc.personalize.map(mylib.utils.quoter));
    }
    return 'this.personalizedHash('+personalizeparams.join(', ')+')';
  }
  function produceServerMixinMethod (mixin, methoddescs, methodname) {
    var methoddescarry = mylib.utils.makeUpDescriptors(methoddescs);
    var funcparams = methoddescarry.map(mylib.utils.parameterProducer);
    var params = methoddescarry.map(maybePersonalize).join(', ');
    eval('mixin.prototype[methodname] = '+templateslib.process({
      template: [
        'function (FUNCPARAMS) {',
        '\tif (!this.__hotel) {',
        '\t\treturn q.reject(new lib.Error("NO_HOTEL", "This apartment has no hotel at this time"));',
        '\t}',
        '\treturn this.__hotel.METHODNAME(PARAMS);',
        '};'
      ].join('\n'),
      replacements: {
        METHODNAME: methodname,
        FUNCPARAMS: funcparams.join(', '),
        PARAMS: params
      }
    }));
    //mixin.prototype[methodname] = Function.apply (null, funcparams);
  }
  function produceServiceMixin (desc) {
    var mixin = produceServerMixinCtor(desc), _mixin = mixin;
    produceServerMixinDtor(mixin, desc);
    lib.traverseShallow(desc.desc, produceServerMixinMethod.bind(null, _mixin));
    mylib.utils.produceAddMethods(_mixin, desc);
    _mixin = null;
    return mixin;
  }

  return produceServiceMixin;
}
module.exports = createServiceMixin;