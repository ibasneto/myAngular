/* jshint globalstrict: true */
'use strict';

function Scope() {
  this.$$watchers = [];
}
function initWatchVal() {}
Scope.prototype.$watch = function (watchFn, listenerFn) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function () {},
    last: initWatchVal
  };
  this.$$watchers.push(watcher);
};
Scope.prototype.$digest = function () {
  var dirty;
  do {
    dirty = this.$$digestOnce();
  } while(dirty);
};
Scope.prototype.$$digestOnce = function () {
  var self = this, dirty = false;
  _.forEach(this.$$watchers, function (watcher) {
    var newValue = watcher.watchFn(self);
    var oldValue = watcher.last;
    if (newValue !== oldValue) {
      watcher.last = newValue;
      if (oldValue === initWatchVal) {
        oldValue = newValue;
      }
      watcher.listenerFn(newValue, oldValue, self);
      dirty = true;
    }
  });
  return dirty;
};
