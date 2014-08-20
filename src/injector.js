/* jshint globalstrict: true */
/* global angular: false */
'use strict';

function createInjector(modulesToLoad) {
  var cache = {};
  var loadedModules = {};
  var $provide = {
    constant: function (key, value) {
      if (key === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid constant name!';
      }
      cache[key] = value;
    }
  };
  _.forEach(modulesToLoad, function loadModule(moduleName) {
    if (!loadedModules.hasOwnProperty(moduleName)) {
      loadedModules[moduleName] = true;
      var module = angular.module(moduleName);
      _.forEach(module.requires, loadModule);
      _.forEach(module._invokeQueue, function (invokeArgs) {
        $provide[invokeArgs[0]].apply($provide, invokeArgs[1]);
      });
    }
  });
  return {
    has: function (key) {
      return cache.hasOwnProperty(key);
    },
    get: function (key) { 
      return cache[key];
    },
    invoke: function (fn, self, locals) {
      var args = _.map(fn.$inject, function (token) {
        if (_.isString(token)) {
          return locals && locals.hasOwnProperty(token) ?
            locals[token] : cache[token];
        } else {
          throw 'Incorrect injection token! Expected a string, got ' + token;
        }
      });
      return fn.apply(self, args);
    }
  };
}
