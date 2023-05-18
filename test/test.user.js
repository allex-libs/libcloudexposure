function printer (value, name) {
  console.log(name);
  console.log(value);
}

function libTestIt (paramarry) {
  var exposurename = paramarry[0], servicename = paramarry[1];
  it('cloudExposure for '+exposurename, function () {
    this.timeout(1e7);
    var ret = allex_libcloudexposurelib.mixinSuiteFrom(Lib, exposurename, servicename);
    console.log(require('util').inspect(ret, {depth:10}));
    if (lib.isFunction(ret)) {
      console.log(ret.toString());
    }
    if (ret) {
      if (ret.prototype) {
        lib.traverseShallow(ret.prototype, printer);
      }
      if (ret.addMethods) {
        printer (ret.addMethods, 'addMethods');
      }
    }
  })
}
function libTestIts (libname) {
  loadClientSide([libname]);
  it ('set '+libname+' as Lib', function () {
    return setGlobal('Lib', global[libname.replace(/:/, '__').replace(/:/, '')]);
  });
  [
    /*
    ['User2HotelUserMixin'],
    ['User2HotelServiceMixin'],
    ['Hotel2ServiceServiceMixin'],
    ['ServiceUserMixin', 'JsMsSqlFunctionality'],
    */
    ['ServiceServiceMixin', 'JsMsSqlFunctionality'],
    //['methoddescriptors']
  ].forEach(libTestIt)
}

describe('Test User2Hotel', function () {
  loadClientSide(['allex:libcloudexposure:lib']);
  //libTestIts('indata:ipmcloudexposure_ipmcommon:lib');
  //libTestIts('indata:ipmcloudexposure_individualhistory:lib');
  //libTestIts('indata:ipmcloudexposure_compositedetail:lib');
  libTestIts('indata:ipmcloudexposure_compositelookup:lib');
})