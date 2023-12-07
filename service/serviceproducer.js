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
  function jobInvoker (qdesc) {
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
          res.push('reportfailchanger'+index);
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
  function reportFailChangerParamer (param, index, arry) {
    if (index >= arry.length-1) {
      return 'reason';
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
          '\t\ttry{',
          "\t\t\tvar args = Array.prototype.slice.call(arguments).concat([this.state.get('"+state.name+"')]);",
          '\t\t\tvar change = thelib.jobs.JOBCLASS.calculateChange.apply(thelib.jobs.JOBCLASS, args);',
          "\t\t\tif (lib.isVal(change)) { "+(debugjob ? "console.log('setting change', change, 'on state name \""+state.name+"\"'); " : '')+"this.set('"+state.name+"', change); }",
          '\t\t} catch (e) {console.error(e);}',
          '\t};',
          '\tif (!lib.isFunction(thelib.jobs.JOBCLASS.calculateChangeOnFailure)) {',
          '\t\treportfailchanger'+index+' = null',
          '\t}',
          '\treportfailchanger'+index+' = function ('+methodparams.map(reportFailChangerParamer).join(', ')+') {',
          '\t\ttry{',
          "\t\t\tvar args = Array.prototype.slice.call(arguments).concat([this.state.get('"+state.name+"')]);",
          '\t\t\tvar change = thelib.jobs.JOBCLASS.calculateChangeOnFailure.apply(thelib.jobs.JOBCLASS, args);',
          "\t\t\tif (lib.isVal(change)) { "+(debugjob ? "console.log('setting change on failure', change, 'on state name \""+state.name+"\"'); " : '')+"this.set('"+state.name+"', change); }",
          '\t\t} catch (e) {console.error(e);}',
          '\t\tthrow args[args.length-2]',
          '\t};'
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
  //static on service
  function historyBuilderProgresser (statename) {
    console.log('historyBuild progress on', statename, require('util').inspect(arguments[1], {depth:11}));
    this.set.apply(this, Array.prototype.slice.call(arguments));
    console.log('after set,', statename, 'on state', require('util').inspect(this.state.data.get(statename), {depth:11}));
  }
  //endof static on service
  function monitorInvoker (methodparams, debugjob, res, state, index) {
    if (!state) {
      return res;
    }
    switch (state.type) {
      case 'historyBuilder':
        if (debugjob) {
          res.push('new historybuilder'+index+"(promise).go().then(null, null, historyBuilderProgresser.bind(this, '"+state.name+"'));");
        } else {
          res.push('new historybuilder'+index+"(promise).go().then(null, null, this.set.bind(this, '"+state.name+"'));");
        }
        break;
      case 'reportChange':
        res.push(
          (state.blockoriginalresult ? 'promiseresult = ': '')+'promise.then(',
          'reportchanger'+index+'.bind('+methodparams.reduce(reportChangerBinder,['this']).join(', ')+'),',
          'reportfailchanger'+index+' ? reportfailchanger'+index+'.bind('+methodparams.reduce(reportChangerBinder,['this']).join(', ')+') : null',
          ');'
        );
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
  function promiseMonitorInvocation (states, methodparams, debugjob) {
    if (!lib.isArray(states)) {
      return '';
    }
    var invoclines = states.reduce(monitorInvoker.bind(null, methodparams, debugjob), []).join('\n');
    methodparams = null;
    debugjob = null;
    return invoclines;
  }
  function promise2Defer (debugged, methodname) {
    return 'qlib.promise2defer('+(debugged?'qlib.promise2console(':'')+'promiseresult||promise'+(debugged?')':'')+', defer);';
  }
  function produceServerMixinMethod (mixin, servicename, thelib, methoddescs, methodname) {
    var methoddescarry = mylib.utils.makeUpDescriptors(methoddescs);
    var funcparams = methoddescarry.map(mylib.utils.parameterProducer);
    var methodparams = funcparams.concat(['defer']);
    var svcinvoc = mylib.utils.serviceInvocationFromDescriptors(methoddescs);
    var jobparams = svcinvoc ? (svcinvoc.servicefieldspre||[]).map(thiser).concat(funcparams) : funcparams;
    var jobinvocationbody, funcbody, totalbody;
    var debugjob = lib.isArray(methoddescarry) && methoddescarry.length>0 && methoddescarry[0].debugonservice;
    if (!(svcinvoc && svcinvoc.jobclass)) {
      throw new lib.JSONizingError('NO_JOBCLASS_IN_METHODDESCRIPTOR', methoddescs, 'must have a jobclass');
    }
    try {
      jobinvocationbody = jobInvoker(svcinvoc.q);
    } catch (e) {
      throw new lib.JSONizingError(e.message, methoddescs, 'Invalid q descriptor');
    }
    funcbody = templateslib.process({
      template: [
        "MONITORLINES",
        '\tfunction METHODNAME (METHODPARAMS) {',
        '\t\tvar job = new thelib.jobs.JOBCLASS(JOBPARAMS);',
        "\t\tPROMISEPRODUCTIONLINE",
        "\t\tPROMISERETURNERPRODUCTIONLINE",
        "\t\tPROMISEINVOCATIONLINES",
        "\t\tLINKINGLINE",
        "\t};"
      ].join('\n'),
      replacements: {
        MONITORLINES: promiseMonitors(svcinvoc.states, methodparams, debugjob),
        METHODNAME: methodname,
        METHODPARAMS: methodparams.join(', '),
        JOBCLASS: svcinvoc.jobclass,
        JOBPARAMS: jobparams.join(', '),
        PROMISEPRODUCTIONLINE: 'var promise = '+jobinvocationbody+';',
        PROMISERETURNERPRODUCTIONLINE: 'var promiseresult;',
        PROMISEINVOCATIONLINES: promiseMonitorInvocation(svcinvoc.states, methodparams, debugjob),
        LINKINGLINE: promise2Defer(debugjob, methodname)
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