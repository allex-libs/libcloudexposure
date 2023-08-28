function createServiceMixin (execlib, templateslib, lockingjoblib, mylib) {
  'use strict';

  var lib = execlib.lib;
  var q = lib.q;
  var qlib = lib.qlib;
  var execSuite = execlib.execSuite;
  var taskRegistry = execlib.execSuite.taskRegistry;

  function produceServerMixinCtor (desc) {
    var ret;
    eval('ret = '+templateslib.process({
      template: [
        'function FUNCTIONNAME () {',
        '}'
      ].join('\n'),
      replacements: {
        FUNCTIONNAME: desc.name+'ServiceMixin'
      }
    }));
    return ret;
  }

  function produceServerMixinDtor (ctor, desc) {
    ctor.prototype.destroy = Function ();
  }

  function thiser (thingy) {
    return 'this.'+thingy;
  }
  function jobInvocator (qdesc) {
    if (!qdesc) {
      return 'job.go()';
    }
    if (lib.isString(qdesc) && qdesc) {
      return "this.jobs.run('"+qdesc+"', job)";
    }
    if (lib.isString(qdesc.q) && qdesc.q && qdesc.locked) {
      return "lockingjoblib.runLockedOn(this.jobs, '"+qdesc.q+"', job)";
    }
    throw new Error('QUEUE_DESCRIPTOR_STRUCTURE_NOT_SUPPORTED');
  }
  function monitorVarer (res, state, index) {
    if (!state) {
      return res;
    }
    switch (state.type) {
      case 'historyBuilder':
        res.push('historybuilder'+index);
        break;
        case 'reportChange':
          res.push('reportchanger'+index);
          break;
      }
    return res;
  }
  function reportChangerParamer (param, index, arry) {
    if (index >= arry.length-1) {
      return 'res';
    }
    return param;
  }
  function monitorFunctioner (methodparams, debugjob, res, state, index) {
    if (!state) {
      return res;
    }
    switch (state.type) {
      case 'historyBuilder':
        res.push(
          '\tif (!lib.isFunction(thelib.jobs.JOBCLASS.createHistoryBuilder)) {',
          "\t\tthrow new lib.Error('NO_HISTORYBUILDERCREATOR', 'Job JOBCLASS must have a static method named createHistoryBuilder');",
          '\t}',
          '\thistorybuilder'+index+' = thelib.jobs.JOBCLASS.createHistoryBuilder(mylib.jobs);'
        );
        break;
      case 'reportChange':
        res.push(
          '\tif (!lib.isFunction(thelib.jobs.JOBCLASS.calculateChange)) {',
          "\t\tthrow new lib.Error('NO_CHANGECALCULATOR', 'Job JOBCLASS must have a static method named calculateChange');",
          '\t}',
          '\treportchanger'+index+' = function ('+methodparams.map(reportChangerParamer).join(', ')+') {',
          '\t\tvar change = thelib.jobs.JOBCLASS.calculateChange.apply(null, arguments);',
          "debugger;",
          "\t\tif (lib.isVal(change)) { "+(debugjob ? "console.log('setting change', change, 'on state name \""+state.name+"\"'); " : '')+"this.set('"+state.name+"', change); }",
          '\t}',
        );
        break;
    }
    return res;
  }
  function reportChangerBinder (res, param, index, arry) {
    if (index >= arry.length-1) {
      return res;
    }
    res.push(param);
    return res;
  }
  function monitorInvoker (methodparams, res, state, index) {
    if (!state) {
      return res;
    }
    switch (state.type) {
      case 'historyBuilder':
        res.push('new historybuilder'+index+"(promise).go().then(null, null, this.set.bind(this, '"+state.name+"'));");
        break;
      case 'reportChange':
        res.push('promise.then(reportchanger'+index+'.bind('+methodparams.reduce(reportChangerBinder,['this']).join(', ')+'));');
        break;
    }
    return res;
  }
  function promiseMonitors (states, methodparams, debugjob) {
    if (!lib.isArray(states)) {
      return '';
    }
    var varlines, funclines, ret;
    varlines = states.reduce(monitorVarer, []).join(', ');
    funclines = states.reduce(monitorFunctioner.bind(null, methodparams, debugjob), []).join('\n');
    methodparams = null;
    debugjob = null;
    ret = [];
    if (varlines && funclines) {
      varlines = '\tvar '+varlines+';'
      ret.push(varlines);
      ret.push(funclines);
    }
    return ret.join('\n');
  }
  function promiseMonitorInvocation (states, methodparams) {
    if (!lib.isArray(states)) {
      return '';
    }
    var invoclines = states.reduce(monitorInvoker.bind(null, methodparams), []).join('\n');
    methodparams = null;
    return invoclines;
  }
  function debuggedOrNot (debugged, methodname) {
    if (!debugged) {
      return 'return promise;'
    }
    return "return qlib.promise2console(promise, '"+methodname+"');";
  }
  function produceServerMixinMethod (mixin, servicename, thelib, methoddescs, methodname) {
    var methoddescarry = mylib.utils.makeUpDescriptors(methoddescs);
    var funcparams = methoddescarry.map(mylib.utils.parameterProducer);
    var methodparams = funcparams.concat(['defer']);
    var svcinvoc = mylib.utils.serviceInvocationFromDescriptors(methoddescs);
    var jobparams = svcinvoc ? (svcinvoc.servicefieldspre||[]).map(thiser).concat(methodparams) : methodparams;
    var jobinvocationbody, funcbody, totalbody;
    var debugjob = lib.isArray(methoddescarry) && methoddescarry.length>0 && methoddescarry[0].debugonservice;
    if (!(svcinvoc && svcinvoc.jobclass)) {
      throw new lib.JSONizingError('NO_JOBCLASS_IN_METHODDESCRIPTOR', methoddescs, 'must have a jobclass');
    }
    try {
      jobinvocationbody = jobInvocator(svcinvoc.q);
    } catch (e) {
      throw new lib.JSONizingError(e.message, methoddescs, 'Invalid q descriptor');
    }
    funcbody = templateslib.process({
      template: [
        "MONITORLINES",
        '\tfunction METHODNAME (METHODPARAMS) {',
        '\t\tvar job = new thelib.jobs.JOBCLASS(JOBPARAMS);',
        "\t\tPROMISEPRODUCTIONLINE",
        "\t\tPROMISEINVOCATIONLINES",
        "\t\tRETURNLINE",
        "\t};"
      ].join('\n'),
      replacements: {
        MONITORLINES: promiseMonitors(svcinvoc.states, methodparams, debugjob),
        METHODNAME: methodname,
        METHODPARAMS: methodparams.join(', '),
        JOBCLASS: svcinvoc.jobclass,
        JOBPARAMS: jobparams.join(', '),
        PROMISEPRODUCTIONLINE: 'var promise = '+jobinvocationbody+';',
        PROMISEINVOCATIONLINES: promiseMonitorInvocation(svcinvoc.states, methodparams),
        RETURNLINE: debuggedOrNot(debugjob, methodname)
      }
    });
    totalbody = 'mixin.prototype[methodname] = (function (lib, qlib, lockingjoblib, thelib) {\n'+funcbody+'\n\treturn '+methodname+';\n})(lib, qlib, lockingjoblib, thelib);';
    try {
      eval(totalbody);
    } catch (e) {
      console.error(totalbody);
      throw e;
    }
  }
  function produceServerMixinMethodForService (targetservicename, thelib, mixin, servicedesc) {
    var servicename = servicedesc.service;
    if (targetservicename != servicename) {
      return mixin;
    }
    var _mixin = mixin;
    lib.traverseShallow(servicedesc.desc, produceServerMixinMethod.bind(null, _mixin, servicename, thelib));
    _mixin = null;
    servicename = null;
    thelib = null;
    return mixin;
  }
  function produceServiceMixin (desc, targetservicename) {
    var mixin = produceServerMixinCtor(desc);
    var thelib = desc.thelib;
    produceServerMixinDtor(mixin, desc);
    (desc.services||[]).reduce(produceServerMixinMethodForService.bind(null, targetservicename, thelib), mixin);
    mylib.utils.produceAddMethods(mixin, desc, targetservicename);
    targetservicename = null;
    thelib = null;
    return mixin;
  }

  return produceServiceMixin;
}
module.exports = createServiceMixin;