/* jshint globalstrict: true */
'use strict';

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
  this.$$asyncQueue = [];
  this.$$phase = null;
  this.$$postDigestQueue = [];
}
function initWatchVal() {}
Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
  var self = this;
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function () {},
    last: initWatchVal,
    valueEq: !!valueEq
  };
  self.$$watchers.unshift(watcher);
  self.$$lastDirtyWatch = null;
  return function () {
    var index = self.$$watchers.indexOf(watcher);
    if (index >= 0) {
      self.$$watchers.splice(index, 1);
      self.$$lastDirtyWatch = null;
    }
  };
};
Scope.prototype.$digest = function () {
  var dirty, ttl = 10;
  this.$$lastDirtyWatch = null;
  this.$beginPhase('$digest');
  do {
    while(this.$$asyncQueue.length) {
      try {
      var asyncTask = this.$$asyncQueue.shift();
      asyncTask.scope.$eval(asyncTask.expression);
      } catch(e) {
        console.error(e);
      }
    }
    dirty = this.$$digestOnce();
    if ((dirty || this.$$asyncQueue.length) && ttl-- === 0) {
      this.$clearPhase();
      throw '10 digest iterations reached';
    }
  } while(dirty || this.$$asyncQueue.length);
  while(this.$$postDigestQueue.length) {
    try {
      this.$$postDigestQueue.shift()();
    } catch(e) {
      console.error(e);
    }
  }
  this.$clearPhase();
};
Scope.prototype.$$digestOnce = function () {
  var self = this, dirty = false;
  var newValue, oldValue;
  _.forEachRight(this.$$watchers, function (watcher) {
    try {
      if (watcher) {
        newValue = watcher.watchFn(self);
        oldValue = watcher.last;
        if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
          self.$$lastDirtyWatch = watcher;
          watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
          if (oldValue === initWatchVal) {
            oldValue = newValue;
          }
          watcher.listenerFn(newValue, oldValue, self);
          dirty = true;
        } else if (self.$$lastDirtyWatch === watcher) {
          return false;
        }
      }
    } catch(e) {
      console.error(e);
    }
  });
  return dirty;
};
Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue || (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));
  }
};
Scope.prototype.$eval = function (expr, locals) {
  return expr(this, locals);
};
Scope.prototype.$apply = function (expr) {
  try {
    this.$beginPhase('$apply');
    return this.$eval(expr);
  } finally {
    this.$clearPhase();
    this.$digest();
  }
};
Scope.prototype.$evalAsync = function (expr) {
  var self = this;
  if (!self.$$phase && !self.$$asyncQueue.length) {
    setTimeout(function () {
      if (self.$$asyncQueue.length) {
        self.$digest();
      }
      self.$digest();
    }, 0);
  }
  self.$$asyncQueue.push({scope: this, expression: expr});
};
Scope.prototype.$beginPhase = function (phase) {
  if (this.$$phase) {
    throw this.$$phase + ' already in progress.';
  }
  this.$$phase = phase;
};
Scope.prototype.$clearPhase = function () {
  this.$$phase = null;
};
Scope.prototype.$$postDigest = function (fn) {
  this.$$postDigestQueue.push(fn);
};
