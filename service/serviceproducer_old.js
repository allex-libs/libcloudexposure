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
  function produceServerMixinMethod (mixin, servicename, thelib, methoddescs, methodname) {
    var methoddescarry = mylib.utils.makeUpDescriptors(methoddescs);
    var funcparams = methoddescarry.map(mylib.utils.parameterProducer);
    var methodparams = funcparams.concat(['defer']);
    var svcinvoc = mylib.utils.serviceInvocationFromDescriptors(methoddescs);
    var jobparams = svcinvoc ? (svcinvoc.servicefieldspre||[]).map(thiser).concat(methodparams) : methodparams;
    var jobinvocationbody, historycheckerbody, funcbody, totalbody;
    var debugjob = false; //TODO: come up with a proper methoddesc prop for this
    if (!(svcinvoc && svcinvoc.jobclass)) {
      throw new lib.JSONizingError('NO_JOBCLASS_IN_METHODDESCRIPTOR', methoddescs, 'must have a jobclass');
    }
    historycheckerbody = (svcinvoc && svcinvoc.state) ?
    templateslib.process({
      template: [
        '\tvar historymonitor, historybuilder;',
        '\tif (lib.isFunction(thelib.jobs.JOBCLASS.createHistoryBuilder)) {',
        '\t\thistorybuilder = thelib.jobs.JOBCLASS.createHistoryBuilder(mylib.jobs)',
        '\t\thistorymonitor = function (promise) { return (new historybuilder(promise).go()); }',
        '\t}'
      ].join('\n'),
      replacements: {
        JOBCLASS: svcinvoc.jobclass
      }
    })
    :
    '';
    try {
      jobinvocationbody = jobInvocator(svcinvoc.q);
    } catch (e) {
      throw new lib.JSONizingError(e.message, methoddescs, 'Invalid q descriptor');
    }
    funcbody = templateslib.process({
      template: [
        "HISTORYCHECKER",
        '\tfunction METHODNAME (METHODPARAMS) {',
        '\t\tvar job = new thelib.jobs.JOBCLASS(JOBPARAMS);',
        "\t\tTHELINE",
        "\t};"
      ].join('\n'),
      replacements: {
        METHODNAME: methodname,
        METHODPARAMS: methodparams.join(', '),
        JOBCLASS: svcinvoc.jobclass,
        JOBPARAMS: jobparams.join(', '),
        HISTORYCHECKER: historycheckerbody,
        THELINE: 'return '+(debugjob ? 'qlib.promise2console(' : '')+ (
          historycheckerbody ?
            'historymonitor('+jobinvocationbody+')'+".then(null, null, this.set.bind(this, '"+svcinvoc.state+"'))"
            :
            jobinvocationbody
        )+(debugjob ? ", '"+methodname+"')" : '')+';'
      }
    });
    totalbody = 'mixin.prototype[methodname] = (function (lib, qlib, lockingjoblib, thelib) {\n'+funcbody+'\n\treturn '+methodname+';\n})(lib, qlib, lockingjoblib, thelib);';
    eval(totalbody);
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