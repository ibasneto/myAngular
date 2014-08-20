/* jshint globalstrict: true */
/* global angular: false */
'use strict';

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG = /^\s*(\S+)\s*$/;

function createInjector(modulesToLoad) {
  function annotate(fn) {
    if (_.isArray(fn)) {
      return fn.slice(0, fn.length - 1);
    } else if (fn.$inject) {
      return fn.$inject;
    } else if (!fn.length) {
      return [];
    } else {
      var argDeclaration = fn.toString().match(FN_ARGS);
      return _.map(argDeclaration[1].split(','), function (argName) {
        return argName.match(FN_ARG)[1];
      });
    }
  }
  function invoke(fn, self, locals) {
    var args = _.map(annotate(fn), function (token) {
      if (_.isString(token)) {
        return locals && locals.hasOwnProperty(token) ?
          locals[token] : cache[token];
      } else {
        throw 'Incorrect injection token! Expected a string, got ' + token;
      }
    });
    return fn.apply(self, args);
  }

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
    annotate: annotate,
    invoke: invoke
  };
}
