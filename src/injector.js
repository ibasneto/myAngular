/* jshint globalstrict: true */
/* global angular: false */
'use strict';

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;
var INSTANTIATING = {};

function createInjector(modulesToLoad) {
  function annotate(fn) {
    if (_.isArray(fn)) {
      return fn.slice(0, fn.length - 1);
    } else if (fn.$inject) {
      return fn.$inject;
    } else if (!fn.length) {
      return [];
    } else {
      var source = fn.toString().replace(STRIP_COMMENTS, '');
      var argDeclaration = source.match(FN_ARGS);
      return _.map(argDeclaration[1].split(','), function (argName) {
        return argName.match(FN_ARG)[2];
      });
    }
  }
  function invoke(fn, self, locals) {
    var args = _.map(annotate(fn), function (token) {
      if (_.isString(token)) {
        return locals && locals.hasOwnProperty(token) ?
          locals[token] : getService(token);
      } else {
        throw 'Incorrect injection token! Expected a string, got ' + token;
      }
    });
    if (_.isArray(fn)) {
      fn = _.last(fn);
    }
    return fn.apply(self, args);
  }
  function instantiate(Type, locals) {
    var UnwrappedType = _.isArray(Type) ? _.last(Type) : Type;
    var instance = Object.create(UnwrappedType.prototype);
    invoke(Type, instance, locals);
    return instance;
  }
  function getService(name) {
    if (instanceCache.hasOwnProperty(name)) {
      if (instanceCache[name] === INSTANTIATING) {
        path.unshift(name);
        throw new Error('Circular dependency found: ' + path.join(' <- '));
      }
      return instanceCache[name];
    } else if (providerCache.hasOwnProperty(name)) {
      return providerCache[name];
    } else if (providerCache.hasOwnProperty(name + 'Provider')) {
      path.unshift(name);
      instanceCache[name] = INSTANTIATING;
      try {
        var provider = providerCache[name + 'Provider'];
        var instance = instanceCache[name] = invoke(provider.$get, provider);
        return instance;
      } finally {
        path.shift();
        if (instanceCache[name] === INSTANTIATING) {
          delete instanceCache[name];
        }
      }
    }
  }

  var providerCache = {};
  var instanceCache = {};
  var loadedModules = {};
  var path = [];
  var $provide = {
    constant: function (key, value) {
      if (key === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid constant name!';
      }
      instanceCache[key] = value;
    },
    provider: function (key, provider) {
      if (_.isFunction(provider)) {
        provider = instantiate(provider);
      }
      providerCache[key + 'Provider'] = provider;
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
      return instanceCache.hasOwnProperty(key) || providerCache.hasOwnProperty(key + 'Provider');
    },
    get: getService,
    annotate: annotate,
    invoke: invoke,
    instantiate: instantiate
  };
}
