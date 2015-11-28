// bus - lupin bus module wraps most library for event pub/sub support

import most from 'most'

var setImmediate;
if (typeof setImmediate === "undefined" || setImmediate === null) {
  setImmediate = function(f) {
    return setTimeout(f, 0);
  };
}

export function bus(initial) {
  var b$, _add, _end, _error;
  _add = _end = _error = null;
  b$ = most.create(function(add, end, error) {
    _add = add;
    _end = end;
    return _error = error;
  });
  b$.push = function(v) {
    return setImmediate(function() {
      return typeof _add === "function" ? _add(v) : void 0;
    });
  };
  b$.end = function() {
    return setImmediate(function() {
      return typeof _end === "function" ? _end() : void 0;
    });
  };
  b$.error = function(e) {
    return setImmediate(function() {
      return typeof _error === "function" ? _error(e) : void 0;
    });
  };
  b$.plug = function(v$) {
    var w$;
    w$ = bus();
    v$.forEach(w$.push);
    w$.forEach(b$.push);
    return w$.end;
  };
  if (initial != null) {
    b$.push(initial);
  }
  b$.observe(function(){}) //ensure at least one observer
  return b$;
};
export default bus
