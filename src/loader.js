function setupModuleLoader(window) {
  function ensure(obj, name, factory) {
    return obj[name] || (obj[name] = factory());
  }
  function createModule(name, requires, modules, configFn) {
    function invokeLater(service, method, arrayMethod) {
      return function() {
        var item = [service, method, arguments];
        moduleInstance._invokeQueue[arrayMethod || 'push'](item);
        return moduleInstance;
      };
    }
    if (name === 'hasOwnProperty') {
      throw 'hasOwnProperty is not a valid module name';
    }
    var moduleInstance = {
      name: name,
      requires: requires,
      constant: invokeLater('$provide', 'constant', 'unshift'),
      provider: invokeLater('$provide', 'provider'),
      factory: invokeLater('$provide', 'factory'),
      value: invokeLater('$provide', 'value'),
      service: invokeLater('$provide', 'service'),
      config: invokeLater('$injector', 'invoke'),
      run: function (fn) {
        moduleInstance._runBlocks.push(fn);
        return moduleInstance;
      },
      _invokeQueue: [],
      _runBlocks: []
    };
    if (configFn) {
      moduleInstance.config(configFn);
    }
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
    return function (name, requires, configFn) {
      if (requires) {
        return createModule(name, requires, modules, configFn);
      } else {
        return getModule(name, modules);
      }
    };
  });
}
