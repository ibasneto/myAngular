/* jshint globalstrict: true */
'use strict';

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
}
function initWatchVal() {}
Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function () {},
    last: initWatchVal,
    valueEq: !!valueEq
  };
  this.$$watchers.push(watcher);
  this.$$lastDirtyWatch = null;
};
Scope.prototype.$digest = function () {
  var dirty, ttl = 10;
  this.$$lastDirtyWatch = null;
  do {
    dirty = this.$$digestOnce();
    if (dirty && ttl-- === 0) {
      throw '10 digest iterations reached';
    }
  } while(dirty);
};
Scope.prototype.$$digestOnce = function () {
  var self = this, dirty = false;
  _.forEach(this.$$watchers, function (watcher) {
    var newValue = watcher.watchFn(self);
    var oldValue = watcher.last;
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
  });
  return dirty;
};
Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue;
  }
};
