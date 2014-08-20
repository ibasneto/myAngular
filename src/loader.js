function setupModuleLoader(window) {
  function ensure(obj, name, factory) {
    return obj[name] || (obj[name] = factory());
  }
  function createModule(name, requires, modules) {
    function invokeLater(method) {
      return function() {
        moduleInstance._invokeQueue.push([method, arguments]);
        return moduleInstance;
      };
    }
    if (name === 'hasOwnProperty') {
      throw 'hasOwnProperty is not a valid module name';
    }
    var moduleInstance = {
      name: name,
      requires: requires,
      constant: invokeLater('constant'),
      provider: invokeLater('provider'),
      _invokeQueue: []
    };
    modules[name] = moduleInstance;
    return moduleInstance;
  }
  function getModule(name, modules) {
    if (modules.hasOwnProperty(name)) {
      return modules[name];
    } else {
      throw 'Module ' + name + ' is not available';
    }
  }
  var angular = ensure(window, 'angular', Object);
  ensure(angular, 'module', function () {
    var modules = {};
    return function (name, requires) {
      if (requires) {
        return createModule(name, requires, modules);
      } else {
        return getModule(name, modules);
      }
    };
  });
}
