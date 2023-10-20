function createHistoryBuilderJob (lib, templateslib, arryopslib, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    JobBase = qlib.JobBase;

  function HistoryStage (evnt) {
    this.name = evnt.type;
    this.started = evnt.timestamp || Date.now();
    this.ended = null;
    this.status = null;
    this.setStatus(evnt);
  }
  HistoryStage.prototype.destroy = function () {
    this.status = null;
    this.ended = null;
    this.started = null;
    this.name= null;
  };
  HistoryStage.prototype.setStatus = function (evnt) {
    if (!this.ended && evnt.status=='done') {
      this.status = 'done';
      this.ended = evnt.timestamp || Date.now();
      return;
    }
    this.status = 'running';
  };
  HistoryStage.prototype.add = function (evnt) {
    this.setStatus(evnt);
  };
  HistoryStage.prototype.endIfNotEnded = function (evnt) {
    if (!this.ended) {
      this.ended = evnt ? evnt.timestamp || Date.now() : Date.now();
    }
    this.status = 'done';
  };
  HistoryStage.prototype.toPlain = function () {
    return lib.pick(this, this.plainableFields);
  };
  HistoryStage.prototype.plainableFields = ['name', 'status', 'started', 'ended', 'data'];

  function StageFactory (evnt) {
    return new HistoryStage(evnt);
  }

  function HistoryBuilderJob (masterpromise, defer) {
    JobBase.call(this, defer);
    this.masterPromise = masterpromise;
    this.stages = [];
  }
  lib.inherit(HistoryBuilderJob, JobBase);
  HistoryBuilderJob.prototype.destroy = function () {
    this.stages = null;
    this.masterPromise = null;
    JobBase.prototype.destroy.call(this);
  };
  HistoryBuilderJob.prototype.peekToProceed = function () {
    var ret = JobBase.prototype.peekToProceed.call(this);
    if (!(ret && ret.ok)) {
      return ret;
    }
    if (!lib.isFunction(this.StageFactory)) {
      ret.ok = false;
      ret.error = new lib.Error('STAGEFACTORY_NOT_A_FUNCTION', 'StageFactory has to be a (factory) function');
    }
    return ret;
  };
  HistoryBuilderJob.prototype.go = function () {
    var ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    lib.runNext(this.realGo.bind(this));
    return ok.val;
  };
  HistoryBuilderJob.prototype.realGo = function () {
    try {
      this.masterPromise.then(
        this.onSuccess.bind(this),
        this.onFail.bind(this),
        this.onProgress.bind(this)
      );
    }
    catch (e) {
      this.reject(e);
    }
  };
  HistoryBuilderJob.prototype.onSuccess = function (res) {
    this.notify([]);
    this.resolve(res);
  };
  HistoryBuilderJob.prototype.onFail = function (reason) {
    this.notify([]);
    this.reject(reason);
  };
  HistoryBuilderJob.prototype.onProgress = function (prog) {
    if (!(prog && prog.type)) {
      if (this.stages) {
        lib.arryDestroyAll(this.stages);
      }
      this.stages = [];
      return;
    }
    var stage = arryopslib.findElementWithProperty(this.stages, 'name', prog.type);
    if (!stage) {
      this.stages.forEach(function(stage) {stage.endIfNotEnded(prog);});
      stage = this.StageFactory(prog);
      this.stages.push(stage);
    }
    stage.add(prog);
    this.notify(lib.extend({
      stages: this.stages.map(toPlainer)
    }, this.produceNotificationExtras(prog)));
    prog = null;
  };
  HistoryBuilderJob.prototype.ackProgress = function (prog) {};
  HistoryBuilderJob.prototype.produceNotificationExtras = function (prog) {};
  HistoryBuilderJob.prototype.StageFactory = StageFactory;
  HistoryBuilderJob.HistoryStage = HistoryStage;

  function toPlainer(stage) {return stage.toPlain();}

  mylib.jobs = mylib.jobs || {};
  mylib.jobs.toPlainer = toPlainer;
  mylib.jobs.HistoryBuilder = HistoryBuilderJob;

  function buildSimpleHistoryBuilderJobSpecialization (options) {
    var producenotificationextras, classnameprefix, isarry, notificationextras, ret, txt;
    if (!options) {
      return HistoryBuilderJob;
    }
    producenotificationextras = options.producenotificationextras;
    classnameprefix = options.classnameprefix;
    isarry = lib.isArrayOfStrings(producenotificationextras);
    if (!(isarry || lib.isFunction(producenotificationextras))) {
      return HistoryBuilderJob;
    }
    if (isarry) {
      notificationextras = producenotificationextras.slice();
    }
    classnameprefix = classnameprefix || 'My';
    txt = templateslib.process({
      template: [
        'function CLASSNAME (masterpromise, defer) {',
        '\tHistoryBuilderJob.call(this, masterpromise, defer);',
        '}',
        'lib.inherit(CLASSNAME, HistoryBuilderJob);',
        'CLASSNAME.prototype.produceNotificationExtras = EXTRAS;',
        'ret = CLASSNAME;'
      ].join('\n'),
      replacements: {
        CLASSNAME: classnameprefix+'HistoryBuilderJob',
        EXTRAS: lib.isArrayOfStrings(notificationextras)
        ?
        [
        'function (prog) {',
        '\treturn prog',
        '\t?',
        '\tlib.pick(prog, notificationextras)',
        '\t:',
        '\t{}',
        '}'
        ].join('\n')
        :
        'createnotificationextras'
      }
    });
    eval(txt);
    if (lib.isArrayOfStrings(options.levelbasedstages)) {
      ret.prototype.StageFactory = mylib.jobs.createLevelAwareHistoryStageFactory(options.levelbasedstages);
    }
    return ret;
  }
  mylib.jobs.buildSimpleHistoryBuilderJobSpecialization = buildSimpleHistoryBuilderJobSpecialization;
}
module.exports = createHistoryBuilderJob;