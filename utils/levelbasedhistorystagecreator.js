function createLevelBasedHistoryStage (lib, templateslib, arryopslib, mylib) {
  'use strict';

  var HistoryStage = mylib.jobs.HistoryBuilder.HistoryStage;

  function LevelBasedHistoryStage (evnt) {
    HistoryStage.call(this, evnt);
    this.levels = [];
  }
  lib.inherit(LevelBasedHistoryStage, HistoryStage);
  LevelBasedHistoryStage.prototype.destroy = function () {
    this.levels = null;
    HistoryStage.prototype.destroy.call(this);
  };
  LevelBasedHistoryStage.prototype.add = function (evnt) {
    var forlevelname, level;
    if (!evnt) {
      return;
    }
    forlevelname = evnt.forLevel;
    level = arryopslib.findElementWithProperty(this.levels, 'name', forlevelname);
    if (!level) {
      level = new HistoryStage({type: forlevelname, status: evnt.status, timestamp: evnt.timestamp});
      this.levels.push(level);
    }
    level.add(evnt);
  };
  LevelBasedHistoryStage.prototype.endIfNotEnded = function (evnt) {
    if (lib.isArray(this.levels) && this.levels.length>0) {
      this.ended = this.levels[this.levels.length-1].ended;
    }
    if (!this.ended) {
      this.ended = evnt ? evnt.timestamp || 0 : 0;
    }
    this.status = 'done';
  };
  LevelBasedHistoryStage.prototype.toPlain = function () {
    var ret = HistoryStage.prototype.toPlain.call(this);
    ret.levels = lib.isArray(this.levels)
    ?
    this.levels.map(mylib.jobs.toPlainer)
    :
    [];
    return ret;
  };

  function createLevelAwareHistoryStageFactory (levelbasedstagetypesarray) {
    if (!lib.isArrayOfStrings(levelbasedstagetypesarray)) {
      throw new lib.Error('NOT_AN_ARRAY', 'An Array[String] is needed');
    }
    return function LevelAwareHistoryStageFactory (evnt) {
      if (!evnt) { return null; }
      if (levelbasedstagetypesarray.indexOf(evnt.type)<0) {
        return new HistoryStage(evnt);
      }
      return new LevelBasedHistoryStage(evnt);
    };
  }

  mylib.jobs.LevelBasedHistoryStage = LevelBasedHistoryStage;
  mylib.jobs.createLevelAwareHistoryStageFactory = createLevelAwareHistoryStageFactory;
}
module.exports = createLevelBasedHistoryStage;