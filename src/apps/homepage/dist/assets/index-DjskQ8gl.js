(function () {
  const t = document.createElement('link').relList;
  if (t && t.supports && t.supports('modulepreload')) return;
  for (const l of document.querySelectorAll('link[rel="modulepreload"]')) r(l);
  new MutationObserver((l) => {
    for (const o of l)
      if (o.type === 'childList')
        for (const i of o.addedNodes) i.tagName === 'LINK' && i.rel === 'modulepreload' && r(i);
  }).observe(document, { childList: !0, subtree: !0 });
  function n(l) {
    const o = {};
    return (
      l.integrity && (o.integrity = l.integrity),
      l.referrerPolicy && (o.referrerPolicy = l.referrerPolicy),
      l.crossOrigin === 'use-credentials'
        ? (o.credentials = 'include')
        : l.crossOrigin === 'anonymous'
          ? (o.credentials = 'omit')
          : (o.credentials = 'same-origin'),
      o
    );
  }
  function r(l) {
    if (l.ep) return;
    l.ep = !0;
    const o = n(l);
    fetch(l.href, o);
  }
})();
var ms = { exports: {} },
  cl = {},
  hs = { exports: {} },
  R = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var rr = Symbol.for('react.element'),
  Ac = Symbol.for('react.portal'),
  Hc = Symbol.for('react.fragment'),
  Uc = Symbol.for('react.strict_mode'),
  Vc = Symbol.for('react.profiler'),
  Bc = Symbol.for('react.provider'),
  Wc = Symbol.for('react.context'),
  Qc = Symbol.for('react.forward_ref'),
  Kc = Symbol.for('react.suspense'),
  Yc = Symbol.for('react.memo'),
  Gc = Symbol.for('react.lazy'),
  Xi = Symbol.iterator;
function Xc(e) {
  return e === null || typeof e != 'object'
    ? null
    : ((e = (Xi && e[Xi]) || e['@@iterator']), typeof e == 'function' ? e : null);
}
var vs = {
    isMounted: function () {
      return !1;
    },
    enqueueForceUpdate: function () {},
    enqueueReplaceState: function () {},
    enqueueSetState: function () {},
  },
  ys = Object.assign,
  gs = {};
function hn(e, t, n) {
  ((this.props = e), (this.context = t), (this.refs = gs), (this.updater = n || vs));
}
hn.prototype.isReactComponent = {};
hn.prototype.setState = function (e, t) {
  if (typeof e != 'object' && typeof e != 'function' && e != null)
    throw Error(
      'setState(...): takes an object of state variables to update or a function which returns an object of state variables.',
    );
  this.updater.enqueueSetState(this, e, t, 'setState');
};
hn.prototype.forceUpdate = function (e) {
  this.updater.enqueueForceUpdate(this, e, 'forceUpdate');
};
function ws() {}
ws.prototype = hn.prototype;
function Zo(e, t, n) {
  ((this.props = e), (this.context = t), (this.refs = gs), (this.updater = n || vs));
}
var Jo = (Zo.prototype = new ws());
Jo.constructor = Zo;
ys(Jo, hn.prototype);
Jo.isPureReactComponent = !0;
var Zi = Array.isArray,
  ks = Object.prototype.hasOwnProperty,
  qo = { current: null },
  xs = { key: !0, ref: !0, __self: !0, __source: !0 };
function _s(e, t, n) {
  var r,
    l = {},
    o = null,
    i = null;
  if (t != null)
    for (r in (t.ref !== void 0 && (i = t.ref), t.key !== void 0 && (o = '' + t.key), t))
      ks.call(t, r) && !xs.hasOwnProperty(r) && (l[r] = t[r]);
  var s = arguments.length - 2;
  if (s === 1) l.children = n;
  else if (1 < s) {
    for (var u = Array(s), a = 0; a < s; a++) u[a] = arguments[a + 2];
    l.children = u;
  }
  if (e && e.defaultProps) for (r in ((s = e.defaultProps), s)) l[r] === void 0 && (l[r] = s[r]);
  return { $$typeof: rr, type: e, key: o, ref: i, props: l, _owner: qo.current };
}
function Zc(e, t) {
  return { $$typeof: rr, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function bo(e) {
  return typeof e == 'object' && e !== null && e.$$typeof === rr;
}
function Jc(e) {
  var t = { '=': '=0', ':': '=2' };
  return (
    '$' +
    e.replace(/[=:]/g, function (n) {
      return t[n];
    })
  );
}
var Ji = /\/+/g;
function Pl(e, t) {
  return typeof e == 'object' && e !== null && e.key != null ? Jc('' + e.key) : t.toString(36);
}
function Pr(e, t, n, r, l) {
  var o = typeof e;
  (o === 'undefined' || o === 'boolean') && (e = null);
  var i = !1;
  if (e === null) i = !0;
  else
    switch (o) {
      case 'string':
      case 'number':
        i = !0;
        break;
      case 'object':
        switch (e.$$typeof) {
          case rr:
          case Ac:
            i = !0;
        }
    }
  if (i)
    return (
      (i = e),
      (l = l(i)),
      (e = r === '' ? '.' + Pl(i, 0) : r),
      Zi(l)
        ? ((n = ''),
          e != null && (n = e.replace(Ji, '$&/') + '/'),
          Pr(l, t, n, '', function (a) {
            return a;
          }))
        : l != null &&
          (bo(l) &&
            (l = Zc(
              l,
              n +
                (!l.key || (i && i.key === l.key) ? '' : ('' + l.key).replace(Ji, '$&/') + '/') +
                e,
            )),
          t.push(l)),
      1
    );
  if (((i = 0), (r = r === '' ? '.' : r + ':'), Zi(e)))
    for (var s = 0; s < e.length; s++) {
      o = e[s];
      var u = r + Pl(o, s);
      i += Pr(o, t, n, u, l);
    }
  else if (((u = Xc(e)), typeof u == 'function'))
    for (e = u.call(e), s = 0; !(o = e.next()).done; )
      ((o = o.value), (u = r + Pl(o, s++)), (i += Pr(o, t, n, u, l)));
  else if (o === 'object')
    throw (
      (t = String(e)),
      Error(
        'Objects are not valid as a React child (found: ' +
          (t === '[object Object]' ? 'object with keys {' + Object.keys(e).join(', ') + '}' : t) +
          '). If you meant to render a collection of children, use an array instead.',
      )
    );
  return i;
}
function cr(e, t, n) {
  if (e == null) return e;
  var r = [],
    l = 0;
  return (
    Pr(e, r, '', '', function (o) {
      return t.call(n, o, l++);
    }),
    r
  );
}
function qc(e) {
  if (e._status === -1) {
    var t = e._result;
    ((t = t()),
      t.then(
        function (n) {
          (e._status === 0 || e._status === -1) && ((e._status = 1), (e._result = n));
        },
        function (n) {
          (e._status === 0 || e._status === -1) && ((e._status = 2), (e._result = n));
        },
      ),
      e._status === -1 && ((e._status = 0), (e._result = t)));
  }
  if (e._status === 1) return e._result.default;
  throw e._result;
}
var fe = { current: null },
  Tr = { transition: null },
  bc = { ReactCurrentDispatcher: fe, ReactCurrentBatchConfig: Tr, ReactCurrentOwner: qo };
function Ss() {
  throw Error('act(...) is not supported in production builds of React.');
}
R.Children = {
  map: cr,
  forEach: function (e, t, n) {
    cr(
      e,
      function () {
        t.apply(this, arguments);
      },
      n,
    );
  },
  count: function (e) {
    var t = 0;
    return (
      cr(e, function () {
        t++;
      }),
      t
    );
  },
  toArray: function (e) {
    return (
      cr(e, function (t) {
        return t;
      }) || []
    );
  },
  only: function (e) {
    if (!bo(e))
      throw Error('React.Children.only expected to receive a single React element child.');
    return e;
  },
};
R.Component = hn;
R.Fragment = Hc;
R.Profiler = Vc;
R.PureComponent = Zo;
R.StrictMode = Uc;
R.Suspense = Kc;
R.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = bc;
R.act = Ss;
R.cloneElement = function (e, t, n) {
  if (e == null)
    throw Error(
      'React.cloneElement(...): The argument must be a React element, but you passed ' + e + '.',
    );
  var r = ys({}, e.props),
    l = e.key,
    o = e.ref,
    i = e._owner;
  if (t != null) {
    if (
      (t.ref !== void 0 && ((o = t.ref), (i = qo.current)),
      t.key !== void 0 && (l = '' + t.key),
      e.type && e.type.defaultProps)
    )
      var s = e.type.defaultProps;
    for (u in t)
      ks.call(t, u) &&
        !xs.hasOwnProperty(u) &&
        (r[u] = t[u] === void 0 && s !== void 0 ? s[u] : t[u]);
  }
  var u = arguments.length - 2;
  if (u === 1) r.children = n;
  else if (1 < u) {
    s = Array(u);
    for (var a = 0; a < u; a++) s[a] = arguments[a + 2];
    r.children = s;
  }
  return { $$typeof: rr, type: e.type, key: l, ref: o, props: r, _owner: i };
};
R.createContext = function (e) {
  return (
    (e = {
      $$typeof: Wc,
      _currentValue: e,
      _currentValue2: e,
      _threadCount: 0,
      Provider: null,
      Consumer: null,
      _defaultValue: null,
      _globalName: null,
    }),
    (e.Provider = { $$typeof: Bc, _context: e }),
    (e.Consumer = e)
  );
};
R.createElement = _s;
R.createFactory = function (e) {
  var t = _s.bind(null, e);
  return ((t.type = e), t);
};
R.createRef = function () {
  return { current: null };
};
R.forwardRef = function (e) {
  return { $$typeof: Qc, render: e };
};
R.isValidElement = bo;
R.lazy = function (e) {
  return { $$typeof: Gc, _payload: { _status: -1, _result: e }, _init: qc };
};
R.memo = function (e, t) {
  return { $$typeof: Yc, type: e, compare: t === void 0 ? null : t };
};
R.startTransition = function (e) {
  var t = Tr.transition;
  Tr.transition = {};
  try {
    e();
  } finally {
    Tr.transition = t;
  }
};
R.unstable_act = Ss;
R.useCallback = function (e, t) {
  return fe.current.useCallback(e, t);
};
R.useContext = function (e) {
  return fe.current.useContext(e);
};
R.useDebugValue = function () {};
R.useDeferredValue = function (e) {
  return fe.current.useDeferredValue(e);
};
R.useEffect = function (e, t) {
  return fe.current.useEffect(e, t);
};
R.useId = function () {
  return fe.current.useId();
};
R.useImperativeHandle = function (e, t, n) {
  return fe.current.useImperativeHandle(e, t, n);
};
R.useInsertionEffect = function (e, t) {
  return fe.current.useInsertionEffect(e, t);
};
R.useLayoutEffect = function (e, t) {
  return fe.current.useLayoutEffect(e, t);
};
R.useMemo = function (e, t) {
  return fe.current.useMemo(e, t);
};
R.useReducer = function (e, t, n) {
  return fe.current.useReducer(e, t, n);
};
R.useRef = function (e) {
  return fe.current.useRef(e);
};
R.useState = function (e) {
  return fe.current.useState(e);
};
R.useSyncExternalStore = function (e, t, n) {
  return fe.current.useSyncExternalStore(e, t, n);
};
R.useTransition = function () {
  return fe.current.useTransition();
};
R.version = '18.3.1';
hs.exports = R;
var _ = hs.exports;
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var ef = _,
  tf = Symbol.for('react.element'),
  nf = Symbol.for('react.fragment'),
  rf = Object.prototype.hasOwnProperty,
  lf = ef.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
  of = { key: !0, ref: !0, __self: !0, __source: !0 };
function Ns(e, t, n) {
  var r,
    l = {},
    o = null,
    i = null;
  (n !== void 0 && (o = '' + n),
    t.key !== void 0 && (o = '' + t.key),
    t.ref !== void 0 && (i = t.ref));
  for (r in t) rf.call(t, r) && !of.hasOwnProperty(r) && (l[r] = t[r]);
  if (e && e.defaultProps) for (r in ((t = e.defaultProps), t)) l[r] === void 0 && (l[r] = t[r]);
  return { $$typeof: tf, type: e, key: o, ref: i, props: l, _owner: lf.current };
}
cl.Fragment = nf;
cl.jsx = Ns;
cl.jsxs = Ns;
ms.exports = cl;
var d = ms.exports,
  Es = { exports: {} },
  Ne = {},
  Cs = { exports: {} },
  js = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ (function (e) {
  function t(E, z) {
    var M = E.length;
    E.push(z);
    e: for (; 0 < M; ) {
      var B = (M - 1) >>> 1,
        X = E[B];
      if (0 < l(X, z)) ((E[B] = z), (E[M] = X), (M = B));
      else break e;
    }
  }
  function n(E) {
    return E.length === 0 ? null : E[0];
  }
  function r(E) {
    if (E.length === 0) return null;
    var z = E[0],
      M = E.pop();
    if (M !== z) {
      E[0] = M;
      e: for (var B = 0, X = E.length, Ct = X >>> 1; B < Ct; ) {
        var D = 2 * (B + 1) - 1,
          rt = E[D],
          lt = D + 1,
          ar = E[lt];
        if (0 > l(rt, M))
          lt < X && 0 > l(ar, rt)
            ? ((E[B] = ar), (E[lt] = M), (B = lt))
            : ((E[B] = rt), (E[D] = M), (B = D));
        else if (lt < X && 0 > l(ar, M)) ((E[B] = ar), (E[lt] = M), (B = lt));
        else break e;
      }
    }
    return z;
  }
  function l(E, z) {
    var M = E.sortIndex - z.sortIndex;
    return M !== 0 ? M : E.id - z.id;
  }
  if (typeof performance == 'object' && typeof performance.now == 'function') {
    var o = performance;
    e.unstable_now = function () {
      return o.now();
    };
  } else {
    var i = Date,
      s = i.now();
    e.unstable_now = function () {
      return i.now() - s;
    };
  }
  var u = [],
    a = [],
    m = 1,
    h = null,
    v = 3,
    g = !1,
    y = !1,
    x = !1,
    T = typeof setTimeout == 'function' ? setTimeout : null,
    f = typeof clearTimeout == 'function' ? clearTimeout : null,
    c = typeof setImmediate < 'u' ? setImmediate : null;
  typeof navigator < 'u' &&
    navigator.scheduling !== void 0 &&
    navigator.scheduling.isInputPending !== void 0 &&
    navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function p(E) {
    for (var z = n(a); z !== null; ) {
      if (z.callback === null) r(a);
      else if (z.startTime <= E) (r(a), (z.sortIndex = z.expirationTime), t(u, z));
      else break;
      z = n(a);
    }
  }
  function w(E) {
    if (((x = !1), p(E), !y))
      if (n(u) !== null) ((y = !0), gn(S));
      else {
        var z = n(a);
        z !== null && Ce(w, z.startTime - E);
      }
  }
  function S(E, z) {
    ((y = !1), x && ((x = !1), f(P), (P = -1)), (g = !0));
    var M = v;
    try {
      for (p(z), h = n(u); h !== null && (!(h.expirationTime > z) || (E && !ge())); ) {
        var B = h.callback;
        if (typeof B == 'function') {
          ((h.callback = null), (v = h.priorityLevel));
          var X = B(h.expirationTime <= z);
          ((z = e.unstable_now()),
            typeof X == 'function' ? (h.callback = X) : h === n(u) && r(u),
            p(z));
        } else r(u);
        h = n(u);
      }
      if (h !== null) var Ct = !0;
      else {
        var D = n(a);
        (D !== null && Ce(w, D.startTime - z), (Ct = !1));
      }
      return Ct;
    } finally {
      ((h = null), (v = M), (g = !1));
    }
  }
  var j = !1,
    N = null,
    P = -1,
    $ = 5,
    L = -1;
  function ge() {
    return !(e.unstable_now() - L < $);
  }
  function Ke() {
    if (N !== null) {
      var E = e.unstable_now();
      L = E;
      var z = !0;
      try {
        z = N(!0, E);
      } finally {
        z ? we() : ((j = !1), (N = null));
      }
    } else j = !1;
  }
  var we;
  if (typeof c == 'function')
    we = function () {
      c(Ke);
    };
  else if (typeof MessageChannel < 'u') {
    var Et = new MessageChannel(),
      sr = Et.port2;
    ((Et.port1.onmessage = Ke),
      (we = function () {
        sr.postMessage(null);
      }));
  } else
    we = function () {
      T(Ke, 0);
    };
  function gn(E) {
    ((N = E), j || ((j = !0), we()));
  }
  function Ce(E, z) {
    P = T(function () {
      E(e.unstable_now());
    }, z);
  }
  ((e.unstable_IdlePriority = 5),
    (e.unstable_ImmediatePriority = 1),
    (e.unstable_LowPriority = 4),
    (e.unstable_NormalPriority = 3),
    (e.unstable_Profiling = null),
    (e.unstable_UserBlockingPriority = 2),
    (e.unstable_cancelCallback = function (E) {
      E.callback = null;
    }),
    (e.unstable_continueExecution = function () {
      y || g || ((y = !0), gn(S));
    }),
    (e.unstable_forceFrameRate = function (E) {
      0 > E || 125 < E
        ? console.error(
            'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported',
          )
        : ($ = 0 < E ? Math.floor(1e3 / E) : 5);
    }),
    (e.unstable_getCurrentPriorityLevel = function () {
      return v;
    }),
    (e.unstable_getFirstCallbackNode = function () {
      return n(u);
    }),
    (e.unstable_next = function (E) {
      switch (v) {
        case 1:
        case 2:
        case 3:
          var z = 3;
          break;
        default:
          z = v;
      }
      var M = v;
      v = z;
      try {
        return E();
      } finally {
        v = M;
      }
    }),
    (e.unstable_pauseExecution = function () {}),
    (e.unstable_requestPaint = function () {}),
    (e.unstable_runWithPriority = function (E, z) {
      switch (E) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          E = 3;
      }
      var M = v;
      v = E;
      try {
        return z();
      } finally {
        v = M;
      }
    }),
    (e.unstable_scheduleCallback = function (E, z, M) {
      var B = e.unstable_now();
      switch (
        (typeof M == 'object' && M !== null
          ? ((M = M.delay), (M = typeof M == 'number' && 0 < M ? B + M : B))
          : (M = B),
        E)
      ) {
        case 1:
          var X = -1;
          break;
        case 2:
          X = 250;
          break;
        case 5:
          X = 1073741823;
          break;
        case 4:
          X = 1e4;
          break;
        default:
          X = 5e3;
      }
      return (
        (X = M + X),
        (E = {
          id: m++,
          callback: z,
          priorityLevel: E,
          startTime: M,
          expirationTime: X,
          sortIndex: -1,
        }),
        M > B
          ? ((E.sortIndex = M),
            t(a, E),
            n(u) === null && E === n(a) && (x ? (f(P), (P = -1)) : (x = !0), Ce(w, M - B)))
          : ((E.sortIndex = X), t(u, E), y || g || ((y = !0), gn(S))),
        E
      );
    }),
    (e.unstable_shouldYield = ge),
    (e.unstable_wrapCallback = function (E) {
      var z = v;
      return function () {
        var M = v;
        v = z;
        try {
          return E.apply(this, arguments);
        } finally {
          v = M;
        }
      };
    }));
})(js);
Cs.exports = js;
var uf = Cs.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var sf = _,
  Se = uf;
function k(e) {
  for (
    var t = 'https://reactjs.org/docs/error-decoder.html?invariant=' + e, n = 1;
    n < arguments.length;
    n++
  )
    t += '&args[]=' + encodeURIComponent(arguments[n]);
  return (
    'Minified React error #' +
    e +
    '; visit ' +
    t +
    ' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
  );
}
var Ps = new Set(),
  Hn = {};
function Ht(e, t) {
  (sn(e, t), sn(e + 'Capture', t));
}
function sn(e, t) {
  for (Hn[e] = t, e = 0; e < t.length; e++) Ps.add(t[e]);
}
var qe = !(
    typeof window > 'u' ||
    typeof window.document > 'u' ||
    typeof window.document.createElement > 'u'
  ),
  no = Object.prototype.hasOwnProperty,
  af =
    /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
  qi = {},
  bi = {};
function cf(e) {
  return no.call(bi, e) ? !0 : no.call(qi, e) ? !1 : af.test(e) ? (bi[e] = !0) : ((qi[e] = !0), !1);
}
function ff(e, t, n, r) {
  if (n !== null && n.type === 0) return !1;
  switch (typeof t) {
    case 'function':
    case 'symbol':
      return !0;
    case 'boolean':
      return r
        ? !1
        : n !== null
          ? !n.acceptsBooleans
          : ((e = e.toLowerCase().slice(0, 5)), e !== 'data-' && e !== 'aria-');
    default:
      return !1;
  }
}
function df(e, t, n, r) {
  if (t === null || typeof t > 'u' || ff(e, t, n, r)) return !0;
  if (r) return !1;
  if (n !== null)
    switch (n.type) {
      case 3:
        return !t;
      case 4:
        return t === !1;
      case 5:
        return isNaN(t);
      case 6:
        return isNaN(t) || 1 > t;
    }
  return !1;
}
function de(e, t, n, r, l, o, i) {
  ((this.acceptsBooleans = t === 2 || t === 3 || t === 4),
    (this.attributeName = r),
    (this.attributeNamespace = l),
    (this.mustUseProperty = n),
    (this.propertyName = e),
    (this.type = t),
    (this.sanitizeURL = o),
    (this.removeEmptyString = i));
}
var re = {};
'children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style'
  .split(' ')
  .forEach(function (e) {
    re[e] = new de(e, 0, !1, e, null, !1, !1);
  });
[
  ['acceptCharset', 'accept-charset'],
  ['className', 'class'],
  ['htmlFor', 'for'],
  ['httpEquiv', 'http-equiv'],
].forEach(function (e) {
  var t = e[0];
  re[t] = new de(t, 1, !1, e[1], null, !1, !1);
});
['contentEditable', 'draggable', 'spellCheck', 'value'].forEach(function (e) {
  re[e] = new de(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
['autoReverse', 'externalResourcesRequired', 'focusable', 'preserveAlpha'].forEach(function (e) {
  re[e] = new de(e, 2, !1, e, null, !1, !1);
});
'allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope'
  .split(' ')
  .forEach(function (e) {
    re[e] = new de(e, 3, !1, e.toLowerCase(), null, !1, !1);
  });
['checked', 'multiple', 'muted', 'selected'].forEach(function (e) {
  re[e] = new de(e, 3, !0, e, null, !1, !1);
});
['capture', 'download'].forEach(function (e) {
  re[e] = new de(e, 4, !1, e, null, !1, !1);
});
['cols', 'rows', 'size', 'span'].forEach(function (e) {
  re[e] = new de(e, 6, !1, e, null, !1, !1);
});
['rowSpan', 'start'].forEach(function (e) {
  re[e] = new de(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var ei = /[\-:]([a-z])/g;
function ti(e) {
  return e[1].toUpperCase();
}
'accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height'
  .split(' ')
  .forEach(function (e) {
    var t = e.replace(ei, ti);
    re[t] = new de(t, 1, !1, e, null, !1, !1);
  });
'xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type'
  .split(' ')
  .forEach(function (e) {
    var t = e.replace(ei, ti);
    re[t] = new de(t, 1, !1, e, 'http://www.w3.org/1999/xlink', !1, !1);
  });
['xml:base', 'xml:lang', 'xml:space'].forEach(function (e) {
  var t = e.replace(ei, ti);
  re[t] = new de(t, 1, !1, e, 'http://www.w3.org/XML/1998/namespace', !1, !1);
});
['tabIndex', 'crossOrigin'].forEach(function (e) {
  re[e] = new de(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
re.xlinkHref = new de('xlinkHref', 1, !1, 'xlink:href', 'http://www.w3.org/1999/xlink', !0, !1);
['src', 'href', 'action', 'formAction'].forEach(function (e) {
  re[e] = new de(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function ni(e, t, n, r) {
  var l = re.hasOwnProperty(t) ? re[t] : null;
  (l !== null
    ? l.type !== 0
    : r || !(2 < t.length) || (t[0] !== 'o' && t[0] !== 'O') || (t[1] !== 'n' && t[1] !== 'N')) &&
    (df(t, n, l, r) && (n = null),
    r || l === null
      ? cf(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, '' + n))
      : l.mustUseProperty
        ? (e[l.propertyName] = n === null ? (l.type === 3 ? !1 : '') : n)
        : ((t = l.attributeName),
          (r = l.attributeNamespace),
          n === null
            ? e.removeAttribute(t)
            : ((l = l.type),
              (n = l === 3 || (l === 4 && n === !0) ? '' : '' + n),
              r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var nt = sf.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
  fr = Symbol.for('react.element'),
  Bt = Symbol.for('react.portal'),
  Wt = Symbol.for('react.fragment'),
  ri = Symbol.for('react.strict_mode'),
  ro = Symbol.for('react.profiler'),
  Ts = Symbol.for('react.provider'),
  zs = Symbol.for('react.context'),
  li = Symbol.for('react.forward_ref'),
  lo = Symbol.for('react.suspense'),
  oo = Symbol.for('react.suspense_list'),
  oi = Symbol.for('react.memo'),
  it = Symbol.for('react.lazy'),
  Ms = Symbol.for('react.offscreen'),
  eu = Symbol.iterator;
function wn(e) {
  return e === null || typeof e != 'object'
    ? null
    : ((e = (eu && e[eu]) || e['@@iterator']), typeof e == 'function' ? e : null);
}
var K = Object.assign,
  Tl;
function jn(e) {
  if (Tl === void 0)
    try {
      throw Error();
    } catch (n) {
      var t = n.stack.trim().match(/\n( *(at )?)/);
      Tl = (t && t[1]) || '';
    }
  return (
    `
` +
    Tl +
    e
  );
}
var zl = !1;
function Ml(e, t) {
  if (!e || zl) return '';
  zl = !0;
  var n = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (t)
      if (
        ((t = function () {
          throw Error();
        }),
        Object.defineProperty(t.prototype, 'props', {
          set: function () {
            throw Error();
          },
        }),
        typeof Reflect == 'object' && Reflect.construct)
      ) {
        try {
          Reflect.construct(t, []);
        } catch (a) {
          var r = a;
        }
        Reflect.construct(e, [], t);
      } else {
        try {
          t.call();
        } catch (a) {
          r = a;
        }
        e.call(t.prototype);
      }
    else {
      try {
        throw Error();
      } catch (a) {
        r = a;
      }
      e();
    }
  } catch (a) {
    if (a && r && typeof a.stack == 'string') {
      for (
        var l = a.stack.split(`
`),
          o = r.stack.split(`
`),
          i = l.length - 1,
          s = o.length - 1;
        1 <= i && 0 <= s && l[i] !== o[s];
      )
        s--;
      for (; 1 <= i && 0 <= s; i--, s--)
        if (l[i] !== o[s]) {
          if (i !== 1 || s !== 1)
            do
              if ((i--, s--, 0 > s || l[i] !== o[s])) {
                var u =
                  `
` + l[i].replace(' at new ', ' at ');
                return (
                  e.displayName &&
                    u.includes('<anonymous>') &&
                    (u = u.replace('<anonymous>', e.displayName)),
                  u
                );
              }
            while (1 <= i && 0 <= s);
          break;
        }
    }
  } finally {
    ((zl = !1), (Error.prepareStackTrace = n));
  }
  return (e = e ? e.displayName || e.name : '') ? jn(e) : '';
}
function pf(e) {
  switch (e.tag) {
    case 5:
      return jn(e.type);
    case 16:
      return jn('Lazy');
    case 13:
      return jn('Suspense');
    case 19:
      return jn('SuspenseList');
    case 0:
    case 2:
    case 15:
      return ((e = Ml(e.type, !1)), e);
    case 11:
      return ((e = Ml(e.type.render, !1)), e);
    case 1:
      return ((e = Ml(e.type, !0)), e);
    default:
      return '';
  }
}
function io(e) {
  if (e == null) return null;
  if (typeof e == 'function') return e.displayName || e.name || null;
  if (typeof e == 'string') return e;
  switch (e) {
    case Wt:
      return 'Fragment';
    case Bt:
      return 'Portal';
    case ro:
      return 'Profiler';
    case ri:
      return 'StrictMode';
    case lo:
      return 'Suspense';
    case oo:
      return 'SuspenseList';
  }
  if (typeof e == 'object')
    switch (e.$$typeof) {
      case zs:
        return (e.displayName || 'Context') + '.Consumer';
      case Ts:
        return (e._context.displayName || 'Context') + '.Provider';
      case li:
        var t = e.render;
        return (
          (e = e.displayName),
          e ||
            ((e = t.displayName || t.name || ''),
            (e = e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')),
          e
        );
      case oi:
        return ((t = e.displayName || null), t !== null ? t : io(e.type) || 'Memo');
      case it:
        ((t = e._payload), (e = e._init));
        try {
          return io(e(t));
        } catch {}
    }
  return null;
}
function mf(e) {
  var t = e.type;
  switch (e.tag) {
    case 24:
      return 'Cache';
    case 9:
      return (t.displayName || 'Context') + '.Consumer';
    case 10:
      return (t._context.displayName || 'Context') + '.Provider';
    case 18:
      return 'DehydratedFragment';
    case 11:
      return (
        (e = t.render),
        (e = e.displayName || e.name || ''),
        t.displayName || (e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')
      );
    case 7:
      return 'Fragment';
    case 5:
      return t;
    case 4:
      return 'Portal';
    case 3:
      return 'Root';
    case 6:
      return 'Text';
    case 16:
      return io(t);
    case 8:
      return t === ri ? 'StrictMode' : 'Mode';
    case 22:
      return 'Offscreen';
    case 12:
      return 'Profiler';
    case 21:
      return 'Scope';
    case 13:
      return 'Suspense';
    case 19:
      return 'SuspenseList';
    case 25:
      return 'TracingMarker';
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if (typeof t == 'function') return t.displayName || t.name || null;
      if (typeof t == 'string') return t;
  }
  return null;
}
function kt(e) {
  switch (typeof e) {
    case 'boolean':
    case 'number':
    case 'string':
    case 'undefined':
      return e;
    case 'object':
      return e;
    default:
      return '';
  }
}
function Ls(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === 'input' && (t === 'checkbox' || t === 'radio');
}
function hf(e) {
  var t = Ls(e) ? 'checked' : 'value',
    n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t),
    r = '' + e[t];
  if (
    !e.hasOwnProperty(t) &&
    typeof n < 'u' &&
    typeof n.get == 'function' &&
    typeof n.set == 'function'
  ) {
    var l = n.get,
      o = n.set;
    return (
      Object.defineProperty(e, t, {
        configurable: !0,
        get: function () {
          return l.call(this);
        },
        set: function (i) {
          ((r = '' + i), o.call(this, i));
        },
      }),
      Object.defineProperty(e, t, { enumerable: n.enumerable }),
      {
        getValue: function () {
          return r;
        },
        setValue: function (i) {
          r = '' + i;
        },
        stopTracking: function () {
          ((e._valueTracker = null), delete e[t]);
        },
      }
    );
  }
}
function dr(e) {
  e._valueTracker || (e._valueTracker = hf(e));
}
function Rs(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(),
    r = '';
  return (
    e && (r = Ls(e) ? (e.checked ? 'true' : 'false') : e.value),
    (e = r),
    e !== n ? (t.setValue(e), !0) : !1
  );
}
function Hr(e) {
  if (((e = e || (typeof document < 'u' ? document : void 0)), typeof e > 'u')) return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function uo(e, t) {
  var n = t.checked;
  return K({}, t, {
    defaultChecked: void 0,
    defaultValue: void 0,
    value: void 0,
    checked: n ?? e._wrapperState.initialChecked,
  });
}
function tu(e, t) {
  var n = t.defaultValue == null ? '' : t.defaultValue,
    r = t.checked != null ? t.checked : t.defaultChecked;
  ((n = kt(t.value != null ? t.value : n)),
    (e._wrapperState = {
      initialChecked: r,
      initialValue: n,
      controlled: t.type === 'checkbox' || t.type === 'radio' ? t.checked != null : t.value != null,
    }));
}
function Os(e, t) {
  ((t = t.checked), t != null && ni(e, 'checked', t, !1));
}
function so(e, t) {
  Os(e, t);
  var n = kt(t.value),
    r = t.type;
  if (n != null)
    r === 'number'
      ? ((n === 0 && e.value === '') || e.value != n) && (e.value = '' + n)
      : e.value !== '' + n && (e.value = '' + n);
  else if (r === 'submit' || r === 'reset') {
    e.removeAttribute('value');
    return;
  }
  (t.hasOwnProperty('value')
    ? ao(e, t.type, n)
    : t.hasOwnProperty('defaultValue') && ao(e, t.type, kt(t.defaultValue)),
    t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked));
}
function nu(e, t, n) {
  if (t.hasOwnProperty('value') || t.hasOwnProperty('defaultValue')) {
    var r = t.type;
    if (!((r !== 'submit' && r !== 'reset') || (t.value !== void 0 && t.value !== null))) return;
    ((t = '' + e._wrapperState.initialValue),
      n || t === e.value || (e.value = t),
      (e.defaultValue = t));
  }
  ((n = e.name),
    n !== '' && (e.name = ''),
    (e.defaultChecked = !!e._wrapperState.initialChecked),
    n !== '' && (e.name = n));
}
function ao(e, t, n) {
  (t !== 'number' || Hr(e.ownerDocument) !== e) &&
    (n == null
      ? (e.defaultValue = '' + e._wrapperState.initialValue)
      : e.defaultValue !== '' + n && (e.defaultValue = '' + n));
}
var Pn = Array.isArray;
function tn(e, t, n, r) {
  if (((e = e.options), t)) {
    t = {};
    for (var l = 0; l < n.length; l++) t['$' + n[l]] = !0;
    for (n = 0; n < e.length; n++)
      ((l = t.hasOwnProperty('$' + e[n].value)),
        e[n].selected !== l && (e[n].selected = l),
        l && r && (e[n].defaultSelected = !0));
  } else {
    for (n = '' + kt(n), t = null, l = 0; l < e.length; l++) {
      if (e[l].value === n) {
        ((e[l].selected = !0), r && (e[l].defaultSelected = !0));
        return;
      }
      t !== null || e[l].disabled || (t = e[l]);
    }
    t !== null && (t.selected = !0);
  }
}
function co(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(k(91));
  return K({}, t, {
    value: void 0,
    defaultValue: void 0,
    children: '' + e._wrapperState.initialValue,
  });
}
function ru(e, t) {
  var n = t.value;
  if (n == null) {
    if (((n = t.children), (t = t.defaultValue), n != null)) {
      if (t != null) throw Error(k(92));
      if (Pn(n)) {
        if (1 < n.length) throw Error(k(93));
        n = n[0];
      }
      t = n;
    }
    (t == null && (t = ''), (n = t));
  }
  e._wrapperState = { initialValue: kt(n) };
}
function Ds(e, t) {
  var n = kt(t.value),
    r = kt(t.defaultValue);
  (n != null &&
    ((n = '' + n),
    n !== e.value && (e.value = n),
    t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)),
    r != null && (e.defaultValue = '' + r));
}
function lu(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== '' && t !== null && (e.value = t);
}
function $s(e) {
  switch (e) {
    case 'svg':
      return 'http://www.w3.org/2000/svg';
    case 'math':
      return 'http://www.w3.org/1998/Math/MathML';
    default:
      return 'http://www.w3.org/1999/xhtml';
  }
}
function fo(e, t) {
  return e == null || e === 'http://www.w3.org/1999/xhtml'
    ? $s(t)
    : e === 'http://www.w3.org/2000/svg' && t === 'foreignObject'
      ? 'http://www.w3.org/1999/xhtml'
      : e;
}
var pr,
  Is = (function (e) {
    return typeof MSApp < 'u' && MSApp.execUnsafeLocalFunction
      ? function (t, n, r, l) {
          MSApp.execUnsafeLocalFunction(function () {
            return e(t, n, r, l);
          });
        }
      : e;
  })(function (e, t) {
    if (e.namespaceURI !== 'http://www.w3.org/2000/svg' || 'innerHTML' in e) e.innerHTML = t;
    else {
      for (
        pr = pr || document.createElement('div'),
          pr.innerHTML = '<svg>' + t.valueOf().toString() + '</svg>',
          t = pr.firstChild;
        e.firstChild;
      )
        e.removeChild(e.firstChild);
      for (; t.firstChild; ) e.appendChild(t.firstChild);
    }
  });
function Un(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var Mn = {
    animationIterationCount: !0,
    aspectRatio: !0,
    borderImageOutset: !0,
    borderImageSlice: !0,
    borderImageWidth: !0,
    boxFlex: !0,
    boxFlexGroup: !0,
    boxOrdinalGroup: !0,
    columnCount: !0,
    columns: !0,
    flex: !0,
    flexGrow: !0,
    flexPositive: !0,
    flexShrink: !0,
    flexNegative: !0,
    flexOrder: !0,
    gridArea: !0,
    gridRow: !0,
    gridRowEnd: !0,
    gridRowSpan: !0,
    gridRowStart: !0,
    gridColumn: !0,
    gridColumnEnd: !0,
    gridColumnSpan: !0,
    gridColumnStart: !0,
    fontWeight: !0,
    lineClamp: !0,
    lineHeight: !0,
    opacity: !0,
    order: !0,
    orphans: !0,
    tabSize: !0,
    widows: !0,
    zIndex: !0,
    zoom: !0,
    fillOpacity: !0,
    floodOpacity: !0,
    stopOpacity: !0,
    strokeDasharray: !0,
    strokeDashoffset: !0,
    strokeMiterlimit: !0,
    strokeOpacity: !0,
    strokeWidth: !0,
  },
  vf = ['Webkit', 'ms', 'Moz', 'O'];
Object.keys(Mn).forEach(function (e) {
  vf.forEach(function (t) {
    ((t = t + e.charAt(0).toUpperCase() + e.substring(1)), (Mn[t] = Mn[e]));
  });
});
function Fs(e, t, n) {
  return t == null || typeof t == 'boolean' || t === ''
    ? ''
    : n || typeof t != 'number' || t === 0 || (Mn.hasOwnProperty(e) && Mn[e])
      ? ('' + t).trim()
      : t + 'px';
}
function As(e, t) {
  e = e.style;
  for (var n in t)
    if (t.hasOwnProperty(n)) {
      var r = n.indexOf('--') === 0,
        l = Fs(n, t[n], r);
      (n === 'float' && (n = 'cssFloat'), r ? e.setProperty(n, l) : (e[n] = l));
    }
}
var yf = K(
  { menuitem: !0 },
  {
    area: !0,
    base: !0,
    br: !0,
    col: !0,
    embed: !0,
    hr: !0,
    img: !0,
    input: !0,
    keygen: !0,
    link: !0,
    meta: !0,
    param: !0,
    source: !0,
    track: !0,
    wbr: !0,
  },
);
function po(e, t) {
  if (t) {
    if (yf[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(k(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(k(60));
      if (typeof t.dangerouslySetInnerHTML != 'object' || !('__html' in t.dangerouslySetInnerHTML))
        throw Error(k(61));
    }
    if (t.style != null && typeof t.style != 'object') throw Error(k(62));
  }
}
function mo(e, t) {
  if (e.indexOf('-') === -1) return typeof t.is == 'string';
  switch (e) {
    case 'annotation-xml':
    case 'color-profile':
    case 'font-face':
    case 'font-face-src':
    case 'font-face-uri':
    case 'font-face-format':
    case 'font-face-name':
    case 'missing-glyph':
      return !1;
    default:
      return !0;
  }
}
var ho = null;
function ii(e) {
  return (
    (e = e.target || e.srcElement || window),
    e.correspondingUseElement && (e = e.correspondingUseElement),
    e.nodeType === 3 ? e.parentNode : e
  );
}
var vo = null,
  nn = null,
  rn = null;
function ou(e) {
  if ((e = ir(e))) {
    if (typeof vo != 'function') throw Error(k(280));
    var t = e.stateNode;
    t && ((t = hl(t)), vo(e.stateNode, e.type, t));
  }
}
function Hs(e) {
  nn ? (rn ? rn.push(e) : (rn = [e])) : (nn = e);
}
function Us() {
  if (nn) {
    var e = nn,
      t = rn;
    if (((rn = nn = null), ou(e), t)) for (e = 0; e < t.length; e++) ou(t[e]);
  }
}
function Vs(e, t) {
  return e(t);
}
function Bs() {}
var Ll = !1;
function Ws(e, t, n) {
  if (Ll) return e(t, n);
  Ll = !0;
  try {
    return Vs(e, t, n);
  } finally {
    ((Ll = !1), (nn !== null || rn !== null) && (Bs(), Us()));
  }
}
function Vn(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = hl(n);
  if (r === null) return null;
  n = r[t];
  e: switch (t) {
    case 'onClick':
    case 'onClickCapture':
    case 'onDoubleClick':
    case 'onDoubleClickCapture':
    case 'onMouseDown':
    case 'onMouseDownCapture':
    case 'onMouseMove':
    case 'onMouseMoveCapture':
    case 'onMouseUp':
    case 'onMouseUpCapture':
    case 'onMouseEnter':
      ((r = !r.disabled) ||
        ((e = e.type),
        (r = !(e === 'button' || e === 'input' || e === 'select' || e === 'textarea'))),
        (e = !r));
      break e;
    default:
      e = !1;
  }
  if (e) return null;
  if (n && typeof n != 'function') throw Error(k(231, t, typeof n));
  return n;
}
var yo = !1;
if (qe)
  try {
    var kn = {};
    (Object.defineProperty(kn, 'passive', {
      get: function () {
        yo = !0;
      },
    }),
      window.addEventListener('test', kn, kn),
      window.removeEventListener('test', kn, kn));
  } catch {
    yo = !1;
  }
function gf(e, t, n, r, l, o, i, s, u) {
  var a = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, a);
  } catch (m) {
    this.onError(m);
  }
}
var Ln = !1,
  Ur = null,
  Vr = !1,
  go = null,
  wf = {
    onError: function (e) {
      ((Ln = !0), (Ur = e));
    },
  };
function kf(e, t, n, r, l, o, i, s, u) {
  ((Ln = !1), (Ur = null), gf.apply(wf, arguments));
}
function xf(e, t, n, r, l, o, i, s, u) {
  if ((kf.apply(this, arguments), Ln)) {
    if (Ln) {
      var a = Ur;
      ((Ln = !1), (Ur = null));
    } else throw Error(k(198));
    Vr || ((Vr = !0), (go = a));
  }
}
function Ut(e) {
  var t = e,
    n = e;
  if (e.alternate) for (; t.return; ) t = t.return;
  else {
    e = t;
    do ((t = e), t.flags & 4098 && (n = t.return), (e = t.return));
    while (e);
  }
  return t.tag === 3 ? n : null;
}
function Qs(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if ((t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null))
      return t.dehydrated;
  }
  return null;
}
function iu(e) {
  if (Ut(e) !== e) throw Error(k(188));
}
function _f(e) {
  var t = e.alternate;
  if (!t) {
    if (((t = Ut(e)), t === null)) throw Error(k(188));
    return t !== e ? null : e;
  }
  for (var n = e, r = t; ; ) {
    var l = n.return;
    if (l === null) break;
    var o = l.alternate;
    if (o === null) {
      if (((r = l.return), r !== null)) {
        n = r;
        continue;
      }
      break;
    }
    if (l.child === o.child) {
      for (o = l.child; o; ) {
        if (o === n) return (iu(l), e);
        if (o === r) return (iu(l), t);
        o = o.sibling;
      }
      throw Error(k(188));
    }
    if (n.return !== r.return) ((n = l), (r = o));
    else {
      for (var i = !1, s = l.child; s; ) {
        if (s === n) {
          ((i = !0), (n = l), (r = o));
          break;
        }
        if (s === r) {
          ((i = !0), (r = l), (n = o));
          break;
        }
        s = s.sibling;
      }
      if (!i) {
        for (s = o.child; s; ) {
          if (s === n) {
            ((i = !0), (n = o), (r = l));
            break;
          }
          if (s === r) {
            ((i = !0), (r = o), (n = l));
            break;
          }
          s = s.sibling;
        }
        if (!i) throw Error(k(189));
      }
    }
    if (n.alternate !== r) throw Error(k(190));
  }
  if (n.tag !== 3) throw Error(k(188));
  return n.stateNode.current === n ? e : t;
}
function Ks(e) {
  return ((e = _f(e)), e !== null ? Ys(e) : null);
}
function Ys(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = Ys(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var Gs = Se.unstable_scheduleCallback,
  uu = Se.unstable_cancelCallback,
  Sf = Se.unstable_shouldYield,
  Nf = Se.unstable_requestPaint,
  G = Se.unstable_now,
  Ef = Se.unstable_getCurrentPriorityLevel,
  ui = Se.unstable_ImmediatePriority,
  Xs = Se.unstable_UserBlockingPriority,
  Br = Se.unstable_NormalPriority,
  Cf = Se.unstable_LowPriority,
  Zs = Se.unstable_IdlePriority,
  fl = null,
  We = null;
function jf(e) {
  if (We && typeof We.onCommitFiberRoot == 'function')
    try {
      We.onCommitFiberRoot(fl, e, void 0, (e.current.flags & 128) === 128);
    } catch {}
}
var Fe = Math.clz32 ? Math.clz32 : zf,
  Pf = Math.log,
  Tf = Math.LN2;
function zf(e) {
  return ((e >>>= 0), e === 0 ? 32 : (31 - ((Pf(e) / Tf) | 0)) | 0);
}
var mr = 64,
  hr = 4194304;
function Tn(e) {
  switch (e & -e) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return e & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return e & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return e;
  }
}
function Wr(e, t) {
  var n = e.pendingLanes;
  if (n === 0) return 0;
  var r = 0,
    l = e.suspendedLanes,
    o = e.pingedLanes,
    i = n & 268435455;
  if (i !== 0) {
    var s = i & ~l;
    s !== 0 ? (r = Tn(s)) : ((o &= i), o !== 0 && (r = Tn(o)));
  } else ((i = n & ~l), i !== 0 ? (r = Tn(i)) : o !== 0 && (r = Tn(o)));
  if (r === 0) return 0;
  if (
    t !== 0 &&
    t !== r &&
    !(t & l) &&
    ((l = r & -r), (o = t & -t), l >= o || (l === 16 && (o & 4194240) !== 0))
  )
    return t;
  if ((r & 4 && (r |= n & 16), (t = e.entangledLanes), t !== 0))
    for (e = e.entanglements, t &= r; 0 < t; )
      ((n = 31 - Fe(t)), (l = 1 << n), (r |= e[n]), (t &= ~l));
  return r;
}
function Mf(e, t) {
  switch (e) {
    case 1:
    case 2:
    case 4:
      return t + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return t + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function Lf(e, t) {
  for (
    var n = e.suspendedLanes, r = e.pingedLanes, l = e.expirationTimes, o = e.pendingLanes;
    0 < o;
  ) {
    var i = 31 - Fe(o),
      s = 1 << i,
      u = l[i];
    (u === -1 ? (!(s & n) || s & r) && (l[i] = Mf(s, t)) : u <= t && (e.expiredLanes |= s),
      (o &= ~s));
  }
}
function wo(e) {
  return ((e = e.pendingLanes & -1073741825), e !== 0 ? e : e & 1073741824 ? 1073741824 : 0);
}
function Js() {
  var e = mr;
  return ((mr <<= 1), !(mr & 4194240) && (mr = 64), e);
}
function Rl(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function lr(e, t, n) {
  ((e.pendingLanes |= t),
    t !== 536870912 && ((e.suspendedLanes = 0), (e.pingedLanes = 0)),
    (e = e.eventTimes),
    (t = 31 - Fe(t)),
    (e[t] = n));
}
function Rf(e, t) {
  var n = e.pendingLanes & ~t;
  ((e.pendingLanes = t),
    (e.suspendedLanes = 0),
    (e.pingedLanes = 0),
    (e.expiredLanes &= t),
    (e.mutableReadLanes &= t),
    (e.entangledLanes &= t),
    (t = e.entanglements));
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var l = 31 - Fe(n),
      o = 1 << l;
    ((t[l] = 0), (r[l] = -1), (e[l] = -1), (n &= ~o));
  }
}
function si(e, t) {
  var n = (e.entangledLanes |= t);
  for (e = e.entanglements; n; ) {
    var r = 31 - Fe(n),
      l = 1 << r;
    ((l & t) | (e[r] & t) && (e[r] |= t), (n &= ~l));
  }
}
var I = 0;
function qs(e) {
  return ((e &= -e), 1 < e ? (4 < e ? (e & 268435455 ? 16 : 536870912) : 4) : 1);
}
var bs,
  ai,
  ea,
  ta,
  na,
  ko = !1,
  vr = [],
  dt = null,
  pt = null,
  mt = null,
  Bn = new Map(),
  Wn = new Map(),
  st = [],
  Of =
    'mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit'.split(
      ' ',
    );
function su(e, t) {
  switch (e) {
    case 'focusin':
    case 'focusout':
      dt = null;
      break;
    case 'dragenter':
    case 'dragleave':
      pt = null;
      break;
    case 'mouseover':
    case 'mouseout':
      mt = null;
      break;
    case 'pointerover':
    case 'pointerout':
      Bn.delete(t.pointerId);
      break;
    case 'gotpointercapture':
    case 'lostpointercapture':
      Wn.delete(t.pointerId);
  }
}
function xn(e, t, n, r, l, o) {
  return e === null || e.nativeEvent !== o
    ? ((e = {
        blockedOn: t,
        domEventName: n,
        eventSystemFlags: r,
        nativeEvent: o,
        targetContainers: [l],
      }),
      t !== null && ((t = ir(t)), t !== null && ai(t)),
      e)
    : ((e.eventSystemFlags |= r),
      (t = e.targetContainers),
      l !== null && t.indexOf(l) === -1 && t.push(l),
      e);
}
function Df(e, t, n, r, l) {
  switch (t) {
    case 'focusin':
      return ((dt = xn(dt, e, t, n, r, l)), !0);
    case 'dragenter':
      return ((pt = xn(pt, e, t, n, r, l)), !0);
    case 'mouseover':
      return ((mt = xn(mt, e, t, n, r, l)), !0);
    case 'pointerover':
      var o = l.pointerId;
      return (Bn.set(o, xn(Bn.get(o) || null, e, t, n, r, l)), !0);
    case 'gotpointercapture':
      return ((o = l.pointerId), Wn.set(o, xn(Wn.get(o) || null, e, t, n, r, l)), !0);
  }
  return !1;
}
function ra(e) {
  var t = Tt(e.target);
  if (t !== null) {
    var n = Ut(t);
    if (n !== null) {
      if (((t = n.tag), t === 13)) {
        if (((t = Qs(n)), t !== null)) {
          ((e.blockedOn = t),
            na(e.priority, function () {
              ea(n);
            }));
          return;
        }
      } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
        e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
        return;
      }
    }
  }
  e.blockedOn = null;
}
function zr(e) {
  if (e.blockedOn !== null) return !1;
  for (var t = e.targetContainers; 0 < t.length; ) {
    var n = xo(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      ((ho = r), n.target.dispatchEvent(r), (ho = null));
    } else return ((t = ir(n)), t !== null && ai(t), (e.blockedOn = n), !1);
    t.shift();
  }
  return !0;
}
function au(e, t, n) {
  zr(e) && n.delete(t);
}
function $f() {
  ((ko = !1),
    dt !== null && zr(dt) && (dt = null),
    pt !== null && zr(pt) && (pt = null),
    mt !== null && zr(mt) && (mt = null),
    Bn.forEach(au),
    Wn.forEach(au));
}
function _n(e, t) {
  e.blockedOn === t &&
    ((e.blockedOn = null),
    ko || ((ko = !0), Se.unstable_scheduleCallback(Se.unstable_NormalPriority, $f)));
}
function Qn(e) {
  function t(l) {
    return _n(l, e);
  }
  if (0 < vr.length) {
    _n(vr[0], e);
    for (var n = 1; n < vr.length; n++) {
      var r = vr[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (
    dt !== null && _n(dt, e),
      pt !== null && _n(pt, e),
      mt !== null && _n(mt, e),
      Bn.forEach(t),
      Wn.forEach(t),
      n = 0;
    n < st.length;
    n++
  )
    ((r = st[n]), r.blockedOn === e && (r.blockedOn = null));
  for (; 0 < st.length && ((n = st[0]), n.blockedOn === null); )
    (ra(n), n.blockedOn === null && st.shift());
}
var ln = nt.ReactCurrentBatchConfig,
  Qr = !0;
function If(e, t, n, r) {
  var l = I,
    o = ln.transition;
  ln.transition = null;
  try {
    ((I = 1), ci(e, t, n, r));
  } finally {
    ((I = l), (ln.transition = o));
  }
}
function Ff(e, t, n, r) {
  var l = I,
    o = ln.transition;
  ln.transition = null;
  try {
    ((I = 4), ci(e, t, n, r));
  } finally {
    ((I = l), (ln.transition = o));
  }
}
function ci(e, t, n, r) {
  if (Qr) {
    var l = xo(e, t, n, r);
    if (l === null) (Bl(e, t, r, Kr, n), su(e, r));
    else if (Df(l, e, t, n, r)) r.stopPropagation();
    else if ((su(e, r), t & 4 && -1 < Of.indexOf(e))) {
      for (; l !== null; ) {
        var o = ir(l);
        if ((o !== null && bs(o), (o = xo(e, t, n, r)), o === null && Bl(e, t, r, Kr, n), o === l))
          break;
        l = o;
      }
      l !== null && r.stopPropagation();
    } else Bl(e, t, r, null, n);
  }
}
var Kr = null;
function xo(e, t, n, r) {
  if (((Kr = null), (e = ii(r)), (e = Tt(e)), e !== null))
    if (((t = Ut(e)), t === null)) e = null;
    else if (((n = t.tag), n === 13)) {
      if (((e = Qs(t)), e !== null)) return e;
      e = null;
    } else if (n === 3) {
      if (t.stateNode.current.memoizedState.isDehydrated)
        return t.tag === 3 ? t.stateNode.containerInfo : null;
      e = null;
    } else t !== e && (e = null);
  return ((Kr = e), null);
}
function la(e) {
  switch (e) {
    case 'cancel':
    case 'click':
    case 'close':
    case 'contextmenu':
    case 'copy':
    case 'cut':
    case 'auxclick':
    case 'dblclick':
    case 'dragend':
    case 'dragstart':
    case 'drop':
    case 'focusin':
    case 'focusout':
    case 'input':
    case 'invalid':
    case 'keydown':
    case 'keypress':
    case 'keyup':
    case 'mousedown':
    case 'mouseup':
    case 'paste':
    case 'pause':
    case 'play':
    case 'pointercancel':
    case 'pointerdown':
    case 'pointerup':
    case 'ratechange':
    case 'reset':
    case 'resize':
    case 'seeked':
    case 'submit':
    case 'touchcancel':
    case 'touchend':
    case 'touchstart':
    case 'volumechange':
    case 'change':
    case 'selectionchange':
    case 'textInput':
    case 'compositionstart':
    case 'compositionend':
    case 'compositionupdate':
    case 'beforeblur':
    case 'afterblur':
    case 'beforeinput':
    case 'blur':
    case 'fullscreenchange':
    case 'focus':
    case 'hashchange':
    case 'popstate':
    case 'select':
    case 'selectstart':
      return 1;
    case 'drag':
    case 'dragenter':
    case 'dragexit':
    case 'dragleave':
    case 'dragover':
    case 'mousemove':
    case 'mouseout':
    case 'mouseover':
    case 'pointermove':
    case 'pointerout':
    case 'pointerover':
    case 'scroll':
    case 'toggle':
    case 'touchmove':
    case 'wheel':
    case 'mouseenter':
    case 'mouseleave':
    case 'pointerenter':
    case 'pointerleave':
      return 4;
    case 'message':
      switch (Ef()) {
        case ui:
          return 1;
        case Xs:
          return 4;
        case Br:
        case Cf:
          return 16;
        case Zs:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var ct = null,
  fi = null,
  Mr = null;
function oa() {
  if (Mr) return Mr;
  var e,
    t = fi,
    n = t.length,
    r,
    l = 'value' in ct ? ct.value : ct.textContent,
    o = l.length;
  for (e = 0; e < n && t[e] === l[e]; e++);
  var i = n - e;
  for (r = 1; r <= i && t[n - r] === l[o - r]; r++);
  return (Mr = l.slice(e, 1 < r ? 1 - r : void 0));
}
function Lr(e) {
  var t = e.keyCode;
  return (
    'charCode' in e ? ((e = e.charCode), e === 0 && t === 13 && (e = 13)) : (e = t),
    e === 10 && (e = 13),
    32 <= e || e === 13 ? e : 0
  );
}
function yr() {
  return !0;
}
function cu() {
  return !1;
}
function Ee(e) {
  function t(n, r, l, o, i) {
    ((this._reactName = n),
      (this._targetInst = l),
      (this.type = r),
      (this.nativeEvent = o),
      (this.target = i),
      (this.currentTarget = null));
    for (var s in e) e.hasOwnProperty(s) && ((n = e[s]), (this[s] = n ? n(o) : o[s]));
    return (
      (this.isDefaultPrevented = (
        o.defaultPrevented != null ? o.defaultPrevented : o.returnValue === !1
      )
        ? yr
        : cu),
      (this.isPropagationStopped = cu),
      this
    );
  }
  return (
    K(t.prototype, {
      preventDefault: function () {
        this.defaultPrevented = !0;
        var n = this.nativeEvent;
        n &&
          (n.preventDefault
            ? n.preventDefault()
            : typeof n.returnValue != 'unknown' && (n.returnValue = !1),
          (this.isDefaultPrevented = yr));
      },
      stopPropagation: function () {
        var n = this.nativeEvent;
        n &&
          (n.stopPropagation
            ? n.stopPropagation()
            : typeof n.cancelBubble != 'unknown' && (n.cancelBubble = !0),
          (this.isPropagationStopped = yr));
      },
      persist: function () {},
      isPersistent: yr,
    }),
    t
  );
}
var vn = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function (e) {
      return e.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0,
  },
  di = Ee(vn),
  or = K({}, vn, { view: 0, detail: 0 }),
  Af = Ee(or),
  Ol,
  Dl,
  Sn,
  dl = K({}, or, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: pi,
    button: 0,
    buttons: 0,
    relatedTarget: function (e) {
      return e.relatedTarget === void 0
        ? e.fromElement === e.srcElement
          ? e.toElement
          : e.fromElement
        : e.relatedTarget;
    },
    movementX: function (e) {
      return 'movementX' in e
        ? e.movementX
        : (e !== Sn &&
            (Sn && e.type === 'mousemove'
              ? ((Ol = e.screenX - Sn.screenX), (Dl = e.screenY - Sn.screenY))
              : (Dl = Ol = 0),
            (Sn = e)),
          Ol);
    },
    movementY: function (e) {
      return 'movementY' in e ? e.movementY : Dl;
    },
  }),
  fu = Ee(dl),
  Hf = K({}, dl, { dataTransfer: 0 }),
  Uf = Ee(Hf),
  Vf = K({}, or, { relatedTarget: 0 }),
  $l = Ee(Vf),
  Bf = K({}, vn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
  Wf = Ee(Bf),
  Qf = K({}, vn, {
    clipboardData: function (e) {
      return 'clipboardData' in e ? e.clipboardData : window.clipboardData;
    },
  }),
  Kf = Ee(Qf),
  Yf = K({}, vn, { data: 0 }),
  du = Ee(Yf),
  Gf = {
    Esc: 'Escape',
    Spacebar: ' ',
    Left: 'ArrowLeft',
    Up: 'ArrowUp',
    Right: 'ArrowRight',
    Down: 'ArrowDown',
    Del: 'Delete',
    Win: 'OS',
    Menu: 'ContextMenu',
    Apps: 'ContextMenu',
    Scroll: 'ScrollLock',
    MozPrintableKey: 'Unidentified',
  },
  Xf = {
    8: 'Backspace',
    9: 'Tab',
    12: 'Clear',
    13: 'Enter',
    16: 'Shift',
    17: 'Control',
    18: 'Alt',
    19: 'Pause',
    20: 'CapsLock',
    27: 'Escape',
    32: ' ',
    33: 'PageUp',
    34: 'PageDown',
    35: 'End',
    36: 'Home',
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    45: 'Insert',
    46: 'Delete',
    112: 'F1',
    113: 'F2',
    114: 'F3',
    115: 'F4',
    116: 'F5',
    117: 'F6',
    118: 'F7',
    119: 'F8',
    120: 'F9',
    121: 'F10',
    122: 'F11',
    123: 'F12',
    144: 'NumLock',
    145: 'ScrollLock',
    224: 'Meta',
  },
  Zf = { Alt: 'altKey', Control: 'ctrlKey', Meta: 'metaKey', Shift: 'shiftKey' };
function Jf(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = Zf[e]) ? !!t[e] : !1;
}
function pi() {
  return Jf;
}
var qf = K({}, or, {
    key: function (e) {
      if (e.key) {
        var t = Gf[e.key] || e.key;
        if (t !== 'Unidentified') return t;
      }
      return e.type === 'keypress'
        ? ((e = Lr(e)), e === 13 ? 'Enter' : String.fromCharCode(e))
        : e.type === 'keydown' || e.type === 'keyup'
          ? Xf[e.keyCode] || 'Unidentified'
          : '';
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: pi,
    charCode: function (e) {
      return e.type === 'keypress' ? Lr(e) : 0;
    },
    keyCode: function (e) {
      return e.type === 'keydown' || e.type === 'keyup' ? e.keyCode : 0;
    },
    which: function (e) {
      return e.type === 'keypress'
        ? Lr(e)
        : e.type === 'keydown' || e.type === 'keyup'
          ? e.keyCode
          : 0;
    },
  }),
  bf = Ee(qf),
  ed = K({}, dl, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0,
  }),
  pu = Ee(ed),
  td = K({}, or, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: pi,
  }),
  nd = Ee(td),
  rd = K({}, vn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
  ld = Ee(rd),
  od = K({}, dl, {
    deltaX: function (e) {
      return 'deltaX' in e ? e.deltaX : 'wheelDeltaX' in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function (e) {
      return 'deltaY' in e
        ? e.deltaY
        : 'wheelDeltaY' in e
          ? -e.wheelDeltaY
          : 'wheelDelta' in e
            ? -e.wheelDelta
            : 0;
    },
    deltaZ: 0,
    deltaMode: 0,
  }),
  id = Ee(od),
  ud = [9, 13, 27, 32],
  mi = qe && 'CompositionEvent' in window,
  Rn = null;
qe && 'documentMode' in document && (Rn = document.documentMode);
var sd = qe && 'TextEvent' in window && !Rn,
  ia = qe && (!mi || (Rn && 8 < Rn && 11 >= Rn)),
  mu = ' ',
  hu = !1;
function ua(e, t) {
  switch (e) {
    case 'keyup':
      return ud.indexOf(t.keyCode) !== -1;
    case 'keydown':
      return t.keyCode !== 229;
    case 'keypress':
    case 'mousedown':
    case 'focusout':
      return !0;
    default:
      return !1;
  }
}
function sa(e) {
  return ((e = e.detail), typeof e == 'object' && 'data' in e ? e.data : null);
}
var Qt = !1;
function ad(e, t) {
  switch (e) {
    case 'compositionend':
      return sa(t);
    case 'keypress':
      return t.which !== 32 ? null : ((hu = !0), mu);
    case 'textInput':
      return ((e = t.data), e === mu && hu ? null : e);
    default:
      return null;
  }
}
function cd(e, t) {
  if (Qt)
    return e === 'compositionend' || (!mi && ua(e, t))
      ? ((e = oa()), (Mr = fi = ct = null), (Qt = !1), e)
      : null;
  switch (e) {
    case 'paste':
      return null;
    case 'keypress':
      if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
        if (t.char && 1 < t.char.length) return t.char;
        if (t.which) return String.fromCharCode(t.which);
      }
      return null;
    case 'compositionend':
      return ia && t.locale !== 'ko' ? null : t.data;
    default:
      return null;
  }
}
var fd = {
  color: !0,
  date: !0,
  datetime: !0,
  'datetime-local': !0,
  email: !0,
  month: !0,
  number: !0,
  password: !0,
  range: !0,
  search: !0,
  tel: !0,
  text: !0,
  time: !0,
  url: !0,
  week: !0,
};
function vu(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === 'input' ? !!fd[e.type] : t === 'textarea';
}
function aa(e, t, n, r) {
  (Hs(r),
    (t = Yr(t, 'onChange')),
    0 < t.length &&
      ((n = new di('onChange', 'change', null, n, r)), e.push({ event: n, listeners: t })));
}
var On = null,
  Kn = null;
function dd(e) {
  ka(e, 0);
}
function pl(e) {
  var t = Gt(e);
  if (Rs(t)) return e;
}
function pd(e, t) {
  if (e === 'change') return t;
}
var ca = !1;
if (qe) {
  var Il;
  if (qe) {
    var Fl = 'oninput' in document;
    if (!Fl) {
      var yu = document.createElement('div');
      (yu.setAttribute('oninput', 'return;'), (Fl = typeof yu.oninput == 'function'));
    }
    Il = Fl;
  } else Il = !1;
  ca = Il && (!document.documentMode || 9 < document.documentMode);
}
function gu() {
  On && (On.detachEvent('onpropertychange', fa), (Kn = On = null));
}
function fa(e) {
  if (e.propertyName === 'value' && pl(Kn)) {
    var t = [];
    (aa(t, Kn, e, ii(e)), Ws(dd, t));
  }
}
function md(e, t, n) {
  e === 'focusin'
    ? (gu(), (On = t), (Kn = n), On.attachEvent('onpropertychange', fa))
    : e === 'focusout' && gu();
}
function hd(e) {
  if (e === 'selectionchange' || e === 'keyup' || e === 'keydown') return pl(Kn);
}
function vd(e, t) {
  if (e === 'click') return pl(t);
}
function yd(e, t) {
  if (e === 'input' || e === 'change') return pl(t);
}
function gd(e, t) {
  return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
}
var He = typeof Object.is == 'function' ? Object.is : gd;
function Yn(e, t) {
  if (He(e, t)) return !0;
  if (typeof e != 'object' || e === null || typeof t != 'object' || t === null) return !1;
  var n = Object.keys(e),
    r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var l = n[r];
    if (!no.call(t, l) || !He(e[l], t[l])) return !1;
  }
  return !0;
}
function wu(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function ku(e, t) {
  var n = wu(e);
  e = 0;
  for (var r; n; ) {
    if (n.nodeType === 3) {
      if (((r = e + n.textContent.length), e <= t && r >= t)) return { node: n, offset: t - e };
      e = r;
    }
    e: {
      for (; n; ) {
        if (n.nextSibling) {
          n = n.nextSibling;
          break e;
        }
        n = n.parentNode;
      }
      n = void 0;
    }
    n = wu(n);
  }
}
function da(e, t) {
  return e && t
    ? e === t
      ? !0
      : e && e.nodeType === 3
        ? !1
        : t && t.nodeType === 3
          ? da(e, t.parentNode)
          : 'contains' in e
            ? e.contains(t)
            : e.compareDocumentPosition
              ? !!(e.compareDocumentPosition(t) & 16)
              : !1
    : !1;
}
function pa() {
  for (var e = window, t = Hr(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == 'string';
    } catch {
      n = !1;
    }
    if (n) e = t.contentWindow;
    else break;
    t = Hr(e.document);
  }
  return t;
}
function hi(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return (
    t &&
    ((t === 'input' &&
      (e.type === 'text' ||
        e.type === 'search' ||
        e.type === 'tel' ||
        e.type === 'url' ||
        e.type === 'password')) ||
      t === 'textarea' ||
      e.contentEditable === 'true')
  );
}
function wd(e) {
  var t = pa(),
    n = e.focusedElem,
    r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && da(n.ownerDocument.documentElement, n)) {
    if (r !== null && hi(n)) {
      if (((t = r.start), (e = r.end), e === void 0 && (e = t), 'selectionStart' in n))
        ((n.selectionStart = t), (n.selectionEnd = Math.min(e, n.value.length)));
      else if (
        ((e = ((t = n.ownerDocument || document) && t.defaultView) || window), e.getSelection)
      ) {
        e = e.getSelection();
        var l = n.textContent.length,
          o = Math.min(r.start, l);
        ((r = r.end === void 0 ? o : Math.min(r.end, l)),
          !e.extend && o > r && ((l = r), (r = o), (o = l)),
          (l = ku(n, o)));
        var i = ku(n, r);
        l &&
          i &&
          (e.rangeCount !== 1 ||
            e.anchorNode !== l.node ||
            e.anchorOffset !== l.offset ||
            e.focusNode !== i.node ||
            e.focusOffset !== i.offset) &&
          ((t = t.createRange()),
          t.setStart(l.node, l.offset),
          e.removeAllRanges(),
          o > r
            ? (e.addRange(t), e.extend(i.node, i.offset))
            : (t.setEnd(i.node, i.offset), e.addRange(t)));
      }
    }
    for (t = [], e = n; (e = e.parentNode); )
      e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
    for (typeof n.focus == 'function' && n.focus(), n = 0; n < t.length; n++)
      ((e = t[n]), (e.element.scrollLeft = e.left), (e.element.scrollTop = e.top));
  }
}
var kd = qe && 'documentMode' in document && 11 >= document.documentMode,
  Kt = null,
  _o = null,
  Dn = null,
  So = !1;
function xu(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  So ||
    Kt == null ||
    Kt !== Hr(r) ||
    ((r = Kt),
    'selectionStart' in r && hi(r)
      ? (r = { start: r.selectionStart, end: r.selectionEnd })
      : ((r = ((r.ownerDocument && r.ownerDocument.defaultView) || window).getSelection()),
        (r = {
          anchorNode: r.anchorNode,
          anchorOffset: r.anchorOffset,
          focusNode: r.focusNode,
          focusOffset: r.focusOffset,
        })),
    (Dn && Yn(Dn, r)) ||
      ((Dn = r),
      (r = Yr(_o, 'onSelect')),
      0 < r.length &&
        ((t = new di('onSelect', 'select', null, t, n)),
        e.push({ event: t, listeners: r }),
        (t.target = Kt))));
}
function gr(e, t) {
  var n = {};
  return (
    (n[e.toLowerCase()] = t.toLowerCase()),
    (n['Webkit' + e] = 'webkit' + t),
    (n['Moz' + e] = 'moz' + t),
    n
  );
}
var Yt = {
    animationend: gr('Animation', 'AnimationEnd'),
    animationiteration: gr('Animation', 'AnimationIteration'),
    animationstart: gr('Animation', 'AnimationStart'),
    transitionend: gr('Transition', 'TransitionEnd'),
  },
  Al = {},
  ma = {};
qe &&
  ((ma = document.createElement('div').style),
  'AnimationEvent' in window ||
    (delete Yt.animationend.animation,
    delete Yt.animationiteration.animation,
    delete Yt.animationstart.animation),
  'TransitionEvent' in window || delete Yt.transitionend.transition);
function ml(e) {
  if (Al[e]) return Al[e];
  if (!Yt[e]) return e;
  var t = Yt[e],
    n;
  for (n in t) if (t.hasOwnProperty(n) && n in ma) return (Al[e] = t[n]);
  return e;
}
var ha = ml('animationend'),
  va = ml('animationiteration'),
  ya = ml('animationstart'),
  ga = ml('transitionend'),
  wa = new Map(),
  _u =
    'abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel'.split(
      ' ',
    );
function _t(e, t) {
  (wa.set(e, t), Ht(t, [e]));
}
for (var Hl = 0; Hl < _u.length; Hl++) {
  var Ul = _u[Hl],
    xd = Ul.toLowerCase(),
    _d = Ul[0].toUpperCase() + Ul.slice(1);
  _t(xd, 'on' + _d);
}
_t(ha, 'onAnimationEnd');
_t(va, 'onAnimationIteration');
_t(ya, 'onAnimationStart');
_t('dblclick', 'onDoubleClick');
_t('focusin', 'onFocus');
_t('focusout', 'onBlur');
_t(ga, 'onTransitionEnd');
sn('onMouseEnter', ['mouseout', 'mouseover']);
sn('onMouseLeave', ['mouseout', 'mouseover']);
sn('onPointerEnter', ['pointerout', 'pointerover']);
sn('onPointerLeave', ['pointerout', 'pointerover']);
Ht('onChange', 'change click focusin focusout input keydown keyup selectionchange'.split(' '));
Ht(
  'onSelect',
  'focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange'.split(' '),
);
Ht('onBeforeInput', ['compositionend', 'keypress', 'textInput', 'paste']);
Ht('onCompositionEnd', 'compositionend focusout keydown keypress keyup mousedown'.split(' '));
Ht('onCompositionStart', 'compositionstart focusout keydown keypress keyup mousedown'.split(' '));
Ht('onCompositionUpdate', 'compositionupdate focusout keydown keypress keyup mousedown'.split(' '));
var zn =
    'abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting'.split(
      ' ',
    ),
  Sd = new Set('cancel close invalid load scroll toggle'.split(' ').concat(zn));
function Su(e, t, n) {
  var r = e.type || 'unknown-event';
  ((e.currentTarget = n), xf(r, t, void 0, e), (e.currentTarget = null));
}
function ka(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n],
      l = r.event;
    r = r.listeners;
    e: {
      var o = void 0;
      if (t)
        for (var i = r.length - 1; 0 <= i; i--) {
          var s = r[i],
            u = s.instance,
            a = s.currentTarget;
          if (((s = s.listener), u !== o && l.isPropagationStopped())) break e;
          (Su(l, s, a), (o = u));
        }
      else
        for (i = 0; i < r.length; i++) {
          if (
            ((s = r[i]),
            (u = s.instance),
            (a = s.currentTarget),
            (s = s.listener),
            u !== o && l.isPropagationStopped())
          )
            break e;
          (Su(l, s, a), (o = u));
        }
    }
  }
  if (Vr) throw ((e = go), (Vr = !1), (go = null), e);
}
function H(e, t) {
  var n = t[Po];
  n === void 0 && (n = t[Po] = new Set());
  var r = e + '__bubble';
  n.has(r) || (xa(t, e, 2, !1), n.add(r));
}
function Vl(e, t, n) {
  var r = 0;
  (t && (r |= 4), xa(n, e, r, t));
}
var wr = '_reactListening' + Math.random().toString(36).slice(2);
function Gn(e) {
  if (!e[wr]) {
    ((e[wr] = !0),
      Ps.forEach(function (n) {
        n !== 'selectionchange' && (Sd.has(n) || Vl(n, !1, e), Vl(n, !0, e));
      }));
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[wr] || ((t[wr] = !0), Vl('selectionchange', !1, t));
  }
}
function xa(e, t, n, r) {
  switch (la(t)) {
    case 1:
      var l = If;
      break;
    case 4:
      l = Ff;
      break;
    default:
      l = ci;
  }
  ((n = l.bind(null, t, n, e)),
    (l = void 0),
    !yo || (t !== 'touchstart' && t !== 'touchmove' && t !== 'wheel') || (l = !0),
    r
      ? l !== void 0
        ? e.addEventListener(t, n, { capture: !0, passive: l })
        : e.addEventListener(t, n, !0)
      : l !== void 0
        ? e.addEventListener(t, n, { passive: l })
        : e.addEventListener(t, n, !1));
}
function Bl(e, t, n, r, l) {
  var o = r;
  if (!(t & 1) && !(t & 2) && r !== null)
    e: for (;;) {
      if (r === null) return;
      var i = r.tag;
      if (i === 3 || i === 4) {
        var s = r.stateNode.containerInfo;
        if (s === l || (s.nodeType === 8 && s.parentNode === l)) break;
        if (i === 4)
          for (i = r.return; i !== null; ) {
            var u = i.tag;
            if (
              (u === 3 || u === 4) &&
              ((u = i.stateNode.containerInfo), u === l || (u.nodeType === 8 && u.parentNode === l))
            )
              return;
            i = i.return;
          }
        for (; s !== null; ) {
          if (((i = Tt(s)), i === null)) return;
          if (((u = i.tag), u === 5 || u === 6)) {
            r = o = i;
            continue e;
          }
          s = s.parentNode;
        }
      }
      r = r.return;
    }
  Ws(function () {
    var a = o,
      m = ii(n),
      h = [];
    e: {
      var v = wa.get(e);
      if (v !== void 0) {
        var g = di,
          y = e;
        switch (e) {
          case 'keypress':
            if (Lr(n) === 0) break e;
          case 'keydown':
          case 'keyup':
            g = bf;
            break;
          case 'focusin':
            ((y = 'focus'), (g = $l));
            break;
          case 'focusout':
            ((y = 'blur'), (g = $l));
            break;
          case 'beforeblur':
          case 'afterblur':
            g = $l;
            break;
          case 'click':
            if (n.button === 2) break e;
          case 'auxclick':
          case 'dblclick':
          case 'mousedown':
          case 'mousemove':
          case 'mouseup':
          case 'mouseout':
          case 'mouseover':
          case 'contextmenu':
            g = fu;
            break;
          case 'drag':
          case 'dragend':
          case 'dragenter':
          case 'dragexit':
          case 'dragleave':
          case 'dragover':
          case 'dragstart':
          case 'drop':
            g = Uf;
            break;
          case 'touchcancel':
          case 'touchend':
          case 'touchmove':
          case 'touchstart':
            g = nd;
            break;
          case ha:
          case va:
          case ya:
            g = Wf;
            break;
          case ga:
            g = ld;
            break;
          case 'scroll':
            g = Af;
            break;
          case 'wheel':
            g = id;
            break;
          case 'copy':
          case 'cut':
          case 'paste':
            g = Kf;
            break;
          case 'gotpointercapture':
          case 'lostpointercapture':
          case 'pointercancel':
          case 'pointerdown':
          case 'pointermove':
          case 'pointerout':
          case 'pointerover':
          case 'pointerup':
            g = pu;
        }
        var x = (t & 4) !== 0,
          T = !x && e === 'scroll',
          f = x ? (v !== null ? v + 'Capture' : null) : v;
        x = [];
        for (var c = a, p; c !== null; ) {
          p = c;
          var w = p.stateNode;
          if (
            (p.tag === 5 &&
              w !== null &&
              ((p = w), f !== null && ((w = Vn(c, f)), w != null && x.push(Xn(c, w, p)))),
            T)
          )
            break;
          c = c.return;
        }
        0 < x.length && ((v = new g(v, y, null, n, m)), h.push({ event: v, listeners: x }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (
          ((v = e === 'mouseover' || e === 'pointerover'),
          (g = e === 'mouseout' || e === 'pointerout'),
          v && n !== ho && (y = n.relatedTarget || n.fromElement) && (Tt(y) || y[be]))
        )
          break e;
        if (
          (g || v) &&
          ((v =
            m.window === m ? m : (v = m.ownerDocument) ? v.defaultView || v.parentWindow : window),
          g
            ? ((y = n.relatedTarget || n.toElement),
              (g = a),
              (y = y ? Tt(y) : null),
              y !== null && ((T = Ut(y)), y !== T || (y.tag !== 5 && y.tag !== 6)) && (y = null))
            : ((g = null), (y = a)),
          g !== y)
        ) {
          if (
            ((x = fu),
            (w = 'onMouseLeave'),
            (f = 'onMouseEnter'),
            (c = 'mouse'),
            (e === 'pointerout' || e === 'pointerover') &&
              ((x = pu), (w = 'onPointerLeave'), (f = 'onPointerEnter'), (c = 'pointer')),
            (T = g == null ? v : Gt(g)),
            (p = y == null ? v : Gt(y)),
            (v = new x(w, c + 'leave', g, n, m)),
            (v.target = T),
            (v.relatedTarget = p),
            (w = null),
            Tt(m) === a &&
              ((x = new x(f, c + 'enter', y, n, m)),
              (x.target = p),
              (x.relatedTarget = T),
              (w = x)),
            (T = w),
            g && y)
          )
            t: {
              for (x = g, f = y, c = 0, p = x; p; p = Vt(p)) c++;
              for (p = 0, w = f; w; w = Vt(w)) p++;
              for (; 0 < c - p; ) ((x = Vt(x)), c--);
              for (; 0 < p - c; ) ((f = Vt(f)), p--);
              for (; c--; ) {
                if (x === f || (f !== null && x === f.alternate)) break t;
                ((x = Vt(x)), (f = Vt(f)));
              }
              x = null;
            }
          else x = null;
          (g !== null && Nu(h, v, g, x, !1), y !== null && T !== null && Nu(h, T, y, x, !0));
        }
      }
      e: {
        if (
          ((v = a ? Gt(a) : window),
          (g = v.nodeName && v.nodeName.toLowerCase()),
          g === 'select' || (g === 'input' && v.type === 'file'))
        )
          var S = pd;
        else if (vu(v))
          if (ca) S = yd;
          else {
            S = hd;
            var j = md;
          }
        else
          (g = v.nodeName) &&
            g.toLowerCase() === 'input' &&
            (v.type === 'checkbox' || v.type === 'radio') &&
            (S = vd);
        if (S && (S = S(e, a))) {
          aa(h, S, n, m);
          break e;
        }
        (j && j(e, v, a),
          e === 'focusout' &&
            (j = v._wrapperState) &&
            j.controlled &&
            v.type === 'number' &&
            ao(v, 'number', v.value));
      }
      switch (((j = a ? Gt(a) : window), e)) {
        case 'focusin':
          (vu(j) || j.contentEditable === 'true') && ((Kt = j), (_o = a), (Dn = null));
          break;
        case 'focusout':
          Dn = _o = Kt = null;
          break;
        case 'mousedown':
          So = !0;
          break;
        case 'contextmenu':
        case 'mouseup':
        case 'dragend':
          ((So = !1), xu(h, n, m));
          break;
        case 'selectionchange':
          if (kd) break;
        case 'keydown':
        case 'keyup':
          xu(h, n, m);
      }
      var N;
      if (mi)
        e: {
          switch (e) {
            case 'compositionstart':
              var P = 'onCompositionStart';
              break e;
            case 'compositionend':
              P = 'onCompositionEnd';
              break e;
            case 'compositionupdate':
              P = 'onCompositionUpdate';
              break e;
          }
          P = void 0;
        }
      else
        Qt
          ? ua(e, n) && (P = 'onCompositionEnd')
          : e === 'keydown' && n.keyCode === 229 && (P = 'onCompositionStart');
      (P &&
        (ia &&
          n.locale !== 'ko' &&
          (Qt || P !== 'onCompositionStart'
            ? P === 'onCompositionEnd' && Qt && (N = oa())
            : ((ct = m), (fi = 'value' in ct ? ct.value : ct.textContent), (Qt = !0))),
        (j = Yr(a, P)),
        0 < j.length &&
          ((P = new du(P, e, null, n, m)),
          h.push({ event: P, listeners: j }),
          N ? (P.data = N) : ((N = sa(n)), N !== null && (P.data = N)))),
        (N = sd ? ad(e, n) : cd(e, n)) &&
          ((a = Yr(a, 'onBeforeInput')),
          0 < a.length &&
            ((m = new du('onBeforeInput', 'beforeinput', null, n, m)),
            h.push({ event: m, listeners: a }),
            (m.data = N))));
    }
    ka(h, t);
  });
}
function Xn(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function Yr(e, t) {
  for (var n = t + 'Capture', r = []; e !== null; ) {
    var l = e,
      o = l.stateNode;
    (l.tag === 5 &&
      o !== null &&
      ((l = o),
      (o = Vn(e, n)),
      o != null && r.unshift(Xn(e, o, l)),
      (o = Vn(e, t)),
      o != null && r.push(Xn(e, o, l))),
      (e = e.return));
  }
  return r;
}
function Vt(e) {
  if (e === null) return null;
  do e = e.return;
  while (e && e.tag !== 5);
  return e || null;
}
function Nu(e, t, n, r, l) {
  for (var o = t._reactName, i = []; n !== null && n !== r; ) {
    var s = n,
      u = s.alternate,
      a = s.stateNode;
    if (u !== null && u === r) break;
    (s.tag === 5 &&
      a !== null &&
      ((s = a),
      l
        ? ((u = Vn(n, o)), u != null && i.unshift(Xn(n, u, s)))
        : l || ((u = Vn(n, o)), u != null && i.push(Xn(n, u, s)))),
      (n = n.return));
  }
  i.length !== 0 && e.push({ event: t, listeners: i });
}
var Nd = /\r\n?/g,
  Ed = /\u0000|\uFFFD/g;
function Eu(e) {
  return (typeof e == 'string' ? e : '' + e)
    .replace(
      Nd,
      `
`,
    )
    .replace(Ed, '');
}
function kr(e, t, n) {
  if (((t = Eu(t)), Eu(e) !== t && n)) throw Error(k(425));
}
function Gr() {}
var No = null,
  Eo = null;
function Co(e, t) {
  return (
    e === 'textarea' ||
    e === 'noscript' ||
    typeof t.children == 'string' ||
    typeof t.children == 'number' ||
    (typeof t.dangerouslySetInnerHTML == 'object' &&
      t.dangerouslySetInnerHTML !== null &&
      t.dangerouslySetInnerHTML.__html != null)
  );
}
var jo = typeof setTimeout == 'function' ? setTimeout : void 0,
  Cd = typeof clearTimeout == 'function' ? clearTimeout : void 0,
  Cu = typeof Promise == 'function' ? Promise : void 0,
  jd =
    typeof queueMicrotask == 'function'
      ? queueMicrotask
      : typeof Cu < 'u'
        ? function (e) {
            return Cu.resolve(null).then(e).catch(Pd);
          }
        : jo;
function Pd(e) {
  setTimeout(function () {
    throw e;
  });
}
function Wl(e, t) {
  var n = t,
    r = 0;
  do {
    var l = n.nextSibling;
    if ((e.removeChild(n), l && l.nodeType === 8))
      if (((n = l.data), n === '/$')) {
        if (r === 0) {
          (e.removeChild(l), Qn(t));
          return;
        }
        r--;
      } else (n !== '$' && n !== '$?' && n !== '$!') || r++;
    n = l;
  } while (n);
  Qn(t);
}
function ht(e) {
  for (; e != null; e = e.nextSibling) {
    var t = e.nodeType;
    if (t === 1 || t === 3) break;
    if (t === 8) {
      if (((t = e.data), t === '$' || t === '$!' || t === '$?')) break;
      if (t === '/$') return null;
    }
  }
  return e;
}
function ju(e) {
  e = e.previousSibling;
  for (var t = 0; e; ) {
    if (e.nodeType === 8) {
      var n = e.data;
      if (n === '$' || n === '$!' || n === '$?') {
        if (t === 0) return e;
        t--;
      } else n === '/$' && t++;
    }
    e = e.previousSibling;
  }
  return null;
}
var yn = Math.random().toString(36).slice(2),
  Be = '__reactFiber$' + yn,
  Zn = '__reactProps$' + yn,
  be = '__reactContainer$' + yn,
  Po = '__reactEvents$' + yn,
  Td = '__reactListeners$' + yn,
  zd = '__reactHandles$' + yn;
function Tt(e) {
  var t = e[Be];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if ((t = n[be] || n[Be])) {
      if (((n = t.alternate), t.child !== null || (n !== null && n.child !== null)))
        for (e = ju(e); e !== null; ) {
          if ((n = e[Be])) return n;
          e = ju(e);
        }
      return t;
    }
    ((e = n), (n = e.parentNode));
  }
  return null;
}
function ir(e) {
  return (
    (e = e[Be] || e[be]),
    !e || (e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3) ? null : e
  );
}
function Gt(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(k(33));
}
function hl(e) {
  return e[Zn] || null;
}
var To = [],
  Xt = -1;
function St(e) {
  return { current: e };
}
function U(e) {
  0 > Xt || ((e.current = To[Xt]), (To[Xt] = null), Xt--);
}
function F(e, t) {
  (Xt++, (To[Xt] = e.current), (e.current = t));
}
var xt = {},
  ue = St(xt),
  he = St(!1),
  Ot = xt;
function an(e, t) {
  var n = e.type.contextTypes;
  if (!n) return xt;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t)
    return r.__reactInternalMemoizedMaskedChildContext;
  var l = {},
    o;
  for (o in n) l[o] = t[o];
  return (
    r &&
      ((e = e.stateNode),
      (e.__reactInternalMemoizedUnmaskedChildContext = t),
      (e.__reactInternalMemoizedMaskedChildContext = l)),
    l
  );
}
function ve(e) {
  return ((e = e.childContextTypes), e != null);
}
function Xr() {
  (U(he), U(ue));
}
function Pu(e, t, n) {
  if (ue.current !== xt) throw Error(k(168));
  (F(ue, t), F(he, n));
}
function _a(e, t, n) {
  var r = e.stateNode;
  if (((t = t.childContextTypes), typeof r.getChildContext != 'function')) return n;
  r = r.getChildContext();
  for (var l in r) if (!(l in t)) throw Error(k(108, mf(e) || 'Unknown', l));
  return K({}, n, r);
}
function Zr(e) {
  return (
    (e = ((e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext) || xt),
    (Ot = ue.current),
    F(ue, e),
    F(he, he.current),
    !0
  );
}
function Tu(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(k(169));
  (n
    ? ((e = _a(e, t, Ot)),
      (r.__reactInternalMemoizedMergedChildContext = e),
      U(he),
      U(ue),
      F(ue, e))
    : U(he),
    F(he, n));
}
var Ge = null,
  vl = !1,
  Ql = !1;
function Sa(e) {
  Ge === null ? (Ge = [e]) : Ge.push(e);
}
function Md(e) {
  ((vl = !0), Sa(e));
}
function Nt() {
  if (!Ql && Ge !== null) {
    Ql = !0;
    var e = 0,
      t = I;
    try {
      var n = Ge;
      for (I = 1; e < n.length; e++) {
        var r = n[e];
        do r = r(!0);
        while (r !== null);
      }
      ((Ge = null), (vl = !1));
    } catch (l) {
      throw (Ge !== null && (Ge = Ge.slice(e + 1)), Gs(ui, Nt), l);
    } finally {
      ((I = t), (Ql = !1));
    }
  }
  return null;
}
var Zt = [],
  Jt = 0,
  Jr = null,
  qr = 0,
  je = [],
  Pe = 0,
  Dt = null,
  Xe = 1,
  Ze = '';
function jt(e, t) {
  ((Zt[Jt++] = qr), (Zt[Jt++] = Jr), (Jr = e), (qr = t));
}
function Na(e, t, n) {
  ((je[Pe++] = Xe), (je[Pe++] = Ze), (je[Pe++] = Dt), (Dt = e));
  var r = Xe;
  e = Ze;
  var l = 32 - Fe(r) - 1;
  ((r &= ~(1 << l)), (n += 1));
  var o = 32 - Fe(t) + l;
  if (30 < o) {
    var i = l - (l % 5);
    ((o = (r & ((1 << i) - 1)).toString(32)),
      (r >>= i),
      (l -= i),
      (Xe = (1 << (32 - Fe(t) + l)) | (n << l) | r),
      (Ze = o + e));
  } else ((Xe = (1 << o) | (n << l) | r), (Ze = e));
}
function vi(e) {
  e.return !== null && (jt(e, 1), Na(e, 1, 0));
}
function yi(e) {
  for (; e === Jr; ) ((Jr = Zt[--Jt]), (Zt[Jt] = null), (qr = Zt[--Jt]), (Zt[Jt] = null));
  for (; e === Dt; )
    ((Dt = je[--Pe]),
      (je[Pe] = null),
      (Ze = je[--Pe]),
      (je[Pe] = null),
      (Xe = je[--Pe]),
      (je[Pe] = null));
}
var _e = null,
  xe = null,
  V = !1,
  Ie = null;
function Ea(e, t) {
  var n = Te(5, null, null, 0);
  ((n.elementType = 'DELETED'),
    (n.stateNode = t),
    (n.return = e),
    (t = e.deletions),
    t === null ? ((e.deletions = [n]), (e.flags |= 16)) : t.push(n));
}
function zu(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return (
        (t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t),
        t !== null ? ((e.stateNode = t), (_e = e), (xe = ht(t.firstChild)), !0) : !1
      );
    case 6:
      return (
        (t = e.pendingProps === '' || t.nodeType !== 3 ? null : t),
        t !== null ? ((e.stateNode = t), (_e = e), (xe = null), !0) : !1
      );
    case 13:
      return (
        (t = t.nodeType !== 8 ? null : t),
        t !== null
          ? ((n = Dt !== null ? { id: Xe, overflow: Ze } : null),
            (e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }),
            (n = Te(18, null, null, 0)),
            (n.stateNode = t),
            (n.return = e),
            (e.child = n),
            (_e = e),
            (xe = null),
            !0)
          : !1
      );
    default:
      return !1;
  }
}
function zo(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function Mo(e) {
  if (V) {
    var t = xe;
    if (t) {
      var n = t;
      if (!zu(e, t)) {
        if (zo(e)) throw Error(k(418));
        t = ht(n.nextSibling);
        var r = _e;
        t && zu(e, t) ? Ea(r, n) : ((e.flags = (e.flags & -4097) | 2), (V = !1), (_e = e));
      }
    } else {
      if (zo(e)) throw Error(k(418));
      ((e.flags = (e.flags & -4097) | 2), (V = !1), (_e = e));
    }
  }
}
function Mu(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
  _e = e;
}
function xr(e) {
  if (e !== _e) return !1;
  if (!V) return (Mu(e), (V = !0), !1);
  var t;
  if (
    ((t = e.tag !== 3) &&
      !(t = e.tag !== 5) &&
      ((t = e.type), (t = t !== 'head' && t !== 'body' && !Co(e.type, e.memoizedProps))),
    t && (t = xe))
  ) {
    if (zo(e)) throw (Ca(), Error(k(418)));
    for (; t; ) (Ea(e, t), (t = ht(t.nextSibling)));
  }
  if ((Mu(e), e.tag === 13)) {
    if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e)) throw Error(k(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === '/$') {
            if (t === 0) {
              xe = ht(e.nextSibling);
              break e;
            }
            t--;
          } else (n !== '$' && n !== '$!' && n !== '$?') || t++;
        }
        e = e.nextSibling;
      }
      xe = null;
    }
  } else xe = _e ? ht(e.stateNode.nextSibling) : null;
  return !0;
}
function Ca() {
  for (var e = xe; e; ) e = ht(e.nextSibling);
}
function cn() {
  ((xe = _e = null), (V = !1));
}
function gi(e) {
  Ie === null ? (Ie = [e]) : Ie.push(e);
}
var Ld = nt.ReactCurrentBatchConfig;
function Nn(e, t, n) {
  if (((e = n.ref), e !== null && typeof e != 'function' && typeof e != 'object')) {
    if (n._owner) {
      if (((n = n._owner), n)) {
        if (n.tag !== 1) throw Error(k(309));
        var r = n.stateNode;
      }
      if (!r) throw Error(k(147, e));
      var l = r,
        o = '' + e;
      return t !== null && t.ref !== null && typeof t.ref == 'function' && t.ref._stringRef === o
        ? t.ref
        : ((t = function (i) {
            var s = l.refs;
            i === null ? delete s[o] : (s[o] = i);
          }),
          (t._stringRef = o),
          t);
    }
    if (typeof e != 'string') throw Error(k(284));
    if (!n._owner) throw Error(k(290, e));
  }
  return e;
}
function _r(e, t) {
  throw (
    (e = Object.prototype.toString.call(t)),
    Error(
      k(31, e === '[object Object]' ? 'object with keys {' + Object.keys(t).join(', ') + '}' : e),
    )
  );
}
function Lu(e) {
  var t = e._init;
  return t(e._payload);
}
function ja(e) {
  function t(f, c) {
    if (e) {
      var p = f.deletions;
      p === null ? ((f.deletions = [c]), (f.flags |= 16)) : p.push(c);
    }
  }
  function n(f, c) {
    if (!e) return null;
    for (; c !== null; ) (t(f, c), (c = c.sibling));
    return null;
  }
  function r(f, c) {
    for (f = new Map(); c !== null; )
      (c.key !== null ? f.set(c.key, c) : f.set(c.index, c), (c = c.sibling));
    return f;
  }
  function l(f, c) {
    return ((f = wt(f, c)), (f.index = 0), (f.sibling = null), f);
  }
  function o(f, c, p) {
    return (
      (f.index = p),
      e
        ? ((p = f.alternate),
          p !== null ? ((p = p.index), p < c ? ((f.flags |= 2), c) : p) : ((f.flags |= 2), c))
        : ((f.flags |= 1048576), c)
    );
  }
  function i(f) {
    return (e && f.alternate === null && (f.flags |= 2), f);
  }
  function s(f, c, p, w) {
    return c === null || c.tag !== 6
      ? ((c = ql(p, f.mode, w)), (c.return = f), c)
      : ((c = l(c, p)), (c.return = f), c);
  }
  function u(f, c, p, w) {
    var S = p.type;
    return S === Wt
      ? m(f, c, p.props.children, w, p.key)
      : c !== null &&
          (c.elementType === S ||
            (typeof S == 'object' && S !== null && S.$$typeof === it && Lu(S) === c.type))
        ? ((w = l(c, p.props)), (w.ref = Nn(f, c, p)), (w.return = f), w)
        : ((w = Ar(p.type, p.key, p.props, null, f.mode, w)),
          (w.ref = Nn(f, c, p)),
          (w.return = f),
          w);
  }
  function a(f, c, p, w) {
    return c === null ||
      c.tag !== 4 ||
      c.stateNode.containerInfo !== p.containerInfo ||
      c.stateNode.implementation !== p.implementation
      ? ((c = bl(p, f.mode, w)), (c.return = f), c)
      : ((c = l(c, p.children || [])), (c.return = f), c);
  }
  function m(f, c, p, w, S) {
    return c === null || c.tag !== 7
      ? ((c = Rt(p, f.mode, w, S)), (c.return = f), c)
      : ((c = l(c, p)), (c.return = f), c);
  }
  function h(f, c, p) {
    if ((typeof c == 'string' && c !== '') || typeof c == 'number')
      return ((c = ql('' + c, f.mode, p)), (c.return = f), c);
    if (typeof c == 'object' && c !== null) {
      switch (c.$$typeof) {
        case fr:
          return (
            (p = Ar(c.type, c.key, c.props, null, f.mode, p)),
            (p.ref = Nn(f, null, c)),
            (p.return = f),
            p
          );
        case Bt:
          return ((c = bl(c, f.mode, p)), (c.return = f), c);
        case it:
          var w = c._init;
          return h(f, w(c._payload), p);
      }
      if (Pn(c) || wn(c)) return ((c = Rt(c, f.mode, p, null)), (c.return = f), c);
      _r(f, c);
    }
    return null;
  }
  function v(f, c, p, w) {
    var S = c !== null ? c.key : null;
    if ((typeof p == 'string' && p !== '') || typeof p == 'number')
      return S !== null ? null : s(f, c, '' + p, w);
    if (typeof p == 'object' && p !== null) {
      switch (p.$$typeof) {
        case fr:
          return p.key === S ? u(f, c, p, w) : null;
        case Bt:
          return p.key === S ? a(f, c, p, w) : null;
        case it:
          return ((S = p._init), v(f, c, S(p._payload), w));
      }
      if (Pn(p) || wn(p)) return S !== null ? null : m(f, c, p, w, null);
      _r(f, p);
    }
    return null;
  }
  function g(f, c, p, w, S) {
    if ((typeof w == 'string' && w !== '') || typeof w == 'number')
      return ((f = f.get(p) || null), s(c, f, '' + w, S));
    if (typeof w == 'object' && w !== null) {
      switch (w.$$typeof) {
        case fr:
          return ((f = f.get(w.key === null ? p : w.key) || null), u(c, f, w, S));
        case Bt:
          return ((f = f.get(w.key === null ? p : w.key) || null), a(c, f, w, S));
        case it:
          var j = w._init;
          return g(f, c, p, j(w._payload), S);
      }
      if (Pn(w) || wn(w)) return ((f = f.get(p) || null), m(c, f, w, S, null));
      _r(c, w);
    }
    return null;
  }
  function y(f, c, p, w) {
    for (var S = null, j = null, N = c, P = (c = 0), $ = null; N !== null && P < p.length; P++) {
      N.index > P ? (($ = N), (N = null)) : ($ = N.sibling);
      var L = v(f, N, p[P], w);
      if (L === null) {
        N === null && (N = $);
        break;
      }
      (e && N && L.alternate === null && t(f, N),
        (c = o(L, c, P)),
        j === null ? (S = L) : (j.sibling = L),
        (j = L),
        (N = $));
    }
    if (P === p.length) return (n(f, N), V && jt(f, P), S);
    if (N === null) {
      for (; P < p.length; P++)
        ((N = h(f, p[P], w)),
          N !== null && ((c = o(N, c, P)), j === null ? (S = N) : (j.sibling = N), (j = N)));
      return (V && jt(f, P), S);
    }
    for (N = r(f, N); P < p.length; P++)
      (($ = g(N, f, P, p[P], w)),
        $ !== null &&
          (e && $.alternate !== null && N.delete($.key === null ? P : $.key),
          (c = o($, c, P)),
          j === null ? (S = $) : (j.sibling = $),
          (j = $)));
    return (
      e &&
        N.forEach(function (ge) {
          return t(f, ge);
        }),
      V && jt(f, P),
      S
    );
  }
  function x(f, c, p, w) {
    var S = wn(p);
    if (typeof S != 'function') throw Error(k(150));
    if (((p = S.call(p)), p == null)) throw Error(k(151));
    for (
      var j = (S = null), N = c, P = (c = 0), $ = null, L = p.next();
      N !== null && !L.done;
      P++, L = p.next()
    ) {
      N.index > P ? (($ = N), (N = null)) : ($ = N.sibling);
      var ge = v(f, N, L.value, w);
      if (ge === null) {
        N === null && (N = $);
        break;
      }
      (e && N && ge.alternate === null && t(f, N),
        (c = o(ge, c, P)),
        j === null ? (S = ge) : (j.sibling = ge),
        (j = ge),
        (N = $));
    }
    if (L.done) return (n(f, N), V && jt(f, P), S);
    if (N === null) {
      for (; !L.done; P++, L = p.next())
        ((L = h(f, L.value, w)),
          L !== null && ((c = o(L, c, P)), j === null ? (S = L) : (j.sibling = L), (j = L)));
      return (V && jt(f, P), S);
    }
    for (N = r(f, N); !L.done; P++, L = p.next())
      ((L = g(N, f, P, L.value, w)),
        L !== null &&
          (e && L.alternate !== null && N.delete(L.key === null ? P : L.key),
          (c = o(L, c, P)),
          j === null ? (S = L) : (j.sibling = L),
          (j = L)));
    return (
      e &&
        N.forEach(function (Ke) {
          return t(f, Ke);
        }),
      V && jt(f, P),
      S
    );
  }
  function T(f, c, p, w) {
    if (
      (typeof p == 'object' &&
        p !== null &&
        p.type === Wt &&
        p.key === null &&
        (p = p.props.children),
      typeof p == 'object' && p !== null)
    ) {
      switch (p.$$typeof) {
        case fr:
          e: {
            for (var S = p.key, j = c; j !== null; ) {
              if (j.key === S) {
                if (((S = p.type), S === Wt)) {
                  if (j.tag === 7) {
                    (n(f, j.sibling), (c = l(j, p.props.children)), (c.return = f), (f = c));
                    break e;
                  }
                } else if (
                  j.elementType === S ||
                  (typeof S == 'object' && S !== null && S.$$typeof === it && Lu(S) === j.type)
                ) {
                  (n(f, j.sibling),
                    (c = l(j, p.props)),
                    (c.ref = Nn(f, j, p)),
                    (c.return = f),
                    (f = c));
                  break e;
                }
                n(f, j);
                break;
              } else t(f, j);
              j = j.sibling;
            }
            p.type === Wt
              ? ((c = Rt(p.props.children, f.mode, w, p.key)), (c.return = f), (f = c))
              : ((w = Ar(p.type, p.key, p.props, null, f.mode, w)),
                (w.ref = Nn(f, c, p)),
                (w.return = f),
                (f = w));
          }
          return i(f);
        case Bt:
          e: {
            for (j = p.key; c !== null; ) {
              if (c.key === j)
                if (
                  c.tag === 4 &&
                  c.stateNode.containerInfo === p.containerInfo &&
                  c.stateNode.implementation === p.implementation
                ) {
                  (n(f, c.sibling), (c = l(c, p.children || [])), (c.return = f), (f = c));
                  break e;
                } else {
                  n(f, c);
                  break;
                }
              else t(f, c);
              c = c.sibling;
            }
            ((c = bl(p, f.mode, w)), (c.return = f), (f = c));
          }
          return i(f);
        case it:
          return ((j = p._init), T(f, c, j(p._payload), w));
      }
      if (Pn(p)) return y(f, c, p, w);
      if (wn(p)) return x(f, c, p, w);
      _r(f, p);
    }
    return (typeof p == 'string' && p !== '') || typeof p == 'number'
      ? ((p = '' + p),
        c !== null && c.tag === 6
          ? (n(f, c.sibling), (c = l(c, p)), (c.return = f), (f = c))
          : (n(f, c), (c = ql(p, f.mode, w)), (c.return = f), (f = c)),
        i(f))
      : n(f, c);
  }
  return T;
}
var fn = ja(!0),
  Pa = ja(!1),
  br = St(null),
  el = null,
  qt = null,
  wi = null;
function ki() {
  wi = qt = el = null;
}
function xi(e) {
  var t = br.current;
  (U(br), (e._currentValue = t));
}
function Lo(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if (
      ((e.childLanes & t) !== t
        ? ((e.childLanes |= t), r !== null && (r.childLanes |= t))
        : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t),
      e === n)
    )
      break;
    e = e.return;
  }
}
function on(e, t) {
  ((el = e),
    (wi = qt = null),
    (e = e.dependencies),
    e !== null && e.firstContext !== null && (e.lanes & t && (me = !0), (e.firstContext = null)));
}
function Me(e) {
  var t = e._currentValue;
  if (wi !== e)
    if (((e = { context: e, memoizedValue: t, next: null }), qt === null)) {
      if (el === null) throw Error(k(308));
      ((qt = e), (el.dependencies = { lanes: 0, firstContext: e }));
    } else qt = qt.next = e;
  return t;
}
var zt = null;
function _i(e) {
  zt === null ? (zt = [e]) : zt.push(e);
}
function Ta(e, t, n, r) {
  var l = t.interleaved;
  return (
    l === null ? ((n.next = n), _i(t)) : ((n.next = l.next), (l.next = n)),
    (t.interleaved = n),
    et(e, r)
  );
}
function et(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; )
    ((e.childLanes |= t),
      (n = e.alternate),
      n !== null && (n.childLanes |= t),
      (n = e),
      (e = e.return));
  return n.tag === 3 ? n.stateNode : null;
}
var ut = !1;
function Si(e) {
  e.updateQueue = {
    baseState: e.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: { pending: null, interleaved: null, lanes: 0 },
    effects: null,
  };
}
function za(e, t) {
  ((e = e.updateQueue),
    t.updateQueue === e &&
      (t.updateQueue = {
        baseState: e.baseState,
        firstBaseUpdate: e.firstBaseUpdate,
        lastBaseUpdate: e.lastBaseUpdate,
        shared: e.shared,
        effects: e.effects,
      }));
}
function Je(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function vt(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (((r = r.shared), O & 2)) {
    var l = r.pending;
    return (
      l === null ? (t.next = t) : ((t.next = l.next), (l.next = t)),
      (r.pending = t),
      et(e, n)
    );
  }
  return (
    (l = r.interleaved),
    l === null ? ((t.next = t), _i(r)) : ((t.next = l.next), (l.next = t)),
    (r.interleaved = t),
    et(e, n)
  );
}
function Rr(e, t, n) {
  if (((t = t.updateQueue), t !== null && ((t = t.shared), (n & 4194240) !== 0))) {
    var r = t.lanes;
    ((r &= e.pendingLanes), (n |= r), (t.lanes = n), si(e, n));
  }
}
function Ru(e, t) {
  var n = e.updateQueue,
    r = e.alternate;
  if (r !== null && ((r = r.updateQueue), n === r)) {
    var l = null,
      o = null;
    if (((n = n.firstBaseUpdate), n !== null)) {
      do {
        var i = {
          eventTime: n.eventTime,
          lane: n.lane,
          tag: n.tag,
          payload: n.payload,
          callback: n.callback,
          next: null,
        };
        (o === null ? (l = o = i) : (o = o.next = i), (n = n.next));
      } while (n !== null);
      o === null ? (l = o = t) : (o = o.next = t);
    } else l = o = t;
    ((n = {
      baseState: r.baseState,
      firstBaseUpdate: l,
      lastBaseUpdate: o,
      shared: r.shared,
      effects: r.effects,
    }),
      (e.updateQueue = n));
    return;
  }
  ((e = n.lastBaseUpdate),
    e === null ? (n.firstBaseUpdate = t) : (e.next = t),
    (n.lastBaseUpdate = t));
}
function tl(e, t, n, r) {
  var l = e.updateQueue;
  ut = !1;
  var o = l.firstBaseUpdate,
    i = l.lastBaseUpdate,
    s = l.shared.pending;
  if (s !== null) {
    l.shared.pending = null;
    var u = s,
      a = u.next;
    ((u.next = null), i === null ? (o = a) : (i.next = a), (i = u));
    var m = e.alternate;
    m !== null &&
      ((m = m.updateQueue),
      (s = m.lastBaseUpdate),
      s !== i && (s === null ? (m.firstBaseUpdate = a) : (s.next = a), (m.lastBaseUpdate = u)));
  }
  if (o !== null) {
    var h = l.baseState;
    ((i = 0), (m = a = u = null), (s = o));
    do {
      var v = s.lane,
        g = s.eventTime;
      if ((r & v) === v) {
        m !== null &&
          (m = m.next =
            {
              eventTime: g,
              lane: 0,
              tag: s.tag,
              payload: s.payload,
              callback: s.callback,
              next: null,
            });
        e: {
          var y = e,
            x = s;
          switch (((v = t), (g = n), x.tag)) {
            case 1:
              if (((y = x.payload), typeof y == 'function')) {
                h = y.call(g, h, v);
                break e;
              }
              h = y;
              break e;
            case 3:
              y.flags = (y.flags & -65537) | 128;
            case 0:
              if (((y = x.payload), (v = typeof y == 'function' ? y.call(g, h, v) : y), v == null))
                break e;
              h = K({}, h, v);
              break e;
            case 2:
              ut = !0;
          }
        }
        s.callback !== null &&
          s.lane !== 0 &&
          ((e.flags |= 64), (v = l.effects), v === null ? (l.effects = [s]) : v.push(s));
      } else
        ((g = {
          eventTime: g,
          lane: v,
          tag: s.tag,
          payload: s.payload,
          callback: s.callback,
          next: null,
        }),
          m === null ? ((a = m = g), (u = h)) : (m = m.next = g),
          (i |= v));
      if (((s = s.next), s === null)) {
        if (((s = l.shared.pending), s === null)) break;
        ((v = s), (s = v.next), (v.next = null), (l.lastBaseUpdate = v), (l.shared.pending = null));
      }
    } while (!0);
    if (
      (m === null && (u = h),
      (l.baseState = u),
      (l.firstBaseUpdate = a),
      (l.lastBaseUpdate = m),
      (t = l.shared.interleaved),
      t !== null)
    ) {
      l = t;
      do ((i |= l.lane), (l = l.next));
      while (l !== t);
    } else o === null && (l.shared.lanes = 0);
    ((It |= i), (e.lanes = i), (e.memoizedState = h));
  }
}
function Ou(e, t, n) {
  if (((e = t.effects), (t.effects = null), e !== null))
    for (t = 0; t < e.length; t++) {
      var r = e[t],
        l = r.callback;
      if (l !== null) {
        if (((r.callback = null), (r = n), typeof l != 'function')) throw Error(k(191, l));
        l.call(r);
      }
    }
}
var ur = {},
  Qe = St(ur),
  Jn = St(ur),
  qn = St(ur);
function Mt(e) {
  if (e === ur) throw Error(k(174));
  return e;
}
function Ni(e, t) {
  switch ((F(qn, t), F(Jn, e), F(Qe, ur), (e = t.nodeType), e)) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : fo(null, '');
      break;
    default:
      ((e = e === 8 ? t.parentNode : t),
        (t = e.namespaceURI || null),
        (e = e.tagName),
        (t = fo(t, e)));
  }
  (U(Qe), F(Qe, t));
}
function dn() {
  (U(Qe), U(Jn), U(qn));
}
function Ma(e) {
  Mt(qn.current);
  var t = Mt(Qe.current),
    n = fo(t, e.type);
  t !== n && (F(Jn, e), F(Qe, n));
}
function Ei(e) {
  Jn.current === e && (U(Qe), U(Jn));
}
var W = St(0);
function nl(e) {
  for (var t = e; t !== null; ) {
    if (t.tag === 13) {
      var n = t.memoizedState;
      if (n !== null && ((n = n.dehydrated), n === null || n.data === '$?' || n.data === '$!'))
        return t;
    } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
      if (t.flags & 128) return t;
    } else if (t.child !== null) {
      ((t.child.return = t), (t = t.child));
      continue;
    }
    if (t === e) break;
    for (; t.sibling === null; ) {
      if (t.return === null || t.return === e) return null;
      t = t.return;
    }
    ((t.sibling.return = t.return), (t = t.sibling));
  }
  return null;
}
var Kl = [];
function Ci() {
  for (var e = 0; e < Kl.length; e++) Kl[e]._workInProgressVersionPrimary = null;
  Kl.length = 0;
}
var Or = nt.ReactCurrentDispatcher,
  Yl = nt.ReactCurrentBatchConfig,
  $t = 0,
  Q = null,
  J = null,
  b = null,
  rl = !1,
  $n = !1,
  bn = 0,
  Rd = 0;
function le() {
  throw Error(k(321));
}
function ji(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++) if (!He(e[n], t[n])) return !1;
  return !0;
}
function Pi(e, t, n, r, l, o) {
  if (
    (($t = o),
    (Q = t),
    (t.memoizedState = null),
    (t.updateQueue = null),
    (t.lanes = 0),
    (Or.current = e === null || e.memoizedState === null ? Id : Fd),
    (e = n(r, l)),
    $n)
  ) {
    o = 0;
    do {
      if ((($n = !1), (bn = 0), 25 <= o)) throw Error(k(301));
      ((o += 1), (b = J = null), (t.updateQueue = null), (Or.current = Ad), (e = n(r, l)));
    } while ($n);
  }
  if (
    ((Or.current = ll),
    (t = J !== null && J.next !== null),
    ($t = 0),
    (b = J = Q = null),
    (rl = !1),
    t)
  )
    throw Error(k(300));
  return e;
}
function Ti() {
  var e = bn !== 0;
  return ((bn = 0), e);
}
function Ve() {
  var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  return (b === null ? (Q.memoizedState = b = e) : (b = b.next = e), b);
}
function Le() {
  if (J === null) {
    var e = Q.alternate;
    e = e !== null ? e.memoizedState : null;
  } else e = J.next;
  var t = b === null ? Q.memoizedState : b.next;
  if (t !== null) ((b = t), (J = e));
  else {
    if (e === null) throw Error(k(310));
    ((J = e),
      (e = {
        memoizedState: J.memoizedState,
        baseState: J.baseState,
        baseQueue: J.baseQueue,
        queue: J.queue,
        next: null,
      }),
      b === null ? (Q.memoizedState = b = e) : (b = b.next = e));
  }
  return b;
}
function er(e, t) {
  return typeof t == 'function' ? t(e) : t;
}
function Gl(e) {
  var t = Le(),
    n = t.queue;
  if (n === null) throw Error(k(311));
  n.lastRenderedReducer = e;
  var r = J,
    l = r.baseQueue,
    o = n.pending;
  if (o !== null) {
    if (l !== null) {
      var i = l.next;
      ((l.next = o.next), (o.next = i));
    }
    ((r.baseQueue = l = o), (n.pending = null));
  }
  if (l !== null) {
    ((o = l.next), (r = r.baseState));
    var s = (i = null),
      u = null,
      a = o;
    do {
      var m = a.lane;
      if (($t & m) === m)
        (u !== null &&
          (u = u.next =
            {
              lane: 0,
              action: a.action,
              hasEagerState: a.hasEagerState,
              eagerState: a.eagerState,
              next: null,
            }),
          (r = a.hasEagerState ? a.eagerState : e(r, a.action)));
      else {
        var h = {
          lane: m,
          action: a.action,
          hasEagerState: a.hasEagerState,
          eagerState: a.eagerState,
          next: null,
        };
        (u === null ? ((s = u = h), (i = r)) : (u = u.next = h), (Q.lanes |= m), (It |= m));
      }
      a = a.next;
    } while (a !== null && a !== o);
    (u === null ? (i = r) : (u.next = s),
      He(r, t.memoizedState) || (me = !0),
      (t.memoizedState = r),
      (t.baseState = i),
      (t.baseQueue = u),
      (n.lastRenderedState = r));
  }
  if (((e = n.interleaved), e !== null)) {
    l = e;
    do ((o = l.lane), (Q.lanes |= o), (It |= o), (l = l.next));
    while (l !== e);
  } else l === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function Xl(e) {
  var t = Le(),
    n = t.queue;
  if (n === null) throw Error(k(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch,
    l = n.pending,
    o = t.memoizedState;
  if (l !== null) {
    n.pending = null;
    var i = (l = l.next);
    do ((o = e(o, i.action)), (i = i.next));
    while (i !== l);
    (He(o, t.memoizedState) || (me = !0),
      (t.memoizedState = o),
      t.baseQueue === null && (t.baseState = o),
      (n.lastRenderedState = o));
  }
  return [o, r];
}
function La() {}
function Ra(e, t) {
  var n = Q,
    r = Le(),
    l = t(),
    o = !He(r.memoizedState, l);
  if (
    (o && ((r.memoizedState = l), (me = !0)),
    (r = r.queue),
    zi($a.bind(null, n, r, e), [e]),
    r.getSnapshot !== t || o || (b !== null && b.memoizedState.tag & 1))
  ) {
    if (((n.flags |= 2048), tr(9, Da.bind(null, n, r, l, t), void 0, null), ee === null))
      throw Error(k(349));
    $t & 30 || Oa(n, t, l);
  }
  return l;
}
function Oa(e, t, n) {
  ((e.flags |= 16384),
    (e = { getSnapshot: t, value: n }),
    (t = Q.updateQueue),
    t === null
      ? ((t = { lastEffect: null, stores: null }), (Q.updateQueue = t), (t.stores = [e]))
      : ((n = t.stores), n === null ? (t.stores = [e]) : n.push(e)));
}
function Da(e, t, n, r) {
  ((t.value = n), (t.getSnapshot = r), Ia(t) && Fa(e));
}
function $a(e, t, n) {
  return n(function () {
    Ia(t) && Fa(e);
  });
}
function Ia(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !He(e, n);
  } catch {
    return !0;
  }
}
function Fa(e) {
  var t = et(e, 1);
  t !== null && Ae(t, e, 1, -1);
}
function Du(e) {
  var t = Ve();
  return (
    typeof e == 'function' && (e = e()),
    (t.memoizedState = t.baseState = e),
    (e = {
      pending: null,
      interleaved: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: er,
      lastRenderedState: e,
    }),
    (t.queue = e),
    (e = e.dispatch = $d.bind(null, Q, e)),
    [t.memoizedState, e]
  );
}
function tr(e, t, n, r) {
  return (
    (e = { tag: e, create: t, destroy: n, deps: r, next: null }),
    (t = Q.updateQueue),
    t === null
      ? ((t = { lastEffect: null, stores: null }), (Q.updateQueue = t), (t.lastEffect = e.next = e))
      : ((n = t.lastEffect),
        n === null
          ? (t.lastEffect = e.next = e)
          : ((r = n.next), (n.next = e), (e.next = r), (t.lastEffect = e))),
    e
  );
}
function Aa() {
  return Le().memoizedState;
}
function Dr(e, t, n, r) {
  var l = Ve();
  ((Q.flags |= e), (l.memoizedState = tr(1 | t, n, void 0, r === void 0 ? null : r)));
}
function yl(e, t, n, r) {
  var l = Le();
  r = r === void 0 ? null : r;
  var o = void 0;
  if (J !== null) {
    var i = J.memoizedState;
    if (((o = i.destroy), r !== null && ji(r, i.deps))) {
      l.memoizedState = tr(t, n, o, r);
      return;
    }
  }
  ((Q.flags |= e), (l.memoizedState = tr(1 | t, n, o, r)));
}
function $u(e, t) {
  return Dr(8390656, 8, e, t);
}
function zi(e, t) {
  return yl(2048, 8, e, t);
}
function Ha(e, t) {
  return yl(4, 2, e, t);
}
function Ua(e, t) {
  return yl(4, 4, e, t);
}
function Va(e, t) {
  if (typeof t == 'function')
    return (
      (e = e()),
      t(e),
      function () {
        t(null);
      }
    );
  if (t != null)
    return (
      (e = e()),
      (t.current = e),
      function () {
        t.current = null;
      }
    );
}
function Ba(e, t, n) {
  return ((n = n != null ? n.concat([e]) : null), yl(4, 4, Va.bind(null, t, e), n));
}
function Mi() {}
function Wa(e, t) {
  var n = Le();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && ji(t, r[1]) ? r[0] : ((n.memoizedState = [e, t]), e);
}
function Qa(e, t) {
  var n = Le();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && ji(t, r[1])
    ? r[0]
    : ((e = e()), (n.memoizedState = [e, t]), e);
}
function Ka(e, t, n) {
  return $t & 21
    ? (He(n, t) || ((n = Js()), (Q.lanes |= n), (It |= n), (e.baseState = !0)), t)
    : (e.baseState && ((e.baseState = !1), (me = !0)), (e.memoizedState = n));
}
function Od(e, t) {
  var n = I;
  ((I = n !== 0 && 4 > n ? n : 4), e(!0));
  var r = Yl.transition;
  Yl.transition = {};
  try {
    (e(!1), t());
  } finally {
    ((I = n), (Yl.transition = r));
  }
}
function Ya() {
  return Le().memoizedState;
}
function Dd(e, t, n) {
  var r = gt(e);
  if (((n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }), Ga(e)))
    Xa(t, n);
  else if (((n = Ta(e, t, n, r)), n !== null)) {
    var l = ce();
    (Ae(n, e, r, l), Za(n, t, r));
  }
}
function $d(e, t, n) {
  var r = gt(e),
    l = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (Ga(e)) Xa(t, l);
  else {
    var o = e.alternate;
    if (e.lanes === 0 && (o === null || o.lanes === 0) && ((o = t.lastRenderedReducer), o !== null))
      try {
        var i = t.lastRenderedState,
          s = o(i, n);
        if (((l.hasEagerState = !0), (l.eagerState = s), He(s, i))) {
          var u = t.interleaved;
          (u === null ? ((l.next = l), _i(t)) : ((l.next = u.next), (u.next = l)),
            (t.interleaved = l));
          return;
        }
      } catch {
      } finally {
      }
    ((n = Ta(e, t, l, r)), n !== null && ((l = ce()), Ae(n, e, r, l), Za(n, t, r)));
  }
}
function Ga(e) {
  var t = e.alternate;
  return e === Q || (t !== null && t === Q);
}
function Xa(e, t) {
  $n = rl = !0;
  var n = e.pending;
  (n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)), (e.pending = t));
}
function Za(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    ((r &= e.pendingLanes), (n |= r), (t.lanes = n), si(e, n));
  }
}
var ll = {
    readContext: Me,
    useCallback: le,
    useContext: le,
    useEffect: le,
    useImperativeHandle: le,
    useInsertionEffect: le,
    useLayoutEffect: le,
    useMemo: le,
    useReducer: le,
    useRef: le,
    useState: le,
    useDebugValue: le,
    useDeferredValue: le,
    useTransition: le,
    useMutableSource: le,
    useSyncExternalStore: le,
    useId: le,
    unstable_isNewReconciler: !1,
  },
  Id = {
    readContext: Me,
    useCallback: function (e, t) {
      return ((Ve().memoizedState = [e, t === void 0 ? null : t]), e);
    },
    useContext: Me,
    useEffect: $u,
    useImperativeHandle: function (e, t, n) {
      return ((n = n != null ? n.concat([e]) : null), Dr(4194308, 4, Va.bind(null, t, e), n));
    },
    useLayoutEffect: function (e, t) {
      return Dr(4194308, 4, e, t);
    },
    useInsertionEffect: function (e, t) {
      return Dr(4, 2, e, t);
    },
    useMemo: function (e, t) {
      var n = Ve();
      return ((t = t === void 0 ? null : t), (e = e()), (n.memoizedState = [e, t]), e);
    },
    useReducer: function (e, t, n) {
      var r = Ve();
      return (
        (t = n !== void 0 ? n(t) : t),
        (r.memoizedState = r.baseState = t),
        (e = {
          pending: null,
          interleaved: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: e,
          lastRenderedState: t,
        }),
        (r.queue = e),
        (e = e.dispatch = Dd.bind(null, Q, e)),
        [r.memoizedState, e]
      );
    },
    useRef: function (e) {
      var t = Ve();
      return ((e = { current: e }), (t.memoizedState = e));
    },
    useState: Du,
    useDebugValue: Mi,
    useDeferredValue: function (e) {
      return (Ve().memoizedState = e);
    },
    useTransition: function () {
      var e = Du(!1),
        t = e[0];
      return ((e = Od.bind(null, e[1])), (Ve().memoizedState = e), [t, e]);
    },
    useMutableSource: function () {},
    useSyncExternalStore: function (e, t, n) {
      var r = Q,
        l = Ve();
      if (V) {
        if (n === void 0) throw Error(k(407));
        n = n();
      } else {
        if (((n = t()), ee === null)) throw Error(k(349));
        $t & 30 || Oa(r, t, n);
      }
      l.memoizedState = n;
      var o = { value: n, getSnapshot: t };
      return (
        (l.queue = o),
        $u($a.bind(null, r, o, e), [e]),
        (r.flags |= 2048),
        tr(9, Da.bind(null, r, o, n, t), void 0, null),
        n
      );
    },
    useId: function () {
      var e = Ve(),
        t = ee.identifierPrefix;
      if (V) {
        var n = Ze,
          r = Xe;
        ((n = (r & ~(1 << (32 - Fe(r) - 1))).toString(32) + n),
          (t = ':' + t + 'R' + n),
          (n = bn++),
          0 < n && (t += 'H' + n.toString(32)),
          (t += ':'));
      } else ((n = Rd++), (t = ':' + t + 'r' + n.toString(32) + ':'));
      return (e.memoizedState = t);
    },
    unstable_isNewReconciler: !1,
  },
  Fd = {
    readContext: Me,
    useCallback: Wa,
    useContext: Me,
    useEffect: zi,
    useImperativeHandle: Ba,
    useInsertionEffect: Ha,
    useLayoutEffect: Ua,
    useMemo: Qa,
    useReducer: Gl,
    useRef: Aa,
    useState: function () {
      return Gl(er);
    },
    useDebugValue: Mi,
    useDeferredValue: function (e) {
      var t = Le();
      return Ka(t, J.memoizedState, e);
    },
    useTransition: function () {
      var e = Gl(er)[0],
        t = Le().memoizedState;
      return [e, t];
    },
    useMutableSource: La,
    useSyncExternalStore: Ra,
    useId: Ya,
    unstable_isNewReconciler: !1,
  },
  Ad = {
    readContext: Me,
    useCallback: Wa,
    useContext: Me,
    useEffect: zi,
    useImperativeHandle: Ba,
    useInsertionEffect: Ha,
    useLayoutEffect: Ua,
    useMemo: Qa,
    useReducer: Xl,
    useRef: Aa,
    useState: function () {
      return Xl(er);
    },
    useDebugValue: Mi,
    useDeferredValue: function (e) {
      var t = Le();
      return J === null ? (t.memoizedState = e) : Ka(t, J.memoizedState, e);
    },
    useTransition: function () {
      var e = Xl(er)[0],
        t = Le().memoizedState;
      return [e, t];
    },
    useMutableSource: La,
    useSyncExternalStore: Ra,
    useId: Ya,
    unstable_isNewReconciler: !1,
  };
function De(e, t) {
  if (e && e.defaultProps) {
    ((t = K({}, t)), (e = e.defaultProps));
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function Ro(e, t, n, r) {
  ((t = e.memoizedState),
    (n = n(r, t)),
    (n = n == null ? t : K({}, t, n)),
    (e.memoizedState = n),
    e.lanes === 0 && (e.updateQueue.baseState = n));
}
var gl = {
  isMounted: function (e) {
    return (e = e._reactInternals) ? Ut(e) === e : !1;
  },
  enqueueSetState: function (e, t, n) {
    e = e._reactInternals;
    var r = ce(),
      l = gt(e),
      o = Je(r, l);
    ((o.payload = t),
      n != null && (o.callback = n),
      (t = vt(e, o, l)),
      t !== null && (Ae(t, e, l, r), Rr(t, e, l)));
  },
  enqueueReplaceState: function (e, t, n) {
    e = e._reactInternals;
    var r = ce(),
      l = gt(e),
      o = Je(r, l);
    ((o.tag = 1),
      (o.payload = t),
      n != null && (o.callback = n),
      (t = vt(e, o, l)),
      t !== null && (Ae(t, e, l, r), Rr(t, e, l)));
  },
  enqueueForceUpdate: function (e, t) {
    e = e._reactInternals;
    var n = ce(),
      r = gt(e),
      l = Je(n, r);
    ((l.tag = 2),
      t != null && (l.callback = t),
      (t = vt(e, l, r)),
      t !== null && (Ae(t, e, r, n), Rr(t, e, r)));
  },
};
function Iu(e, t, n, r, l, o, i) {
  return (
    (e = e.stateNode),
    typeof e.shouldComponentUpdate == 'function'
      ? e.shouldComponentUpdate(r, o, i)
      : t.prototype && t.prototype.isPureReactComponent
        ? !Yn(n, r) || !Yn(l, o)
        : !0
  );
}
function Ja(e, t, n) {
  var r = !1,
    l = xt,
    o = t.contextType;
  return (
    typeof o == 'object' && o !== null
      ? (o = Me(o))
      : ((l = ve(t) ? Ot : ue.current),
        (r = t.contextTypes),
        (o = (r = r != null) ? an(e, l) : xt)),
    (t = new t(n, o)),
    (e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null),
    (t.updater = gl),
    (e.stateNode = t),
    (t._reactInternals = e),
    r &&
      ((e = e.stateNode),
      (e.__reactInternalMemoizedUnmaskedChildContext = l),
      (e.__reactInternalMemoizedMaskedChildContext = o)),
    t
  );
}
function Fu(e, t, n, r) {
  ((e = t.state),
    typeof t.componentWillReceiveProps == 'function' && t.componentWillReceiveProps(n, r),
    typeof t.UNSAFE_componentWillReceiveProps == 'function' &&
      t.UNSAFE_componentWillReceiveProps(n, r),
    t.state !== e && gl.enqueueReplaceState(t, t.state, null));
}
function Oo(e, t, n, r) {
  var l = e.stateNode;
  ((l.props = n), (l.state = e.memoizedState), (l.refs = {}), Si(e));
  var o = t.contextType;
  (typeof o == 'object' && o !== null
    ? (l.context = Me(o))
    : ((o = ve(t) ? Ot : ue.current), (l.context = an(e, o))),
    (l.state = e.memoizedState),
    (o = t.getDerivedStateFromProps),
    typeof o == 'function' && (Ro(e, t, o, n), (l.state = e.memoizedState)),
    typeof t.getDerivedStateFromProps == 'function' ||
      typeof l.getSnapshotBeforeUpdate == 'function' ||
      (typeof l.UNSAFE_componentWillMount != 'function' &&
        typeof l.componentWillMount != 'function') ||
      ((t = l.state),
      typeof l.componentWillMount == 'function' && l.componentWillMount(),
      typeof l.UNSAFE_componentWillMount == 'function' && l.UNSAFE_componentWillMount(),
      t !== l.state && gl.enqueueReplaceState(l, l.state, null),
      tl(e, n, l, r),
      (l.state = e.memoizedState)),
    typeof l.componentDidMount == 'function' && (e.flags |= 4194308));
}
function pn(e, t) {
  try {
    var n = '',
      r = t;
    do ((n += pf(r)), (r = r.return));
    while (r);
    var l = n;
  } catch (o) {
    l =
      `
Error generating stack: ` +
      o.message +
      `
` +
      o.stack;
  }
  return { value: e, source: t, stack: l, digest: null };
}
function Zl(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function Do(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function () {
      throw n;
    });
  }
}
var Hd = typeof WeakMap == 'function' ? WeakMap : Map;
function qa(e, t, n) {
  ((n = Je(-1, n)), (n.tag = 3), (n.payload = { element: null }));
  var r = t.value;
  return (
    (n.callback = function () {
      (il || ((il = !0), (Qo = r)), Do(e, t));
    }),
    n
  );
}
function ba(e, t, n) {
  ((n = Je(-1, n)), (n.tag = 3));
  var r = e.type.getDerivedStateFromError;
  if (typeof r == 'function') {
    var l = t.value;
    ((n.payload = function () {
      return r(l);
    }),
      (n.callback = function () {
        Do(e, t);
      }));
  }
  var o = e.stateNode;
  return (
    o !== null &&
      typeof o.componentDidCatch == 'function' &&
      (n.callback = function () {
        (Do(e, t), typeof r != 'function' && (yt === null ? (yt = new Set([this])) : yt.add(this)));
        var i = t.stack;
        this.componentDidCatch(t.value, { componentStack: i !== null ? i : '' });
      }),
    n
  );
}
function Au(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new Hd();
    var l = new Set();
    r.set(t, l);
  } else ((l = r.get(t)), l === void 0 && ((l = new Set()), r.set(t, l)));
  l.has(n) || (l.add(n), (e = ep.bind(null, e, t, n)), t.then(e, e));
}
function Hu(e) {
  do {
    var t;
    if (
      ((t = e.tag === 13) && ((t = e.memoizedState), (t = t !== null ? t.dehydrated !== null : !0)),
      t)
    )
      return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function Uu(e, t, n, r, l) {
  return e.mode & 1
    ? ((e.flags |= 65536), (e.lanes = l), e)
    : (e === t
        ? (e.flags |= 65536)
        : ((e.flags |= 128),
          (n.flags |= 131072),
          (n.flags &= -52805),
          n.tag === 1 &&
            (n.alternate === null ? (n.tag = 17) : ((t = Je(-1, 1)), (t.tag = 2), vt(n, t, 1))),
          (n.lanes |= 1)),
      e);
}
var Ud = nt.ReactCurrentOwner,
  me = !1;
function se(e, t, n, r) {
  t.child = e === null ? Pa(t, null, n, r) : fn(t, e.child, n, r);
}
function Vu(e, t, n, r, l) {
  n = n.render;
  var o = t.ref;
  return (
    on(t, l),
    (r = Pi(e, t, n, r, o, l)),
    (n = Ti()),
    e !== null && !me
      ? ((t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~l), tt(e, t, l))
      : (V && n && vi(t), (t.flags |= 1), se(e, t, r, l), t.child)
  );
}
function Bu(e, t, n, r, l) {
  if (e === null) {
    var o = n.type;
    return typeof o == 'function' &&
      !Ai(o) &&
      o.defaultProps === void 0 &&
      n.compare === null &&
      n.defaultProps === void 0
      ? ((t.tag = 15), (t.type = o), ec(e, t, o, r, l))
      : ((e = Ar(n.type, null, r, t, t.mode, l)), (e.ref = t.ref), (e.return = t), (t.child = e));
  }
  if (((o = e.child), !(e.lanes & l))) {
    var i = o.memoizedProps;
    if (((n = n.compare), (n = n !== null ? n : Yn), n(i, r) && e.ref === t.ref))
      return tt(e, t, l);
  }
  return ((t.flags |= 1), (e = wt(o, r)), (e.ref = t.ref), (e.return = t), (t.child = e));
}
function ec(e, t, n, r, l) {
  if (e !== null) {
    var o = e.memoizedProps;
    if (Yn(o, r) && e.ref === t.ref)
      if (((me = !1), (t.pendingProps = r = o), (e.lanes & l) !== 0)) e.flags & 131072 && (me = !0);
      else return ((t.lanes = e.lanes), tt(e, t, l));
  }
  return $o(e, t, n, r, l);
}
function tc(e, t, n) {
  var r = t.pendingProps,
    l = r.children,
    o = e !== null ? e.memoizedState : null;
  if (r.mode === 'hidden')
    if (!(t.mode & 1))
      ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
        F(en, ke),
        (ke |= n));
    else {
      if (!(n & 1073741824))
        return (
          (e = o !== null ? o.baseLanes | n : n),
          (t.lanes = t.childLanes = 1073741824),
          (t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }),
          (t.updateQueue = null),
          F(en, ke),
          (ke |= e),
          null
        );
      ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
        (r = o !== null ? o.baseLanes : n),
        F(en, ke),
        (ke |= r));
    }
  else
    (o !== null ? ((r = o.baseLanes | n), (t.memoizedState = null)) : (r = n),
      F(en, ke),
      (ke |= r));
  return (se(e, t, l, n), t.child);
}
function nc(e, t) {
  var n = t.ref;
  ((e === null && n !== null) || (e !== null && e.ref !== n)) &&
    ((t.flags |= 512), (t.flags |= 2097152));
}
function $o(e, t, n, r, l) {
  var o = ve(n) ? Ot : ue.current;
  return (
    (o = an(t, o)),
    on(t, l),
    (n = Pi(e, t, n, r, o, l)),
    (r = Ti()),
    e !== null && !me
      ? ((t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~l), tt(e, t, l))
      : (V && r && vi(t), (t.flags |= 1), se(e, t, n, l), t.child)
  );
}
function Wu(e, t, n, r, l) {
  if (ve(n)) {
    var o = !0;
    Zr(t);
  } else o = !1;
  if ((on(t, l), t.stateNode === null)) ($r(e, t), Ja(t, n, r), Oo(t, n, r, l), (r = !0));
  else if (e === null) {
    var i = t.stateNode,
      s = t.memoizedProps;
    i.props = s;
    var u = i.context,
      a = n.contextType;
    typeof a == 'object' && a !== null
      ? (a = Me(a))
      : ((a = ve(n) ? Ot : ue.current), (a = an(t, a)));
    var m = n.getDerivedStateFromProps,
      h = typeof m == 'function' || typeof i.getSnapshotBeforeUpdate == 'function';
    (h ||
      (typeof i.UNSAFE_componentWillReceiveProps != 'function' &&
        typeof i.componentWillReceiveProps != 'function') ||
      ((s !== r || u !== a) && Fu(t, i, r, a)),
      (ut = !1));
    var v = t.memoizedState;
    ((i.state = v),
      tl(t, r, i, l),
      (u = t.memoizedState),
      s !== r || v !== u || he.current || ut
        ? (typeof m == 'function' && (Ro(t, n, m, r), (u = t.memoizedState)),
          (s = ut || Iu(t, n, s, r, v, u, a))
            ? (h ||
                (typeof i.UNSAFE_componentWillMount != 'function' &&
                  typeof i.componentWillMount != 'function') ||
                (typeof i.componentWillMount == 'function' && i.componentWillMount(),
                typeof i.UNSAFE_componentWillMount == 'function' && i.UNSAFE_componentWillMount()),
              typeof i.componentDidMount == 'function' && (t.flags |= 4194308))
            : (typeof i.componentDidMount == 'function' && (t.flags |= 4194308),
              (t.memoizedProps = r),
              (t.memoizedState = u)),
          (i.props = r),
          (i.state = u),
          (i.context = a),
          (r = s))
        : (typeof i.componentDidMount == 'function' && (t.flags |= 4194308), (r = !1)));
  } else {
    ((i = t.stateNode),
      za(e, t),
      (s = t.memoizedProps),
      (a = t.type === t.elementType ? s : De(t.type, s)),
      (i.props = a),
      (h = t.pendingProps),
      (v = i.context),
      (u = n.contextType),
      typeof u == 'object' && u !== null
        ? (u = Me(u))
        : ((u = ve(n) ? Ot : ue.current), (u = an(t, u))));
    var g = n.getDerivedStateFromProps;
    ((m = typeof g == 'function' || typeof i.getSnapshotBeforeUpdate == 'function') ||
      (typeof i.UNSAFE_componentWillReceiveProps != 'function' &&
        typeof i.componentWillReceiveProps != 'function') ||
      ((s !== h || v !== u) && Fu(t, i, r, u)),
      (ut = !1),
      (v = t.memoizedState),
      (i.state = v),
      tl(t, r, i, l));
    var y = t.memoizedState;
    s !== h || v !== y || he.current || ut
      ? (typeof g == 'function' && (Ro(t, n, g, r), (y = t.memoizedState)),
        (a = ut || Iu(t, n, a, r, v, y, u) || !1)
          ? (m ||
              (typeof i.UNSAFE_componentWillUpdate != 'function' &&
                typeof i.componentWillUpdate != 'function') ||
              (typeof i.componentWillUpdate == 'function' && i.componentWillUpdate(r, y, u),
              typeof i.UNSAFE_componentWillUpdate == 'function' &&
                i.UNSAFE_componentWillUpdate(r, y, u)),
            typeof i.componentDidUpdate == 'function' && (t.flags |= 4),
            typeof i.getSnapshotBeforeUpdate == 'function' && (t.flags |= 1024))
          : (typeof i.componentDidUpdate != 'function' ||
              (s === e.memoizedProps && v === e.memoizedState) ||
              (t.flags |= 4),
            typeof i.getSnapshotBeforeUpdate != 'function' ||
              (s === e.memoizedProps && v === e.memoizedState) ||
              (t.flags |= 1024),
            (t.memoizedProps = r),
            (t.memoizedState = y)),
        (i.props = r),
        (i.state = y),
        (i.context = u),
        (r = a))
      : (typeof i.componentDidUpdate != 'function' ||
          (s === e.memoizedProps && v === e.memoizedState) ||
          (t.flags |= 4),
        typeof i.getSnapshotBeforeUpdate != 'function' ||
          (s === e.memoizedProps && v === e.memoizedState) ||
          (t.flags |= 1024),
        (r = !1));
  }
  return Io(e, t, n, r, o, l);
}
function Io(e, t, n, r, l, o) {
  nc(e, t);
  var i = (t.flags & 128) !== 0;
  if (!r && !i) return (l && Tu(t, n, !1), tt(e, t, o));
  ((r = t.stateNode), (Ud.current = t));
  var s = i && typeof n.getDerivedStateFromError != 'function' ? null : r.render();
  return (
    (t.flags |= 1),
    e !== null && i
      ? ((t.child = fn(t, e.child, null, o)), (t.child = fn(t, null, s, o)))
      : se(e, t, s, o),
    (t.memoizedState = r.state),
    l && Tu(t, n, !0),
    t.child
  );
}
function rc(e) {
  var t = e.stateNode;
  (t.pendingContext
    ? Pu(e, t.pendingContext, t.pendingContext !== t.context)
    : t.context && Pu(e, t.context, !1),
    Ni(e, t.containerInfo));
}
function Qu(e, t, n, r, l) {
  return (cn(), gi(l), (t.flags |= 256), se(e, t, n, r), t.child);
}
var Fo = { dehydrated: null, treeContext: null, retryLane: 0 };
function Ao(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function lc(e, t, n) {
  var r = t.pendingProps,
    l = W.current,
    o = !1,
    i = (t.flags & 128) !== 0,
    s;
  if (
    ((s = i) || (s = e !== null && e.memoizedState === null ? !1 : (l & 2) !== 0),
    s ? ((o = !0), (t.flags &= -129)) : (e === null || e.memoizedState !== null) && (l |= 1),
    F(W, l & 1),
    e === null)
  )
    return (
      Mo(t),
      (e = t.memoizedState),
      e !== null && ((e = e.dehydrated), e !== null)
        ? (t.mode & 1 ? (e.data === '$!' ? (t.lanes = 8) : (t.lanes = 1073741824)) : (t.lanes = 1),
          null)
        : ((i = r.children),
          (e = r.fallback),
          o
            ? ((r = t.mode),
              (o = t.child),
              (i = { mode: 'hidden', children: i }),
              !(r & 1) && o !== null
                ? ((o.childLanes = 0), (o.pendingProps = i))
                : (o = xl(i, r, 0, null)),
              (e = Rt(e, r, n, null)),
              (o.return = t),
              (e.return = t),
              (o.sibling = e),
              (t.child = o),
              (t.child.memoizedState = Ao(n)),
              (t.memoizedState = Fo),
              e)
            : Li(t, i))
    );
  if (((l = e.memoizedState), l !== null && ((s = l.dehydrated), s !== null)))
    return Vd(e, t, i, r, s, l, n);
  if (o) {
    ((o = r.fallback), (i = t.mode), (l = e.child), (s = l.sibling));
    var u = { mode: 'hidden', children: r.children };
    return (
      !(i & 1) && t.child !== l
        ? ((r = t.child), (r.childLanes = 0), (r.pendingProps = u), (t.deletions = null))
        : ((r = wt(l, u)), (r.subtreeFlags = l.subtreeFlags & 14680064)),
      s !== null ? (o = wt(s, o)) : ((o = Rt(o, i, n, null)), (o.flags |= 2)),
      (o.return = t),
      (r.return = t),
      (r.sibling = o),
      (t.child = r),
      (r = o),
      (o = t.child),
      (i = e.child.memoizedState),
      (i =
        i === null
          ? Ao(n)
          : { baseLanes: i.baseLanes | n, cachePool: null, transitions: i.transitions }),
      (o.memoizedState = i),
      (o.childLanes = e.childLanes & ~n),
      (t.memoizedState = Fo),
      r
    );
  }
  return (
    (o = e.child),
    (e = o.sibling),
    (r = wt(o, { mode: 'visible', children: r.children })),
    !(t.mode & 1) && (r.lanes = n),
    (r.return = t),
    (r.sibling = null),
    e !== null &&
      ((n = t.deletions), n === null ? ((t.deletions = [e]), (t.flags |= 16)) : n.push(e)),
    (t.child = r),
    (t.memoizedState = null),
    r
  );
}
function Li(e, t) {
  return (
    (t = xl({ mode: 'visible', children: t }, e.mode, 0, null)),
    (t.return = e),
    (e.child = t)
  );
}
function Sr(e, t, n, r) {
  return (
    r !== null && gi(r),
    fn(t, e.child, null, n),
    (e = Li(t, t.pendingProps.children)),
    (e.flags |= 2),
    (t.memoizedState = null),
    e
  );
}
function Vd(e, t, n, r, l, o, i) {
  if (n)
    return t.flags & 256
      ? ((t.flags &= -257), (r = Zl(Error(k(422)))), Sr(e, t, i, r))
      : t.memoizedState !== null
        ? ((t.child = e.child), (t.flags |= 128), null)
        : ((o = r.fallback),
          (l = t.mode),
          (r = xl({ mode: 'visible', children: r.children }, l, 0, null)),
          (o = Rt(o, l, i, null)),
          (o.flags |= 2),
          (r.return = t),
          (o.return = t),
          (r.sibling = o),
          (t.child = r),
          t.mode & 1 && fn(t, e.child, null, i),
          (t.child.memoizedState = Ao(i)),
          (t.memoizedState = Fo),
          o);
  if (!(t.mode & 1)) return Sr(e, t, i, null);
  if (l.data === '$!') {
    if (((r = l.nextSibling && l.nextSibling.dataset), r)) var s = r.dgst;
    return ((r = s), (o = Error(k(419))), (r = Zl(o, r, void 0)), Sr(e, t, i, r));
  }
  if (((s = (i & e.childLanes) !== 0), me || s)) {
    if (((r = ee), r !== null)) {
      switch (i & -i) {
        case 4:
          l = 2;
          break;
        case 16:
          l = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          l = 32;
          break;
        case 536870912:
          l = 268435456;
          break;
        default:
          l = 0;
      }
      ((l = l & (r.suspendedLanes | i) ? 0 : l),
        l !== 0 && l !== o.retryLane && ((o.retryLane = l), et(e, l), Ae(r, e, l, -1)));
    }
    return (Fi(), (r = Zl(Error(k(421)))), Sr(e, t, i, r));
  }
  return l.data === '$?'
    ? ((t.flags |= 128), (t.child = e.child), (t = tp.bind(null, e)), (l._reactRetry = t), null)
    : ((e = o.treeContext),
      (xe = ht(l.nextSibling)),
      (_e = t),
      (V = !0),
      (Ie = null),
      e !== null &&
        ((je[Pe++] = Xe),
        (je[Pe++] = Ze),
        (je[Pe++] = Dt),
        (Xe = e.id),
        (Ze = e.overflow),
        (Dt = t)),
      (t = Li(t, r.children)),
      (t.flags |= 4096),
      t);
}
function Ku(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  (r !== null && (r.lanes |= t), Lo(e.return, t, n));
}
function Jl(e, t, n, r, l) {
  var o = e.memoizedState;
  o === null
    ? (e.memoizedState = {
        isBackwards: t,
        rendering: null,
        renderingStartTime: 0,
        last: r,
        tail: n,
        tailMode: l,
      })
    : ((o.isBackwards = t),
      (o.rendering = null),
      (o.renderingStartTime = 0),
      (o.last = r),
      (o.tail = n),
      (o.tailMode = l));
}
function oc(e, t, n) {
  var r = t.pendingProps,
    l = r.revealOrder,
    o = r.tail;
  if ((se(e, t, r.children, n), (r = W.current), r & 2)) ((r = (r & 1) | 2), (t.flags |= 128));
  else {
    if (e !== null && e.flags & 128)
      e: for (e = t.child; e !== null; ) {
        if (e.tag === 13) e.memoizedState !== null && Ku(e, n, t);
        else if (e.tag === 19) Ku(e, n, t);
        else if (e.child !== null) {
          ((e.child.return = e), (e = e.child));
          continue;
        }
        if (e === t) break e;
        for (; e.sibling === null; ) {
          if (e.return === null || e.return === t) break e;
          e = e.return;
        }
        ((e.sibling.return = e.return), (e = e.sibling));
      }
    r &= 1;
  }
  if ((F(W, r), !(t.mode & 1))) t.memoizedState = null;
  else
    switch (l) {
      case 'forwards':
        for (n = t.child, l = null; n !== null; )
          ((e = n.alternate), e !== null && nl(e) === null && (l = n), (n = n.sibling));
        ((n = l),
          n === null ? ((l = t.child), (t.child = null)) : ((l = n.sibling), (n.sibling = null)),
          Jl(t, !1, l, n, o));
        break;
      case 'backwards':
        for (n = null, l = t.child, t.child = null; l !== null; ) {
          if (((e = l.alternate), e !== null && nl(e) === null)) {
            t.child = l;
            break;
          }
          ((e = l.sibling), (l.sibling = n), (n = l), (l = e));
        }
        Jl(t, !0, n, null, o);
        break;
      case 'together':
        Jl(t, !1, null, null, void 0);
        break;
      default:
        t.memoizedState = null;
    }
  return t.child;
}
function $r(e, t) {
  !(t.mode & 1) && e !== null && ((e.alternate = null), (t.alternate = null), (t.flags |= 2));
}
function tt(e, t, n) {
  if ((e !== null && (t.dependencies = e.dependencies), (It |= t.lanes), !(n & t.childLanes)))
    return null;
  if (e !== null && t.child !== e.child) throw Error(k(153));
  if (t.child !== null) {
    for (e = t.child, n = wt(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; )
      ((e = e.sibling), (n = n.sibling = wt(e, e.pendingProps)), (n.return = t));
    n.sibling = null;
  }
  return t.child;
}
function Bd(e, t, n) {
  switch (t.tag) {
    case 3:
      (rc(t), cn());
      break;
    case 5:
      Ma(t);
      break;
    case 1:
      ve(t.type) && Zr(t);
      break;
    case 4:
      Ni(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context,
        l = t.memoizedProps.value;
      (F(br, r._currentValue), (r._currentValue = l));
      break;
    case 13:
      if (((r = t.memoizedState), r !== null))
        return r.dehydrated !== null
          ? (F(W, W.current & 1), (t.flags |= 128), null)
          : n & t.child.childLanes
            ? lc(e, t, n)
            : (F(W, W.current & 1), (e = tt(e, t, n)), e !== null ? e.sibling : null);
      F(W, W.current & 1);
      break;
    case 19:
      if (((r = (n & t.childLanes) !== 0), e.flags & 128)) {
        if (r) return oc(e, t, n);
        t.flags |= 128;
      }
      if (
        ((l = t.memoizedState),
        l !== null && ((l.rendering = null), (l.tail = null), (l.lastEffect = null)),
        F(W, W.current),
        r)
      )
        break;
      return null;
    case 22:
    case 23:
      return ((t.lanes = 0), tc(e, t, n));
  }
  return tt(e, t, n);
}
var ic, Ho, uc, sc;
ic = function (e, t) {
  for (var n = t.child; n !== null; ) {
    if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
    else if (n.tag !== 4 && n.child !== null) {
      ((n.child.return = n), (n = n.child));
      continue;
    }
    if (n === t) break;
    for (; n.sibling === null; ) {
      if (n.return === null || n.return === t) return;
      n = n.return;
    }
    ((n.sibling.return = n.return), (n = n.sibling));
  }
};
Ho = function () {};
uc = function (e, t, n, r) {
  var l = e.memoizedProps;
  if (l !== r) {
    ((e = t.stateNode), Mt(Qe.current));
    var o = null;
    switch (n) {
      case 'input':
        ((l = uo(e, l)), (r = uo(e, r)), (o = []));
        break;
      case 'select':
        ((l = K({}, l, { value: void 0 })), (r = K({}, r, { value: void 0 })), (o = []));
        break;
      case 'textarea':
        ((l = co(e, l)), (r = co(e, r)), (o = []));
        break;
      default:
        typeof l.onClick != 'function' && typeof r.onClick == 'function' && (e.onclick = Gr);
    }
    po(n, r);
    var i;
    n = null;
    for (a in l)
      if (!r.hasOwnProperty(a) && l.hasOwnProperty(a) && l[a] != null)
        if (a === 'style') {
          var s = l[a];
          for (i in s) s.hasOwnProperty(i) && (n || (n = {}), (n[i] = ''));
        } else
          a !== 'dangerouslySetInnerHTML' &&
            a !== 'children' &&
            a !== 'suppressContentEditableWarning' &&
            a !== 'suppressHydrationWarning' &&
            a !== 'autoFocus' &&
            (Hn.hasOwnProperty(a) ? o || (o = []) : (o = o || []).push(a, null));
    for (a in r) {
      var u = r[a];
      if (
        ((s = l != null ? l[a] : void 0),
        r.hasOwnProperty(a) && u !== s && (u != null || s != null))
      )
        if (a === 'style')
          if (s) {
            for (i in s)
              !s.hasOwnProperty(i) || (u && u.hasOwnProperty(i)) || (n || (n = {}), (n[i] = ''));
            for (i in u) u.hasOwnProperty(i) && s[i] !== u[i] && (n || (n = {}), (n[i] = u[i]));
          } else (n || (o || (o = []), o.push(a, n)), (n = u));
        else
          a === 'dangerouslySetInnerHTML'
            ? ((u = u ? u.__html : void 0),
              (s = s ? s.__html : void 0),
              u != null && s !== u && (o = o || []).push(a, u))
            : a === 'children'
              ? (typeof u != 'string' && typeof u != 'number') || (o = o || []).push(a, '' + u)
              : a !== 'suppressContentEditableWarning' &&
                a !== 'suppressHydrationWarning' &&
                (Hn.hasOwnProperty(a)
                  ? (u != null && a === 'onScroll' && H('scroll', e), o || s === u || (o = []))
                  : (o = o || []).push(a, u));
    }
    n && (o = o || []).push('style', n);
    var a = o;
    (t.updateQueue = a) && (t.flags |= 4);
  }
};
sc = function (e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function En(e, t) {
  if (!V)
    switch (e.tailMode) {
      case 'hidden':
        t = e.tail;
        for (var n = null; t !== null; ) (t.alternate !== null && (n = t), (t = t.sibling));
        n === null ? (e.tail = null) : (n.sibling = null);
        break;
      case 'collapsed':
        n = e.tail;
        for (var r = null; n !== null; ) (n.alternate !== null && (r = n), (n = n.sibling));
        r === null
          ? t || e.tail === null
            ? (e.tail = null)
            : (e.tail.sibling = null)
          : (r.sibling = null);
    }
}
function oe(e) {
  var t = e.alternate !== null && e.alternate.child === e.child,
    n = 0,
    r = 0;
  if (t)
    for (var l = e.child; l !== null; )
      ((n |= l.lanes | l.childLanes),
        (r |= l.subtreeFlags & 14680064),
        (r |= l.flags & 14680064),
        (l.return = e),
        (l = l.sibling));
  else
    for (l = e.child; l !== null; )
      ((n |= l.lanes | l.childLanes),
        (r |= l.subtreeFlags),
        (r |= l.flags),
        (l.return = e),
        (l = l.sibling));
  return ((e.subtreeFlags |= r), (e.childLanes = n), t);
}
function Wd(e, t, n) {
  var r = t.pendingProps;
  switch ((yi(t), t.tag)) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return (oe(t), null);
    case 1:
      return (ve(t.type) && Xr(), oe(t), null);
    case 3:
      return (
        (r = t.stateNode),
        dn(),
        U(he),
        U(ue),
        Ci(),
        r.pendingContext && ((r.context = r.pendingContext), (r.pendingContext = null)),
        (e === null || e.child === null) &&
          (xr(t)
            ? (t.flags |= 4)
            : e === null ||
              (e.memoizedState.isDehydrated && !(t.flags & 256)) ||
              ((t.flags |= 1024), Ie !== null && (Go(Ie), (Ie = null)))),
        Ho(e, t),
        oe(t),
        null
      );
    case 5:
      Ei(t);
      var l = Mt(qn.current);
      if (((n = t.type), e !== null && t.stateNode != null))
        (uc(e, t, n, r, l), e.ref !== t.ref && ((t.flags |= 512), (t.flags |= 2097152)));
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(k(166));
          return (oe(t), null);
        }
        if (((e = Mt(Qe.current)), xr(t))) {
          ((r = t.stateNode), (n = t.type));
          var o = t.memoizedProps;
          switch (((r[Be] = t), (r[Zn] = o), (e = (t.mode & 1) !== 0), n)) {
            case 'dialog':
              (H('cancel', r), H('close', r));
              break;
            case 'iframe':
            case 'object':
            case 'embed':
              H('load', r);
              break;
            case 'video':
            case 'audio':
              for (l = 0; l < zn.length; l++) H(zn[l], r);
              break;
            case 'source':
              H('error', r);
              break;
            case 'img':
            case 'image':
            case 'link':
              (H('error', r), H('load', r));
              break;
            case 'details':
              H('toggle', r);
              break;
            case 'input':
              (tu(r, o), H('invalid', r));
              break;
            case 'select':
              ((r._wrapperState = { wasMultiple: !!o.multiple }), H('invalid', r));
              break;
            case 'textarea':
              (ru(r, o), H('invalid', r));
          }
          (po(n, o), (l = null));
          for (var i in o)
            if (o.hasOwnProperty(i)) {
              var s = o[i];
              i === 'children'
                ? typeof s == 'string'
                  ? r.textContent !== s &&
                    (o.suppressHydrationWarning !== !0 && kr(r.textContent, s, e),
                    (l = ['children', s]))
                  : typeof s == 'number' &&
                    r.textContent !== '' + s &&
                    (o.suppressHydrationWarning !== !0 && kr(r.textContent, s, e),
                    (l = ['children', '' + s]))
                : Hn.hasOwnProperty(i) && s != null && i === 'onScroll' && H('scroll', r);
            }
          switch (n) {
            case 'input':
              (dr(r), nu(r, o, !0));
              break;
            case 'textarea':
              (dr(r), lu(r));
              break;
            case 'select':
            case 'option':
              break;
            default:
              typeof o.onClick == 'function' && (r.onclick = Gr);
          }
          ((r = l), (t.updateQueue = r), r !== null && (t.flags |= 4));
        } else {
          ((i = l.nodeType === 9 ? l : l.ownerDocument),
            e === 'http://www.w3.org/1999/xhtml' && (e = $s(n)),
            e === 'http://www.w3.org/1999/xhtml'
              ? n === 'script'
                ? ((e = i.createElement('div')),
                  (e.innerHTML = '<script><\/script>'),
                  (e = e.removeChild(e.firstChild)))
                : typeof r.is == 'string'
                  ? (e = i.createElement(n, { is: r.is }))
                  : ((e = i.createElement(n)),
                    n === 'select' &&
                      ((i = e), r.multiple ? (i.multiple = !0) : r.size && (i.size = r.size)))
              : (e = i.createElementNS(e, n)),
            (e[Be] = t),
            (e[Zn] = r),
            ic(e, t, !1, !1),
            (t.stateNode = e));
          e: {
            switch (((i = mo(n, r)), n)) {
              case 'dialog':
                (H('cancel', e), H('close', e), (l = r));
                break;
              case 'iframe':
              case 'object':
              case 'embed':
                (H('load', e), (l = r));
                break;
              case 'video':
              case 'audio':
                for (l = 0; l < zn.length; l++) H(zn[l], e);
                l = r;
                break;
              case 'source':
                (H('error', e), (l = r));
                break;
              case 'img':
              case 'image':
              case 'link':
                (H('error', e), H('load', e), (l = r));
                break;
              case 'details':
                (H('toggle', e), (l = r));
                break;
              case 'input':
                (tu(e, r), (l = uo(e, r)), H('invalid', e));
                break;
              case 'option':
                l = r;
                break;
              case 'select':
                ((e._wrapperState = { wasMultiple: !!r.multiple }),
                  (l = K({}, r, { value: void 0 })),
                  H('invalid', e));
                break;
              case 'textarea':
                (ru(e, r), (l = co(e, r)), H('invalid', e));
                break;
              default:
                l = r;
            }
            (po(n, l), (s = l));
            for (o in s)
              if (s.hasOwnProperty(o)) {
                var u = s[o];
                o === 'style'
                  ? As(e, u)
                  : o === 'dangerouslySetInnerHTML'
                    ? ((u = u ? u.__html : void 0), u != null && Is(e, u))
                    : o === 'children'
                      ? typeof u == 'string'
                        ? (n !== 'textarea' || u !== '') && Un(e, u)
                        : typeof u == 'number' && Un(e, '' + u)
                      : o !== 'suppressContentEditableWarning' &&
                        o !== 'suppressHydrationWarning' &&
                        o !== 'autoFocus' &&
                        (Hn.hasOwnProperty(o)
                          ? u != null && o === 'onScroll' && H('scroll', e)
                          : u != null && ni(e, o, u, i));
              }
            switch (n) {
              case 'input':
                (dr(e), nu(e, r, !1));
                break;
              case 'textarea':
                (dr(e), lu(e));
                break;
              case 'option':
                r.value != null && e.setAttribute('value', '' + kt(r.value));
                break;
              case 'select':
                ((e.multiple = !!r.multiple),
                  (o = r.value),
                  o != null
                    ? tn(e, !!r.multiple, o, !1)
                    : r.defaultValue != null && tn(e, !!r.multiple, r.defaultValue, !0));
                break;
              default:
                typeof l.onClick == 'function' && (e.onclick = Gr);
            }
            switch (n) {
              case 'button':
              case 'input':
              case 'select':
              case 'textarea':
                r = !!r.autoFocus;
                break e;
              case 'img':
                r = !0;
                break e;
              default:
                r = !1;
            }
          }
          r && (t.flags |= 4);
        }
        t.ref !== null && ((t.flags |= 512), (t.flags |= 2097152));
      }
      return (oe(t), null);
    case 6:
      if (e && t.stateNode != null) sc(e, t, e.memoizedProps, r);
      else {
        if (typeof r != 'string' && t.stateNode === null) throw Error(k(166));
        if (((n = Mt(qn.current)), Mt(Qe.current), xr(t))) {
          if (
            ((r = t.stateNode),
            (n = t.memoizedProps),
            (r[Be] = t),
            (o = r.nodeValue !== n) && ((e = _e), e !== null))
          )
            switch (e.tag) {
              case 3:
                kr(r.nodeValue, n, (e.mode & 1) !== 0);
                break;
              case 5:
                e.memoizedProps.suppressHydrationWarning !== !0 &&
                  kr(r.nodeValue, n, (e.mode & 1) !== 0);
            }
          o && (t.flags |= 4);
        } else
          ((r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r)),
            (r[Be] = t),
            (t.stateNode = r));
      }
      return (oe(t), null);
    case 13:
      if (
        (U(W),
        (r = t.memoizedState),
        e === null || (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
      ) {
        if (V && xe !== null && t.mode & 1 && !(t.flags & 128))
          (Ca(), cn(), (t.flags |= 98560), (o = !1));
        else if (((o = xr(t)), r !== null && r.dehydrated !== null)) {
          if (e === null) {
            if (!o) throw Error(k(318));
            if (((o = t.memoizedState), (o = o !== null ? o.dehydrated : null), !o))
              throw Error(k(317));
            o[Be] = t;
          } else (cn(), !(t.flags & 128) && (t.memoizedState = null), (t.flags |= 4));
          (oe(t), (o = !1));
        } else (Ie !== null && (Go(Ie), (Ie = null)), (o = !0));
        if (!o) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128
        ? ((t.lanes = n), t)
        : ((r = r !== null),
          r !== (e !== null && e.memoizedState !== null) &&
            r &&
            ((t.child.flags |= 8192),
            t.mode & 1 && (e === null || W.current & 1 ? q === 0 && (q = 3) : Fi())),
          t.updateQueue !== null && (t.flags |= 4),
          oe(t),
          null);
    case 4:
      return (dn(), Ho(e, t), e === null && Gn(t.stateNode.containerInfo), oe(t), null);
    case 10:
      return (xi(t.type._context), oe(t), null);
    case 17:
      return (ve(t.type) && Xr(), oe(t), null);
    case 19:
      if ((U(W), (o = t.memoizedState), o === null)) return (oe(t), null);
      if (((r = (t.flags & 128) !== 0), (i = o.rendering), i === null))
        if (r) En(o, !1);
        else {
          if (q !== 0 || (e !== null && e.flags & 128))
            for (e = t.child; e !== null; ) {
              if (((i = nl(e)), i !== null)) {
                for (
                  t.flags |= 128,
                    En(o, !1),
                    r = i.updateQueue,
                    r !== null && ((t.updateQueue = r), (t.flags |= 4)),
                    t.subtreeFlags = 0,
                    r = n,
                    n = t.child;
                  n !== null;
                )
                  ((o = n),
                    (e = r),
                    (o.flags &= 14680066),
                    (i = o.alternate),
                    i === null
                      ? ((o.childLanes = 0),
                        (o.lanes = e),
                        (o.child = null),
                        (o.subtreeFlags = 0),
                        (o.memoizedProps = null),
                        (o.memoizedState = null),
                        (o.updateQueue = null),
                        (o.dependencies = null),
                        (o.stateNode = null))
                      : ((o.childLanes = i.childLanes),
                        (o.lanes = i.lanes),
                        (o.child = i.child),
                        (o.subtreeFlags = 0),
                        (o.deletions = null),
                        (o.memoizedProps = i.memoizedProps),
                        (o.memoizedState = i.memoizedState),
                        (o.updateQueue = i.updateQueue),
                        (o.type = i.type),
                        (e = i.dependencies),
                        (o.dependencies =
                          e === null ? null : { lanes: e.lanes, firstContext: e.firstContext })),
                    (n = n.sibling));
                return (F(W, (W.current & 1) | 2), t.child);
              }
              e = e.sibling;
            }
          o.tail !== null &&
            G() > mn &&
            ((t.flags |= 128), (r = !0), En(o, !1), (t.lanes = 4194304));
        }
      else {
        if (!r)
          if (((e = nl(i)), e !== null)) {
            if (
              ((t.flags |= 128),
              (r = !0),
              (n = e.updateQueue),
              n !== null && ((t.updateQueue = n), (t.flags |= 4)),
              En(o, !0),
              o.tail === null && o.tailMode === 'hidden' && !i.alternate && !V)
            )
              return (oe(t), null);
          } else
            2 * G() - o.renderingStartTime > mn &&
              n !== 1073741824 &&
              ((t.flags |= 128), (r = !0), En(o, !1), (t.lanes = 4194304));
        o.isBackwards
          ? ((i.sibling = t.child), (t.child = i))
          : ((n = o.last), n !== null ? (n.sibling = i) : (t.child = i), (o.last = i));
      }
      return o.tail !== null
        ? ((t = o.tail),
          (o.rendering = t),
          (o.tail = t.sibling),
          (o.renderingStartTime = G()),
          (t.sibling = null),
          (n = W.current),
          F(W, r ? (n & 1) | 2 : n & 1),
          t)
        : (oe(t), null);
    case 22:
    case 23:
      return (
        Ii(),
        (r = t.memoizedState !== null),
        e !== null && (e.memoizedState !== null) !== r && (t.flags |= 8192),
        r && t.mode & 1
          ? ke & 1073741824 && (oe(t), t.subtreeFlags & 6 && (t.flags |= 8192))
          : oe(t),
        null
      );
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(k(156, t.tag));
}
function Qd(e, t) {
  switch ((yi(t), t.tag)) {
    case 1:
      return (
        ve(t.type) && Xr(),
        (e = t.flags),
        e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
      );
    case 3:
      return (
        dn(),
        U(he),
        U(ue),
        Ci(),
        (e = t.flags),
        e & 65536 && !(e & 128) ? ((t.flags = (e & -65537) | 128), t) : null
      );
    case 5:
      return (Ei(t), null);
    case 13:
      if ((U(W), (e = t.memoizedState), e !== null && e.dehydrated !== null)) {
        if (t.alternate === null) throw Error(k(340));
        cn();
      }
      return ((e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null);
    case 19:
      return (U(W), null);
    case 4:
      return (dn(), null);
    case 10:
      return (xi(t.type._context), null);
    case 22:
    case 23:
      return (Ii(), null);
    case 24:
      return null;
    default:
      return null;
  }
}
var Nr = !1,
  ie = !1,
  Kd = typeof WeakSet == 'function' ? WeakSet : Set,
  C = null;
function bt(e, t) {
  var n = e.ref;
  if (n !== null)
    if (typeof n == 'function')
      try {
        n(null);
      } catch (r) {
        Y(e, t, r);
      }
    else n.current = null;
}
function Uo(e, t, n) {
  try {
    n();
  } catch (r) {
    Y(e, t, r);
  }
}
var Yu = !1;
function Yd(e, t) {
  if (((No = Qr), (e = pa()), hi(e))) {
    if ('selectionStart' in e) var n = { start: e.selectionStart, end: e.selectionEnd };
    else
      e: {
        n = ((n = e.ownerDocument) && n.defaultView) || window;
        var r = n.getSelection && n.getSelection();
        if (r && r.rangeCount !== 0) {
          n = r.anchorNode;
          var l = r.anchorOffset,
            o = r.focusNode;
          r = r.focusOffset;
          try {
            (n.nodeType, o.nodeType);
          } catch {
            n = null;
            break e;
          }
          var i = 0,
            s = -1,
            u = -1,
            a = 0,
            m = 0,
            h = e,
            v = null;
          t: for (;;) {
            for (
              var g;
              h !== n || (l !== 0 && h.nodeType !== 3) || (s = i + l),
                h !== o || (r !== 0 && h.nodeType !== 3) || (u = i + r),
                h.nodeType === 3 && (i += h.nodeValue.length),
                (g = h.firstChild) !== null;
            )
              ((v = h), (h = g));
            for (;;) {
              if (h === e) break t;
              if (
                (v === n && ++a === l && (s = i),
                v === o && ++m === r && (u = i),
                (g = h.nextSibling) !== null)
              )
                break;
              ((h = v), (v = h.parentNode));
            }
            h = g;
          }
          n = s === -1 || u === -1 ? null : { start: s, end: u };
        } else n = null;
      }
    n = n || { start: 0, end: 0 };
  } else n = null;
  for (Eo = { focusedElem: e, selectionRange: n }, Qr = !1, C = t; C !== null; )
    if (((t = C), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null))
      ((e.return = t), (C = e));
    else
      for (; C !== null; ) {
        t = C;
        try {
          var y = t.alternate;
          if (t.flags & 1024)
            switch (t.tag) {
              case 0:
              case 11:
              case 15:
                break;
              case 1:
                if (y !== null) {
                  var x = y.memoizedProps,
                    T = y.memoizedState,
                    f = t.stateNode,
                    c = f.getSnapshotBeforeUpdate(t.elementType === t.type ? x : De(t.type, x), T);
                  f.__reactInternalSnapshotBeforeUpdate = c;
                }
                break;
              case 3:
                var p = t.stateNode.containerInfo;
                p.nodeType === 1
                  ? (p.textContent = '')
                  : p.nodeType === 9 && p.documentElement && p.removeChild(p.documentElement);
                break;
              case 5:
              case 6:
              case 4:
              case 17:
                break;
              default:
                throw Error(k(163));
            }
        } catch (w) {
          Y(t, t.return, w);
        }
        if (((e = t.sibling), e !== null)) {
          ((e.return = t.return), (C = e));
          break;
        }
        C = t.return;
      }
  return ((y = Yu), (Yu = !1), y);
}
function In(e, t, n) {
  var r = t.updateQueue;
  if (((r = r !== null ? r.lastEffect : null), r !== null)) {
    var l = (r = r.next);
    do {
      if ((l.tag & e) === e) {
        var o = l.destroy;
        ((l.destroy = void 0), o !== void 0 && Uo(t, n, o));
      }
      l = l.next;
    } while (l !== r);
  }
}
function wl(e, t) {
  if (((t = t.updateQueue), (t = t !== null ? t.lastEffect : null), t !== null)) {
    var n = (t = t.next);
    do {
      if ((n.tag & e) === e) {
        var r = n.create;
        n.destroy = r();
      }
      n = n.next;
    } while (n !== t);
  }
}
function Vo(e) {
  var t = e.ref;
  if (t !== null) {
    var n = e.stateNode;
    switch (e.tag) {
      case 5:
        e = n;
        break;
      default:
        e = n;
    }
    typeof t == 'function' ? t(e) : (t.current = e);
  }
}
function ac(e) {
  var t = e.alternate;
  (t !== null && ((e.alternate = null), ac(t)),
    (e.child = null),
    (e.deletions = null),
    (e.sibling = null),
    e.tag === 5 &&
      ((t = e.stateNode),
      t !== null && (delete t[Be], delete t[Zn], delete t[Po], delete t[Td], delete t[zd])),
    (e.stateNode = null),
    (e.return = null),
    (e.dependencies = null),
    (e.memoizedProps = null),
    (e.memoizedState = null),
    (e.pendingProps = null),
    (e.stateNode = null),
    (e.updateQueue = null));
}
function cc(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function Gu(e) {
  e: for (;;) {
    for (; e.sibling === null; ) {
      if (e.return === null || cc(e.return)) return null;
      e = e.return;
    }
    for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      ((e.child.return = e), (e = e.child));
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function Bo(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6)
    ((e = e.stateNode),
      t
        ? n.nodeType === 8
          ? n.parentNode.insertBefore(e, t)
          : n.insertBefore(e, t)
        : (n.nodeType === 8
            ? ((t = n.parentNode), t.insertBefore(e, n))
            : ((t = n), t.appendChild(e)),
          (n = n._reactRootContainer),
          n != null || t.onclick !== null || (t.onclick = Gr)));
  else if (r !== 4 && ((e = e.child), e !== null))
    for (Bo(e, t, n), e = e.sibling; e !== null; ) (Bo(e, t, n), (e = e.sibling));
}
function Wo(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) ((e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e));
  else if (r !== 4 && ((e = e.child), e !== null))
    for (Wo(e, t, n), e = e.sibling; e !== null; ) (Wo(e, t, n), (e = e.sibling));
}
var te = null,
  $e = !1;
function ot(e, t, n) {
  for (n = n.child; n !== null; ) (fc(e, t, n), (n = n.sibling));
}
function fc(e, t, n) {
  if (We && typeof We.onCommitFiberUnmount == 'function')
    try {
      We.onCommitFiberUnmount(fl, n);
    } catch {}
  switch (n.tag) {
    case 5:
      ie || bt(n, t);
    case 6:
      var r = te,
        l = $e;
      ((te = null),
        ot(e, t, n),
        (te = r),
        ($e = l),
        te !== null &&
          ($e
            ? ((e = te),
              (n = n.stateNode),
              e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n))
            : te.removeChild(n.stateNode)));
      break;
    case 18:
      te !== null &&
        ($e
          ? ((e = te),
            (n = n.stateNode),
            e.nodeType === 8 ? Wl(e.parentNode, n) : e.nodeType === 1 && Wl(e, n),
            Qn(e))
          : Wl(te, n.stateNode));
      break;
    case 4:
      ((r = te),
        (l = $e),
        (te = n.stateNode.containerInfo),
        ($e = !0),
        ot(e, t, n),
        (te = r),
        ($e = l));
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!ie && ((r = n.updateQueue), r !== null && ((r = r.lastEffect), r !== null))) {
        l = r = r.next;
        do {
          var o = l,
            i = o.destroy;
          ((o = o.tag), i !== void 0 && (o & 2 || o & 4) && Uo(n, t, i), (l = l.next));
        } while (l !== r);
      }
      ot(e, t, n);
      break;
    case 1:
      if (!ie && (bt(n, t), (r = n.stateNode), typeof r.componentWillUnmount == 'function'))
        try {
          ((r.props = n.memoizedProps), (r.state = n.memoizedState), r.componentWillUnmount());
        } catch (s) {
          Y(n, t, s);
        }
      ot(e, t, n);
      break;
    case 21:
      ot(e, t, n);
      break;
    case 22:
      n.mode & 1
        ? ((ie = (r = ie) || n.memoizedState !== null), ot(e, t, n), (ie = r))
        : ot(e, t, n);
      break;
    default:
      ot(e, t, n);
  }
}
function Xu(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    (n === null && (n = e.stateNode = new Kd()),
      t.forEach(function (r) {
        var l = np.bind(null, e, r);
        n.has(r) || (n.add(r), r.then(l, l));
      }));
  }
}
function Oe(e, t) {
  var n = t.deletions;
  if (n !== null)
    for (var r = 0; r < n.length; r++) {
      var l = n[r];
      try {
        var o = e,
          i = t,
          s = i;
        e: for (; s !== null; ) {
          switch (s.tag) {
            case 5:
              ((te = s.stateNode), ($e = !1));
              break e;
            case 3:
              ((te = s.stateNode.containerInfo), ($e = !0));
              break e;
            case 4:
              ((te = s.stateNode.containerInfo), ($e = !0));
              break e;
          }
          s = s.return;
        }
        if (te === null) throw Error(k(160));
        (fc(o, i, l), (te = null), ($e = !1));
        var u = l.alternate;
        (u !== null && (u.return = null), (l.return = null));
      } catch (a) {
        Y(l, t, a);
      }
    }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) (dc(t, e), (t = t.sibling));
}
function dc(e, t) {
  var n = e.alternate,
    r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if ((Oe(t, e), Ue(e), r & 4)) {
        try {
          (In(3, e, e.return), wl(3, e));
        } catch (x) {
          Y(e, e.return, x);
        }
        try {
          In(5, e, e.return);
        } catch (x) {
          Y(e, e.return, x);
        }
      }
      break;
    case 1:
      (Oe(t, e), Ue(e), r & 512 && n !== null && bt(n, n.return));
      break;
    case 5:
      if ((Oe(t, e), Ue(e), r & 512 && n !== null && bt(n, n.return), e.flags & 32)) {
        var l = e.stateNode;
        try {
          Un(l, '');
        } catch (x) {
          Y(e, e.return, x);
        }
      }
      if (r & 4 && ((l = e.stateNode), l != null)) {
        var o = e.memoizedProps,
          i = n !== null ? n.memoizedProps : o,
          s = e.type,
          u = e.updateQueue;
        if (((e.updateQueue = null), u !== null))
          try {
            (s === 'input' && o.type === 'radio' && o.name != null && Os(l, o), mo(s, i));
            var a = mo(s, o);
            for (i = 0; i < u.length; i += 2) {
              var m = u[i],
                h = u[i + 1];
              m === 'style'
                ? As(l, h)
                : m === 'dangerouslySetInnerHTML'
                  ? Is(l, h)
                  : m === 'children'
                    ? Un(l, h)
                    : ni(l, m, h, a);
            }
            switch (s) {
              case 'input':
                so(l, o);
                break;
              case 'textarea':
                Ds(l, o);
                break;
              case 'select':
                var v = l._wrapperState.wasMultiple;
                l._wrapperState.wasMultiple = !!o.multiple;
                var g = o.value;
                g != null
                  ? tn(l, !!o.multiple, g, !1)
                  : v !== !!o.multiple &&
                    (o.defaultValue != null
                      ? tn(l, !!o.multiple, o.defaultValue, !0)
                      : tn(l, !!o.multiple, o.multiple ? [] : '', !1));
            }
            l[Zn] = o;
          } catch (x) {
            Y(e, e.return, x);
          }
      }
      break;
    case 6:
      if ((Oe(t, e), Ue(e), r & 4)) {
        if (e.stateNode === null) throw Error(k(162));
        ((l = e.stateNode), (o = e.memoizedProps));
        try {
          l.nodeValue = o;
        } catch (x) {
          Y(e, e.return, x);
        }
      }
      break;
    case 3:
      if ((Oe(t, e), Ue(e), r & 4 && n !== null && n.memoizedState.isDehydrated))
        try {
          Qn(t.containerInfo);
        } catch (x) {
          Y(e, e.return, x);
        }
      break;
    case 4:
      (Oe(t, e), Ue(e));
      break;
    case 13:
      (Oe(t, e),
        Ue(e),
        (l = e.child),
        l.flags & 8192 &&
          ((o = l.memoizedState !== null),
          (l.stateNode.isHidden = o),
          !o || (l.alternate !== null && l.alternate.memoizedState !== null) || (Di = G())),
        r & 4 && Xu(e));
      break;
    case 22:
      if (
        ((m = n !== null && n.memoizedState !== null),
        e.mode & 1 ? ((ie = (a = ie) || m), Oe(t, e), (ie = a)) : Oe(t, e),
        Ue(e),
        r & 8192)
      ) {
        if (((a = e.memoizedState !== null), (e.stateNode.isHidden = a) && !m && e.mode & 1))
          for (C = e, m = e.child; m !== null; ) {
            for (h = C = m; C !== null; ) {
              switch (((v = C), (g = v.child), v.tag)) {
                case 0:
                case 11:
                case 14:
                case 15:
                  In(4, v, v.return);
                  break;
                case 1:
                  bt(v, v.return);
                  var y = v.stateNode;
                  if (typeof y.componentWillUnmount == 'function') {
                    ((r = v), (n = v.return));
                    try {
                      ((t = r),
                        (y.props = t.memoizedProps),
                        (y.state = t.memoizedState),
                        y.componentWillUnmount());
                    } catch (x) {
                      Y(r, n, x);
                    }
                  }
                  break;
                case 5:
                  bt(v, v.return);
                  break;
                case 22:
                  if (v.memoizedState !== null) {
                    Ju(h);
                    continue;
                  }
              }
              g !== null ? ((g.return = v), (C = g)) : Ju(h);
            }
            m = m.sibling;
          }
        e: for (m = null, h = e; ; ) {
          if (h.tag === 5) {
            if (m === null) {
              m = h;
              try {
                ((l = h.stateNode),
                  a
                    ? ((o = l.style),
                      typeof o.setProperty == 'function'
                        ? o.setProperty('display', 'none', 'important')
                        : (o.display = 'none'))
                    : ((s = h.stateNode),
                      (u = h.memoizedProps.style),
                      (i = u != null && u.hasOwnProperty('display') ? u.display : null),
                      (s.style.display = Fs('display', i))));
              } catch (x) {
                Y(e, e.return, x);
              }
            }
          } else if (h.tag === 6) {
            if (m === null)
              try {
                h.stateNode.nodeValue = a ? '' : h.memoizedProps;
              } catch (x) {
                Y(e, e.return, x);
              }
          } else if (
            ((h.tag !== 22 && h.tag !== 23) || h.memoizedState === null || h === e) &&
            h.child !== null
          ) {
            ((h.child.return = h), (h = h.child));
            continue;
          }
          if (h === e) break e;
          for (; h.sibling === null; ) {
            if (h.return === null || h.return === e) break e;
            (m === h && (m = null), (h = h.return));
          }
          (m === h && (m = null), (h.sibling.return = h.return), (h = h.sibling));
        }
      }
      break;
    case 19:
      (Oe(t, e), Ue(e), r & 4 && Xu(e));
      break;
    case 21:
      break;
    default:
      (Oe(t, e), Ue(e));
  }
}
function Ue(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null; ) {
          if (cc(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(k(160));
      }
      switch (r.tag) {
        case 5:
          var l = r.stateNode;
          r.flags & 32 && (Un(l, ''), (r.flags &= -33));
          var o = Gu(e);
          Wo(e, o, l);
          break;
        case 3:
        case 4:
          var i = r.stateNode.containerInfo,
            s = Gu(e);
          Bo(e, s, i);
          break;
        default:
          throw Error(k(161));
      }
    } catch (u) {
      Y(e, e.return, u);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function Gd(e, t, n) {
  ((C = e), pc(e));
}
function pc(e, t, n) {
  for (var r = (e.mode & 1) !== 0; C !== null; ) {
    var l = C,
      o = l.child;
    if (l.tag === 22 && r) {
      var i = l.memoizedState !== null || Nr;
      if (!i) {
        var s = l.alternate,
          u = (s !== null && s.memoizedState !== null) || ie;
        s = Nr;
        var a = ie;
        if (((Nr = i), (ie = u) && !a))
          for (C = l; C !== null; )
            ((i = C),
              (u = i.child),
              i.tag === 22 && i.memoizedState !== null
                ? qu(l)
                : u !== null
                  ? ((u.return = i), (C = u))
                  : qu(l));
        for (; o !== null; ) ((C = o), pc(o), (o = o.sibling));
        ((C = l), (Nr = s), (ie = a));
      }
      Zu(e);
    } else l.subtreeFlags & 8772 && o !== null ? ((o.return = l), (C = o)) : Zu(e);
  }
}
function Zu(e) {
  for (; C !== null; ) {
    var t = C;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772)
          switch (t.tag) {
            case 0:
            case 11:
            case 15:
              ie || wl(5, t);
              break;
            case 1:
              var r = t.stateNode;
              if (t.flags & 4 && !ie)
                if (n === null) r.componentDidMount();
                else {
                  var l = t.elementType === t.type ? n.memoizedProps : De(t.type, n.memoizedProps);
                  r.componentDidUpdate(l, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
                }
              var o = t.updateQueue;
              o !== null && Ou(t, o, r);
              break;
            case 3:
              var i = t.updateQueue;
              if (i !== null) {
                if (((n = null), t.child !== null))
                  switch (t.child.tag) {
                    case 5:
                      n = t.child.stateNode;
                      break;
                    case 1:
                      n = t.child.stateNode;
                  }
                Ou(t, i, n);
              }
              break;
            case 5:
              var s = t.stateNode;
              if (n === null && t.flags & 4) {
                n = s;
                var u = t.memoizedProps;
                switch (t.type) {
                  case 'button':
                  case 'input':
                  case 'select':
                  case 'textarea':
                    u.autoFocus && n.focus();
                    break;
                  case 'img':
                    u.src && (n.src = u.src);
                }
              }
              break;
            case 6:
              break;
            case 4:
              break;
            case 12:
              break;
            case 13:
              if (t.memoizedState === null) {
                var a = t.alternate;
                if (a !== null) {
                  var m = a.memoizedState;
                  if (m !== null) {
                    var h = m.dehydrated;
                    h !== null && Qn(h);
                  }
                }
              }
              break;
            case 19:
            case 17:
            case 21:
            case 22:
            case 23:
            case 25:
              break;
            default:
              throw Error(k(163));
          }
        ie || (t.flags & 512 && Vo(t));
      } catch (v) {
        Y(t, t.return, v);
      }
    }
    if (t === e) {
      C = null;
      break;
    }
    if (((n = t.sibling), n !== null)) {
      ((n.return = t.return), (C = n));
      break;
    }
    C = t.return;
  }
}
function Ju(e) {
  for (; C !== null; ) {
    var t = C;
    if (t === e) {
      C = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      ((n.return = t.return), (C = n));
      break;
    }
    C = t.return;
  }
}
function qu(e) {
  for (; C !== null; ) {
    var t = C;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            wl(4, t);
          } catch (u) {
            Y(t, n, u);
          }
          break;
        case 1:
          var r = t.stateNode;
          if (typeof r.componentDidMount == 'function') {
            var l = t.return;
            try {
              r.componentDidMount();
            } catch (u) {
              Y(t, l, u);
            }
          }
          var o = t.return;
          try {
            Vo(t);
          } catch (u) {
            Y(t, o, u);
          }
          break;
        case 5:
          var i = t.return;
          try {
            Vo(t);
          } catch (u) {
            Y(t, i, u);
          }
      }
    } catch (u) {
      Y(t, t.return, u);
    }
    if (t === e) {
      C = null;
      break;
    }
    var s = t.sibling;
    if (s !== null) {
      ((s.return = t.return), (C = s));
      break;
    }
    C = t.return;
  }
}
var Xd = Math.ceil,
  ol = nt.ReactCurrentDispatcher,
  Ri = nt.ReactCurrentOwner,
  ze = nt.ReactCurrentBatchConfig,
  O = 0,
  ee = null,
  Z = null,
  ne = 0,
  ke = 0,
  en = St(0),
  q = 0,
  nr = null,
  It = 0,
  kl = 0,
  Oi = 0,
  Fn = null,
  pe = null,
  Di = 0,
  mn = 1 / 0,
  Ye = null,
  il = !1,
  Qo = null,
  yt = null,
  Er = !1,
  ft = null,
  ul = 0,
  An = 0,
  Ko = null,
  Ir = -1,
  Fr = 0;
function ce() {
  return O & 6 ? G() : Ir !== -1 ? Ir : (Ir = G());
}
function gt(e) {
  return e.mode & 1
    ? O & 2 && ne !== 0
      ? ne & -ne
      : Ld.transition !== null
        ? (Fr === 0 && (Fr = Js()), Fr)
        : ((e = I), e !== 0 || ((e = window.event), (e = e === void 0 ? 16 : la(e.type))), e)
    : 1;
}
function Ae(e, t, n, r) {
  if (50 < An) throw ((An = 0), (Ko = null), Error(k(185)));
  (lr(e, n, r),
    (!(O & 2) || e !== ee) &&
      (e === ee && (!(O & 2) && (kl |= n), q === 4 && at(e, ne)),
      ye(e, r),
      n === 1 && O === 0 && !(t.mode & 1) && ((mn = G() + 500), vl && Nt())));
}
function ye(e, t) {
  var n = e.callbackNode;
  Lf(e, t);
  var r = Wr(e, e === ee ? ne : 0);
  if (r === 0) (n !== null && uu(n), (e.callbackNode = null), (e.callbackPriority = 0));
  else if (((t = r & -r), e.callbackPriority !== t)) {
    if ((n != null && uu(n), t === 1))
      (e.tag === 0 ? Md(bu.bind(null, e)) : Sa(bu.bind(null, e)),
        jd(function () {
          !(O & 6) && Nt();
        }),
        (n = null));
    else {
      switch (qs(r)) {
        case 1:
          n = ui;
          break;
        case 4:
          n = Xs;
          break;
        case 16:
          n = Br;
          break;
        case 536870912:
          n = Zs;
          break;
        default:
          n = Br;
      }
      n = xc(n, mc.bind(null, e));
    }
    ((e.callbackPriority = t), (e.callbackNode = n));
  }
}
function mc(e, t) {
  if (((Ir = -1), (Fr = 0), O & 6)) throw Error(k(327));
  var n = e.callbackNode;
  if (un() && e.callbackNode !== n) return null;
  var r = Wr(e, e === ee ? ne : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = sl(e, r);
  else {
    t = r;
    var l = O;
    O |= 2;
    var o = vc();
    (ee !== e || ne !== t) && ((Ye = null), (mn = G() + 500), Lt(e, t));
    do
      try {
        qd();
        break;
      } catch (s) {
        hc(e, s);
      }
    while (!0);
    (ki(), (ol.current = o), (O = l), Z !== null ? (t = 0) : ((ee = null), (ne = 0), (t = q)));
  }
  if (t !== 0) {
    if ((t === 2 && ((l = wo(e)), l !== 0 && ((r = l), (t = Yo(e, l)))), t === 1))
      throw ((n = nr), Lt(e, 0), at(e, r), ye(e, G()), n);
    if (t === 6) at(e, r);
    else {
      if (
        ((l = e.current.alternate),
        !(r & 30) &&
          !Zd(l) &&
          ((t = sl(e, r)), t === 2 && ((o = wo(e)), o !== 0 && ((r = o), (t = Yo(e, o)))), t === 1))
      )
        throw ((n = nr), Lt(e, 0), at(e, r), ye(e, G()), n);
      switch (((e.finishedWork = l), (e.finishedLanes = r), t)) {
        case 0:
        case 1:
          throw Error(k(345));
        case 2:
          Pt(e, pe, Ye);
          break;
        case 3:
          if ((at(e, r), (r & 130023424) === r && ((t = Di + 500 - G()), 10 < t))) {
            if (Wr(e, 0) !== 0) break;
            if (((l = e.suspendedLanes), (l & r) !== r)) {
              (ce(), (e.pingedLanes |= e.suspendedLanes & l));
              break;
            }
            e.timeoutHandle = jo(Pt.bind(null, e, pe, Ye), t);
            break;
          }
          Pt(e, pe, Ye);
          break;
        case 4:
          if ((at(e, r), (r & 4194240) === r)) break;
          for (t = e.eventTimes, l = -1; 0 < r; ) {
            var i = 31 - Fe(r);
            ((o = 1 << i), (i = t[i]), i > l && (l = i), (r &= ~o));
          }
          if (
            ((r = l),
            (r = G() - r),
            (r =
              (120 > r
                ? 120
                : 480 > r
                  ? 480
                  : 1080 > r
                    ? 1080
                    : 1920 > r
                      ? 1920
                      : 3e3 > r
                        ? 3e3
                        : 4320 > r
                          ? 4320
                          : 1960 * Xd(r / 1960)) - r),
            10 < r)
          ) {
            e.timeoutHandle = jo(Pt.bind(null, e, pe, Ye), r);
            break;
          }
          Pt(e, pe, Ye);
          break;
        case 5:
          Pt(e, pe, Ye);
          break;
        default:
          throw Error(k(329));
      }
    }
  }
  return (ye(e, G()), e.callbackNode === n ? mc.bind(null, e) : null);
}
function Yo(e, t) {
  var n = Fn;
  return (
    e.current.memoizedState.isDehydrated && (Lt(e, t).flags |= 256),
    (e = sl(e, t)),
    e !== 2 && ((t = pe), (pe = n), t !== null && Go(t)),
    e
  );
}
function Go(e) {
  pe === null ? (pe = e) : pe.push.apply(pe, e);
}
function Zd(e) {
  for (var t = e; ; ) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && ((n = n.stores), n !== null))
        for (var r = 0; r < n.length; r++) {
          var l = n[r],
            o = l.getSnapshot;
          l = l.value;
          try {
            if (!He(o(), l)) return !1;
          } catch {
            return !1;
          }
        }
    }
    if (((n = t.child), t.subtreeFlags & 16384 && n !== null)) ((n.return = t), (t = n));
    else {
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return !0;
        t = t.return;
      }
      ((t.sibling.return = t.return), (t = t.sibling));
    }
  }
  return !0;
}
function at(e, t) {
  for (
    t &= ~Oi, t &= ~kl, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes;
    0 < t;
  ) {
    var n = 31 - Fe(t),
      r = 1 << n;
    ((e[n] = -1), (t &= ~r));
  }
}
function bu(e) {
  if (O & 6) throw Error(k(327));
  un();
  var t = Wr(e, 0);
  if (!(t & 1)) return (ye(e, G()), null);
  var n = sl(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = wo(e);
    r !== 0 && ((t = r), (n = Yo(e, r)));
  }
  if (n === 1) throw ((n = nr), Lt(e, 0), at(e, t), ye(e, G()), n);
  if (n === 6) throw Error(k(345));
  return (
    (e.finishedWork = e.current.alternate),
    (e.finishedLanes = t),
    Pt(e, pe, Ye),
    ye(e, G()),
    null
  );
}
function $i(e, t) {
  var n = O;
  O |= 1;
  try {
    return e(t);
  } finally {
    ((O = n), O === 0 && ((mn = G() + 500), vl && Nt()));
  }
}
function Ft(e) {
  ft !== null && ft.tag === 0 && !(O & 6) && un();
  var t = O;
  O |= 1;
  var n = ze.transition,
    r = I;
  try {
    if (((ze.transition = null), (I = 1), e)) return e();
  } finally {
    ((I = r), (ze.transition = n), (O = t), !(O & 6) && Nt());
  }
}
function Ii() {
  ((ke = en.current), U(en));
}
function Lt(e, t) {
  ((e.finishedWork = null), (e.finishedLanes = 0));
  var n = e.timeoutHandle;
  if ((n !== -1 && ((e.timeoutHandle = -1), Cd(n)), Z !== null))
    for (n = Z.return; n !== null; ) {
      var r = n;
      switch ((yi(r), r.tag)) {
        case 1:
          ((r = r.type.childContextTypes), r != null && Xr());
          break;
        case 3:
          (dn(), U(he), U(ue), Ci());
          break;
        case 5:
          Ei(r);
          break;
        case 4:
          dn();
          break;
        case 13:
          U(W);
          break;
        case 19:
          U(W);
          break;
        case 10:
          xi(r.type._context);
          break;
        case 22:
        case 23:
          Ii();
      }
      n = n.return;
    }
  if (
    ((ee = e),
    (Z = e = wt(e.current, null)),
    (ne = ke = t),
    (q = 0),
    (nr = null),
    (Oi = kl = It = 0),
    (pe = Fn = null),
    zt !== null)
  ) {
    for (t = 0; t < zt.length; t++)
      if (((n = zt[t]), (r = n.interleaved), r !== null)) {
        n.interleaved = null;
        var l = r.next,
          o = n.pending;
        if (o !== null) {
          var i = o.next;
          ((o.next = l), (r.next = i));
        }
        n.pending = r;
      }
    zt = null;
  }
  return e;
}
function hc(e, t) {
  do {
    var n = Z;
    try {
      if ((ki(), (Or.current = ll), rl)) {
        for (var r = Q.memoizedState; r !== null; ) {
          var l = r.queue;
          (l !== null && (l.pending = null), (r = r.next));
        }
        rl = !1;
      }
      if (
        (($t = 0),
        (b = J = Q = null),
        ($n = !1),
        (bn = 0),
        (Ri.current = null),
        n === null || n.return === null)
      ) {
        ((q = 1), (nr = t), (Z = null));
        break;
      }
      e: {
        var o = e,
          i = n.return,
          s = n,
          u = t;
        if (
          ((t = ne),
          (s.flags |= 32768),
          u !== null && typeof u == 'object' && typeof u.then == 'function')
        ) {
          var a = u,
            m = s,
            h = m.tag;
          if (!(m.mode & 1) && (h === 0 || h === 11 || h === 15)) {
            var v = m.alternate;
            v
              ? ((m.updateQueue = v.updateQueue),
                (m.memoizedState = v.memoizedState),
                (m.lanes = v.lanes))
              : ((m.updateQueue = null), (m.memoizedState = null));
          }
          var g = Hu(i);
          if (g !== null) {
            ((g.flags &= -257), Uu(g, i, s, o, t), g.mode & 1 && Au(o, a, t), (t = g), (u = a));
            var y = t.updateQueue;
            if (y === null) {
              var x = new Set();
              (x.add(u), (t.updateQueue = x));
            } else y.add(u);
            break e;
          } else {
            if (!(t & 1)) {
              (Au(o, a, t), Fi());
              break e;
            }
            u = Error(k(426));
          }
        } else if (V && s.mode & 1) {
          var T = Hu(i);
          if (T !== null) {
            (!(T.flags & 65536) && (T.flags |= 256), Uu(T, i, s, o, t), gi(pn(u, s)));
            break e;
          }
        }
        ((o = u = pn(u, s)), q !== 4 && (q = 2), Fn === null ? (Fn = [o]) : Fn.push(o), (o = i));
        do {
          switch (o.tag) {
            case 3:
              ((o.flags |= 65536), (t &= -t), (o.lanes |= t));
              var f = qa(o, u, t);
              Ru(o, f);
              break e;
            case 1:
              s = u;
              var c = o.type,
                p = o.stateNode;
              if (
                !(o.flags & 128) &&
                (typeof c.getDerivedStateFromError == 'function' ||
                  (p !== null &&
                    typeof p.componentDidCatch == 'function' &&
                    (yt === null || !yt.has(p))))
              ) {
                ((o.flags |= 65536), (t &= -t), (o.lanes |= t));
                var w = ba(o, s, t);
                Ru(o, w);
                break e;
              }
          }
          o = o.return;
        } while (o !== null);
      }
      gc(n);
    } catch (S) {
      ((t = S), Z === n && n !== null && (Z = n = n.return));
      continue;
    }
    break;
  } while (!0);
}
function vc() {
  var e = ol.current;
  return ((ol.current = ll), e === null ? ll : e);
}
function Fi() {
  ((q === 0 || q === 3 || q === 2) && (q = 4),
    ee === null || (!(It & 268435455) && !(kl & 268435455)) || at(ee, ne));
}
function sl(e, t) {
  var n = O;
  O |= 2;
  var r = vc();
  (ee !== e || ne !== t) && ((Ye = null), Lt(e, t));
  do
    try {
      Jd();
      break;
    } catch (l) {
      hc(e, l);
    }
  while (!0);
  if ((ki(), (O = n), (ol.current = r), Z !== null)) throw Error(k(261));
  return ((ee = null), (ne = 0), q);
}
function Jd() {
  for (; Z !== null; ) yc(Z);
}
function qd() {
  for (; Z !== null && !Sf(); ) yc(Z);
}
function yc(e) {
  var t = kc(e.alternate, e, ke);
  ((e.memoizedProps = e.pendingProps), t === null ? gc(e) : (Z = t), (Ri.current = null));
}
function gc(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (((e = t.return), t.flags & 32768)) {
      if (((n = Qd(n, t)), n !== null)) {
        ((n.flags &= 32767), (Z = n));
        return;
      }
      if (e !== null) ((e.flags |= 32768), (e.subtreeFlags = 0), (e.deletions = null));
      else {
        ((q = 6), (Z = null));
        return;
      }
    } else if (((n = Wd(n, t, ke)), n !== null)) {
      Z = n;
      return;
    }
    if (((t = t.sibling), t !== null)) {
      Z = t;
      return;
    }
    Z = t = e;
  } while (t !== null);
  q === 0 && (q = 5);
}
function Pt(e, t, n) {
  var r = I,
    l = ze.transition;
  try {
    ((ze.transition = null), (I = 1), bd(e, t, n, r));
  } finally {
    ((ze.transition = l), (I = r));
  }
  return null;
}
function bd(e, t, n, r) {
  do un();
  while (ft !== null);
  if (O & 6) throw Error(k(327));
  n = e.finishedWork;
  var l = e.finishedLanes;
  if (n === null) return null;
  if (((e.finishedWork = null), (e.finishedLanes = 0), n === e.current)) throw Error(k(177));
  ((e.callbackNode = null), (e.callbackPriority = 0));
  var o = n.lanes | n.childLanes;
  if (
    (Rf(e, o),
    e === ee && ((Z = ee = null), (ne = 0)),
    (!(n.subtreeFlags & 2064) && !(n.flags & 2064)) ||
      Er ||
      ((Er = !0),
      xc(Br, function () {
        return (un(), null);
      })),
    (o = (n.flags & 15990) !== 0),
    n.subtreeFlags & 15990 || o)
  ) {
    ((o = ze.transition), (ze.transition = null));
    var i = I;
    I = 1;
    var s = O;
    ((O |= 4),
      (Ri.current = null),
      Yd(e, n),
      dc(n, e),
      wd(Eo),
      (Qr = !!No),
      (Eo = No = null),
      (e.current = n),
      Gd(n),
      Nf(),
      (O = s),
      (I = i),
      (ze.transition = o));
  } else e.current = n;
  if (
    (Er && ((Er = !1), (ft = e), (ul = l)),
    (o = e.pendingLanes),
    o === 0 && (yt = null),
    jf(n.stateNode),
    ye(e, G()),
    t !== null)
  )
    for (r = e.onRecoverableError, n = 0; n < t.length; n++)
      ((l = t[n]), r(l.value, { componentStack: l.stack, digest: l.digest }));
  if (il) throw ((il = !1), (e = Qo), (Qo = null), e);
  return (
    ul & 1 && e.tag !== 0 && un(),
    (o = e.pendingLanes),
    o & 1 ? (e === Ko ? An++ : ((An = 0), (Ko = e))) : (An = 0),
    Nt(),
    null
  );
}
function un() {
  if (ft !== null) {
    var e = qs(ul),
      t = ze.transition,
      n = I;
    try {
      if (((ze.transition = null), (I = 16 > e ? 16 : e), ft === null)) var r = !1;
      else {
        if (((e = ft), (ft = null), (ul = 0), O & 6)) throw Error(k(331));
        var l = O;
        for (O |= 4, C = e.current; C !== null; ) {
          var o = C,
            i = o.child;
          if (C.flags & 16) {
            var s = o.deletions;
            if (s !== null) {
              for (var u = 0; u < s.length; u++) {
                var a = s[u];
                for (C = a; C !== null; ) {
                  var m = C;
                  switch (m.tag) {
                    case 0:
                    case 11:
                    case 15:
                      In(8, m, o);
                  }
                  var h = m.child;
                  if (h !== null) ((h.return = m), (C = h));
                  else
                    for (; C !== null; ) {
                      m = C;
                      var v = m.sibling,
                        g = m.return;
                      if ((ac(m), m === a)) {
                        C = null;
                        break;
                      }
                      if (v !== null) {
                        ((v.return = g), (C = v));
                        break;
                      }
                      C = g;
                    }
                }
              }
              var y = o.alternate;
              if (y !== null) {
                var x = y.child;
                if (x !== null) {
                  y.child = null;
                  do {
                    var T = x.sibling;
                    ((x.sibling = null), (x = T));
                  } while (x !== null);
                }
              }
              C = o;
            }
          }
          if (o.subtreeFlags & 2064 && i !== null) ((i.return = o), (C = i));
          else
            e: for (; C !== null; ) {
              if (((o = C), o.flags & 2048))
                switch (o.tag) {
                  case 0:
                  case 11:
                  case 15:
                    In(9, o, o.return);
                }
              var f = o.sibling;
              if (f !== null) {
                ((f.return = o.return), (C = f));
                break e;
              }
              C = o.return;
            }
        }
        var c = e.current;
        for (C = c; C !== null; ) {
          i = C;
          var p = i.child;
          if (i.subtreeFlags & 2064 && p !== null) ((p.return = i), (C = p));
          else
            e: for (i = c; C !== null; ) {
              if (((s = C), s.flags & 2048))
                try {
                  switch (s.tag) {
                    case 0:
                    case 11:
                    case 15:
                      wl(9, s);
                  }
                } catch (S) {
                  Y(s, s.return, S);
                }
              if (s === i) {
                C = null;
                break e;
              }
              var w = s.sibling;
              if (w !== null) {
                ((w.return = s.return), (C = w));
                break e;
              }
              C = s.return;
            }
        }
        if (((O = l), Nt(), We && typeof We.onPostCommitFiberRoot == 'function'))
          try {
            We.onPostCommitFiberRoot(fl, e);
          } catch {}
        r = !0;
      }
      return r;
    } finally {
      ((I = n), (ze.transition = t));
    }
  }
  return !1;
}
function es(e, t, n) {
  ((t = pn(n, t)),
    (t = qa(e, t, 1)),
    (e = vt(e, t, 1)),
    (t = ce()),
    e !== null && (lr(e, 1, t), ye(e, t)));
}
function Y(e, t, n) {
  if (e.tag === 3) es(e, e, n);
  else
    for (; t !== null; ) {
      if (t.tag === 3) {
        es(t, e, n);
        break;
      } else if (t.tag === 1) {
        var r = t.stateNode;
        if (
          typeof t.type.getDerivedStateFromError == 'function' ||
          (typeof r.componentDidCatch == 'function' && (yt === null || !yt.has(r)))
        ) {
          ((e = pn(n, e)),
            (e = ba(t, e, 1)),
            (t = vt(t, e, 1)),
            (e = ce()),
            t !== null && (lr(t, 1, e), ye(t, e)));
          break;
        }
      }
      t = t.return;
    }
}
function ep(e, t, n) {
  var r = e.pingCache;
  (r !== null && r.delete(t),
    (t = ce()),
    (e.pingedLanes |= e.suspendedLanes & n),
    ee === e &&
      (ne & n) === n &&
      (q === 4 || (q === 3 && (ne & 130023424) === ne && 500 > G() - Di) ? Lt(e, 0) : (Oi |= n)),
    ye(e, t));
}
function wc(e, t) {
  t === 0 && (e.mode & 1 ? ((t = hr), (hr <<= 1), !(hr & 130023424) && (hr = 4194304)) : (t = 1));
  var n = ce();
  ((e = et(e, t)), e !== null && (lr(e, t, n), ye(e, n)));
}
function tp(e) {
  var t = e.memoizedState,
    n = 0;
  (t !== null && (n = t.retryLane), wc(e, n));
}
function np(e, t) {
  var n = 0;
  switch (e.tag) {
    case 13:
      var r = e.stateNode,
        l = e.memoizedState;
      l !== null && (n = l.retryLane);
      break;
    case 19:
      r = e.stateNode;
      break;
    default:
      throw Error(k(314));
  }
  (r !== null && r.delete(t), wc(e, n));
}
var kc;
kc = function (e, t, n) {
  if (e !== null)
    if (e.memoizedProps !== t.pendingProps || he.current) me = !0;
    else {
      if (!(e.lanes & n) && !(t.flags & 128)) return ((me = !1), Bd(e, t, n));
      me = !!(e.flags & 131072);
    }
  else ((me = !1), V && t.flags & 1048576 && Na(t, qr, t.index));
  switch (((t.lanes = 0), t.tag)) {
    case 2:
      var r = t.type;
      ($r(e, t), (e = t.pendingProps));
      var l = an(t, ue.current);
      (on(t, n), (l = Pi(null, t, r, e, l, n)));
      var o = Ti();
      return (
        (t.flags |= 1),
        typeof l == 'object' && l !== null && typeof l.render == 'function' && l.$$typeof === void 0
          ? ((t.tag = 1),
            (t.memoizedState = null),
            (t.updateQueue = null),
            ve(r) ? ((o = !0), Zr(t)) : (o = !1),
            (t.memoizedState = l.state !== null && l.state !== void 0 ? l.state : null),
            Si(t),
            (l.updater = gl),
            (t.stateNode = l),
            (l._reactInternals = t),
            Oo(t, r, e, n),
            (t = Io(null, t, r, !0, o, n)))
          : ((t.tag = 0), V && o && vi(t), se(null, t, l, n), (t = t.child)),
        t
      );
    case 16:
      r = t.elementType;
      e: {
        switch (
          ($r(e, t),
          (e = t.pendingProps),
          (l = r._init),
          (r = l(r._payload)),
          (t.type = r),
          (l = t.tag = lp(r)),
          (e = De(r, e)),
          l)
        ) {
          case 0:
            t = $o(null, t, r, e, n);
            break e;
          case 1:
            t = Wu(null, t, r, e, n);
            break e;
          case 11:
            t = Vu(null, t, r, e, n);
            break e;
          case 14:
            t = Bu(null, t, r, De(r.type, e), n);
            break e;
        }
        throw Error(k(306, r, ''));
      }
      return t;
    case 0:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : De(r, l)),
        $o(e, t, r, l, n)
      );
    case 1:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : De(r, l)),
        Wu(e, t, r, l, n)
      );
    case 3:
      e: {
        if ((rc(t), e === null)) throw Error(k(387));
        ((r = t.pendingProps), (o = t.memoizedState), (l = o.element), za(e, t), tl(t, r, null, n));
        var i = t.memoizedState;
        if (((r = i.element), o.isDehydrated))
          if (
            ((o = {
              element: r,
              isDehydrated: !1,
              cache: i.cache,
              pendingSuspenseBoundaries: i.pendingSuspenseBoundaries,
              transitions: i.transitions,
            }),
            (t.updateQueue.baseState = o),
            (t.memoizedState = o),
            t.flags & 256)
          ) {
            ((l = pn(Error(k(423)), t)), (t = Qu(e, t, r, n, l)));
            break e;
          } else if (r !== l) {
            ((l = pn(Error(k(424)), t)), (t = Qu(e, t, r, n, l)));
            break e;
          } else
            for (
              xe = ht(t.stateNode.containerInfo.firstChild),
                _e = t,
                V = !0,
                Ie = null,
                n = Pa(t, null, r, n),
                t.child = n;
              n;
            )
              ((n.flags = (n.flags & -3) | 4096), (n = n.sibling));
        else {
          if ((cn(), r === l)) {
            t = tt(e, t, n);
            break e;
          }
          se(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return (
        Ma(t),
        e === null && Mo(t),
        (r = t.type),
        (l = t.pendingProps),
        (o = e !== null ? e.memoizedProps : null),
        (i = l.children),
        Co(r, l) ? (i = null) : o !== null && Co(r, o) && (t.flags |= 32),
        nc(e, t),
        se(e, t, i, n),
        t.child
      );
    case 6:
      return (e === null && Mo(t), null);
    case 13:
      return lc(e, t, n);
    case 4:
      return (
        Ni(t, t.stateNode.containerInfo),
        (r = t.pendingProps),
        e === null ? (t.child = fn(t, null, r, n)) : se(e, t, r, n),
        t.child
      );
    case 11:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : De(r, l)),
        Vu(e, t, r, l, n)
      );
    case 7:
      return (se(e, t, t.pendingProps, n), t.child);
    case 8:
      return (se(e, t, t.pendingProps.children, n), t.child);
    case 12:
      return (se(e, t, t.pendingProps.children, n), t.child);
    case 10:
      e: {
        if (
          ((r = t.type._context),
          (l = t.pendingProps),
          (o = t.memoizedProps),
          (i = l.value),
          F(br, r._currentValue),
          (r._currentValue = i),
          o !== null)
        )
          if (He(o.value, i)) {
            if (o.children === l.children && !he.current) {
              t = tt(e, t, n);
              break e;
            }
          } else
            for (o = t.child, o !== null && (o.return = t); o !== null; ) {
              var s = o.dependencies;
              if (s !== null) {
                i = o.child;
                for (var u = s.firstContext; u !== null; ) {
                  if (u.context === r) {
                    if (o.tag === 1) {
                      ((u = Je(-1, n & -n)), (u.tag = 2));
                      var a = o.updateQueue;
                      if (a !== null) {
                        a = a.shared;
                        var m = a.pending;
                        (m === null ? (u.next = u) : ((u.next = m.next), (m.next = u)),
                          (a.pending = u));
                      }
                    }
                    ((o.lanes |= n),
                      (u = o.alternate),
                      u !== null && (u.lanes |= n),
                      Lo(o.return, n, t),
                      (s.lanes |= n));
                    break;
                  }
                  u = u.next;
                }
              } else if (o.tag === 10) i = o.type === t.type ? null : o.child;
              else if (o.tag === 18) {
                if (((i = o.return), i === null)) throw Error(k(341));
                ((i.lanes |= n),
                  (s = i.alternate),
                  s !== null && (s.lanes |= n),
                  Lo(i, n, t),
                  (i = o.sibling));
              } else i = o.child;
              if (i !== null) i.return = o;
              else
                for (i = o; i !== null; ) {
                  if (i === t) {
                    i = null;
                    break;
                  }
                  if (((o = i.sibling), o !== null)) {
                    ((o.return = i.return), (i = o));
                    break;
                  }
                  i = i.return;
                }
              o = i;
            }
        (se(e, t, l.children, n), (t = t.child));
      }
      return t;
    case 9:
      return (
        (l = t.type),
        (r = t.pendingProps.children),
        on(t, n),
        (l = Me(l)),
        (r = r(l)),
        (t.flags |= 1),
        se(e, t, r, n),
        t.child
      );
    case 14:
      return ((r = t.type), (l = De(r, t.pendingProps)), (l = De(r.type, l)), Bu(e, t, r, l, n));
    case 15:
      return ec(e, t, t.type, t.pendingProps, n);
    case 17:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : De(r, l)),
        $r(e, t),
        (t.tag = 1),
        ve(r) ? ((e = !0), Zr(t)) : (e = !1),
        on(t, n),
        Ja(t, r, l),
        Oo(t, r, l, n),
        Io(null, t, r, !0, e, n)
      );
    case 19:
      return oc(e, t, n);
    case 22:
      return tc(e, t, n);
  }
  throw Error(k(156, t.tag));
};
function xc(e, t) {
  return Gs(e, t);
}
function rp(e, t, n, r) {
  ((this.tag = e),
    (this.key = n),
    (this.sibling =
      this.child =
      this.return =
      this.stateNode =
      this.type =
      this.elementType =
        null),
    (this.index = 0),
    (this.ref = null),
    (this.pendingProps = t),
    (this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null),
    (this.mode = r),
    (this.subtreeFlags = this.flags = 0),
    (this.deletions = null),
    (this.childLanes = this.lanes = 0),
    (this.alternate = null));
}
function Te(e, t, n, r) {
  return new rp(e, t, n, r);
}
function Ai(e) {
  return ((e = e.prototype), !(!e || !e.isReactComponent));
}
function lp(e) {
  if (typeof e == 'function') return Ai(e) ? 1 : 0;
  if (e != null) {
    if (((e = e.$$typeof), e === li)) return 11;
    if (e === oi) return 14;
  }
  return 2;
}
function wt(e, t) {
  var n = e.alternate;
  return (
    n === null
      ? ((n = Te(e.tag, t, e.key, e.mode)),
        (n.elementType = e.elementType),
        (n.type = e.type),
        (n.stateNode = e.stateNode),
        (n.alternate = e),
        (e.alternate = n))
      : ((n.pendingProps = t),
        (n.type = e.type),
        (n.flags = 0),
        (n.subtreeFlags = 0),
        (n.deletions = null)),
    (n.flags = e.flags & 14680064),
    (n.childLanes = e.childLanes),
    (n.lanes = e.lanes),
    (n.child = e.child),
    (n.memoizedProps = e.memoizedProps),
    (n.memoizedState = e.memoizedState),
    (n.updateQueue = e.updateQueue),
    (t = e.dependencies),
    (n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
    (n.sibling = e.sibling),
    (n.index = e.index),
    (n.ref = e.ref),
    n
  );
}
function Ar(e, t, n, r, l, o) {
  var i = 2;
  if (((r = e), typeof e == 'function')) Ai(e) && (i = 1);
  else if (typeof e == 'string') i = 5;
  else
    e: switch (e) {
      case Wt:
        return Rt(n.children, l, o, t);
      case ri:
        ((i = 8), (l |= 8));
        break;
      case ro:
        return ((e = Te(12, n, t, l | 2)), (e.elementType = ro), (e.lanes = o), e);
      case lo:
        return ((e = Te(13, n, t, l)), (e.elementType = lo), (e.lanes = o), e);
      case oo:
        return ((e = Te(19, n, t, l)), (e.elementType = oo), (e.lanes = o), e);
      case Ms:
        return xl(n, l, o, t);
      default:
        if (typeof e == 'object' && e !== null)
          switch (e.$$typeof) {
            case Ts:
              i = 10;
              break e;
            case zs:
              i = 9;
              break e;
            case li:
              i = 11;
              break e;
            case oi:
              i = 14;
              break e;
            case it:
              ((i = 16), (r = null));
              break e;
          }
        throw Error(k(130, e == null ? e : typeof e, ''));
    }
  return ((t = Te(i, n, t, l)), (t.elementType = e), (t.type = r), (t.lanes = o), t);
}
function Rt(e, t, n, r) {
  return ((e = Te(7, e, r, t)), (e.lanes = n), e);
}
function xl(e, t, n, r) {
  return (
    (e = Te(22, e, r, t)),
    (e.elementType = Ms),
    (e.lanes = n),
    (e.stateNode = { isHidden: !1 }),
    e
  );
}
function ql(e, t, n) {
  return ((e = Te(6, e, null, t)), (e.lanes = n), e);
}
function bl(e, t, n) {
  return (
    (t = Te(4, e.children !== null ? e.children : [], e.key, t)),
    (t.lanes = n),
    (t.stateNode = {
      containerInfo: e.containerInfo,
      pendingChildren: null,
      implementation: e.implementation,
    }),
    t
  );
}
function op(e, t, n, r, l) {
  ((this.tag = t),
    (this.containerInfo = e),
    (this.finishedWork = this.pingCache = this.current = this.pendingChildren = null),
    (this.timeoutHandle = -1),
    (this.callbackNode = this.pendingContext = this.context = null),
    (this.callbackPriority = 0),
    (this.eventTimes = Rl(0)),
    (this.expirationTimes = Rl(-1)),
    (this.entangledLanes =
      this.finishedLanes =
      this.mutableReadLanes =
      this.expiredLanes =
      this.pingedLanes =
      this.suspendedLanes =
      this.pendingLanes =
        0),
    (this.entanglements = Rl(0)),
    (this.identifierPrefix = r),
    (this.onRecoverableError = l),
    (this.mutableSourceEagerHydrationData = null));
}
function Hi(e, t, n, r, l, o, i, s, u) {
  return (
    (e = new op(e, t, n, s, u)),
    t === 1 ? ((t = 1), o === !0 && (t |= 8)) : (t = 0),
    (o = Te(3, null, null, t)),
    (e.current = o),
    (o.stateNode = e),
    (o.memoizedState = {
      element: r,
      isDehydrated: n,
      cache: null,
      transitions: null,
      pendingSuspenseBoundaries: null,
    }),
    Si(o),
    e
  );
}
function ip(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return {
    $$typeof: Bt,
    key: r == null ? null : '' + r,
    children: e,
    containerInfo: t,
    implementation: n,
  };
}
function _c(e) {
  if (!e) return xt;
  e = e._reactInternals;
  e: {
    if (Ut(e) !== e || e.tag !== 1) throw Error(k(170));
    var t = e;
    do {
      switch (t.tag) {
        case 3:
          t = t.stateNode.context;
          break e;
        case 1:
          if (ve(t.type)) {
            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
            break e;
          }
      }
      t = t.return;
    } while (t !== null);
    throw Error(k(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (ve(n)) return _a(e, n, t);
  }
  return t;
}
function Sc(e, t, n, r, l, o, i, s, u) {
  return (
    (e = Hi(n, r, !0, e, l, o, i, s, u)),
    (e.context = _c(null)),
    (n = e.current),
    (r = ce()),
    (l = gt(n)),
    (o = Je(r, l)),
    (o.callback = t ?? null),
    vt(n, o, l),
    (e.current.lanes = l),
    lr(e, l, r),
    ye(e, r),
    e
  );
}
function _l(e, t, n, r) {
  var l = t.current,
    o = ce(),
    i = gt(l);
  return (
    (n = _c(n)),
    t.context === null ? (t.context = n) : (t.pendingContext = n),
    (t = Je(o, i)),
    (t.payload = { element: e }),
    (r = r === void 0 ? null : r),
    r !== null && (t.callback = r),
    (e = vt(l, t, i)),
    e !== null && (Ae(e, l, i, o), Rr(e, l, i)),
    i
  );
}
function al(e) {
  if (((e = e.current), !e.child)) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function ts(e, t) {
  if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function Ui(e, t) {
  (ts(e, t), (e = e.alternate) && ts(e, t));
}
function up() {
  return null;
}
var Nc =
  typeof reportError == 'function'
    ? reportError
    : function (e) {
        console.error(e);
      };
function Vi(e) {
  this._internalRoot = e;
}
Sl.prototype.render = Vi.prototype.render = function (e) {
  var t = this._internalRoot;
  if (t === null) throw Error(k(409));
  _l(e, t, null, null);
};
Sl.prototype.unmount = Vi.prototype.unmount = function () {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    (Ft(function () {
      _l(null, e, null, null);
    }),
      (t[be] = null));
  }
};
function Sl(e) {
  this._internalRoot = e;
}
Sl.prototype.unstable_scheduleHydration = function (e) {
  if (e) {
    var t = ta();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < st.length && t !== 0 && t < st[n].priority; n++);
    (st.splice(n, 0, e), n === 0 && ra(e));
  }
};
function Bi(e) {
  return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11));
}
function Nl(e) {
  return !(
    !e ||
    (e.nodeType !== 1 &&
      e.nodeType !== 9 &&
      e.nodeType !== 11 &&
      (e.nodeType !== 8 || e.nodeValue !== ' react-mount-point-unstable '))
  );
}
function ns() {}
function sp(e, t, n, r, l) {
  if (l) {
    if (typeof r == 'function') {
      var o = r;
      r = function () {
        var a = al(i);
        o.call(a);
      };
    }
    var i = Sc(t, r, e, 0, null, !1, !1, '', ns);
    return (
      (e._reactRootContainer = i),
      (e[be] = i.current),
      Gn(e.nodeType === 8 ? e.parentNode : e),
      Ft(),
      i
    );
  }
  for (; (l = e.lastChild); ) e.removeChild(l);
  if (typeof r == 'function') {
    var s = r;
    r = function () {
      var a = al(u);
      s.call(a);
    };
  }
  var u = Hi(e, 0, !1, null, null, !1, !1, '', ns);
  return (
    (e._reactRootContainer = u),
    (e[be] = u.current),
    Gn(e.nodeType === 8 ? e.parentNode : e),
    Ft(function () {
      _l(t, u, n, r);
    }),
    u
  );
}
function El(e, t, n, r, l) {
  var o = n._reactRootContainer;
  if (o) {
    var i = o;
    if (typeof l == 'function') {
      var s = l;
      l = function () {
        var u = al(i);
        s.call(u);
      };
    }
    _l(t, i, e, l);
  } else i = sp(n, t, e, l, r);
  return al(i);
}
bs = function (e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = Tn(t.pendingLanes);
        n !== 0 && (si(t, n | 1), ye(t, G()), !(O & 6) && ((mn = G() + 500), Nt()));
      }
      break;
    case 13:
      (Ft(function () {
        var r = et(e, 1);
        if (r !== null) {
          var l = ce();
          Ae(r, e, 1, l);
        }
      }),
        Ui(e, 1));
  }
};
ai = function (e) {
  if (e.tag === 13) {
    var t = et(e, 134217728);
    if (t !== null) {
      var n = ce();
      Ae(t, e, 134217728, n);
    }
    Ui(e, 134217728);
  }
};
ea = function (e) {
  if (e.tag === 13) {
    var t = gt(e),
      n = et(e, t);
    if (n !== null) {
      var r = ce();
      Ae(n, e, t, r);
    }
    Ui(e, t);
  }
};
ta = function () {
  return I;
};
na = function (e, t) {
  var n = I;
  try {
    return ((I = e), t());
  } finally {
    I = n;
  }
};
vo = function (e, t, n) {
  switch (t) {
    case 'input':
      if ((so(e, n), (t = n.name), n.type === 'radio' && t != null)) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (
          n = n.querySelectorAll('input[name=' + JSON.stringify('' + t) + '][type="radio"]'), t = 0;
          t < n.length;
          t++
        ) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var l = hl(r);
            if (!l) throw Error(k(90));
            (Rs(r), so(r, l));
          }
        }
      }
      break;
    case 'textarea':
      Ds(e, n);
      break;
    case 'select':
      ((t = n.value), t != null && tn(e, !!n.multiple, t, !1));
  }
};
Vs = $i;
Bs = Ft;
var ap = { usingClientEntryPoint: !1, Events: [ir, Gt, hl, Hs, Us, $i] },
  Cn = {
    findFiberByHostInstance: Tt,
    bundleType: 0,
    version: '18.3.1',
    rendererPackageName: 'react-dom',
  },
  cp = {
    bundleType: Cn.bundleType,
    version: Cn.version,
    rendererPackageName: Cn.rendererPackageName,
    rendererConfig: Cn.rendererConfig,
    overrideHookState: null,
    overrideHookStateDeletePath: null,
    overrideHookStateRenamePath: null,
    overrideProps: null,
    overridePropsDeletePath: null,
    overridePropsRenamePath: null,
    setErrorHandler: null,
    setSuspenseHandler: null,
    scheduleUpdate: null,
    currentDispatcherRef: nt.ReactCurrentDispatcher,
    findHostInstanceByFiber: function (e) {
      return ((e = Ks(e)), e === null ? null : e.stateNode);
    },
    findFiberByHostInstance: Cn.findFiberByHostInstance || up,
    findHostInstancesForRefresh: null,
    scheduleRefresh: null,
    scheduleRoot: null,
    setRefreshHandler: null,
    getCurrentFiber: null,
    reconcilerVersion: '18.3.1-next-f1338f8080-20240426',
  };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < 'u') {
  var Cr = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!Cr.isDisabled && Cr.supportsFiber)
    try {
      ((fl = Cr.inject(cp)), (We = Cr));
    } catch {}
}
Ne.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ap;
Ne.createPortal = function (e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!Bi(t)) throw Error(k(200));
  return ip(e, t, null, n);
};
Ne.createRoot = function (e, t) {
  if (!Bi(e)) throw Error(k(299));
  var n = !1,
    r = '',
    l = Nc;
  return (
    t != null &&
      (t.unstable_strictMode === !0 && (n = !0),
      t.identifierPrefix !== void 0 && (r = t.identifierPrefix),
      t.onRecoverableError !== void 0 && (l = t.onRecoverableError)),
    (t = Hi(e, 1, !1, null, null, n, !1, r, l)),
    (e[be] = t.current),
    Gn(e.nodeType === 8 ? e.parentNode : e),
    new Vi(t)
  );
};
Ne.findDOMNode = function (e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == 'function'
      ? Error(k(188))
      : ((e = Object.keys(e).join(',')), Error(k(268, e)));
  return ((e = Ks(t)), (e = e === null ? null : e.stateNode), e);
};
Ne.flushSync = function (e) {
  return Ft(e);
};
Ne.hydrate = function (e, t, n) {
  if (!Nl(t)) throw Error(k(200));
  return El(null, e, t, !0, n);
};
Ne.hydrateRoot = function (e, t, n) {
  if (!Bi(e)) throw Error(k(405));
  var r = (n != null && n.hydratedSources) || null,
    l = !1,
    o = '',
    i = Nc;
  if (
    (n != null &&
      (n.unstable_strictMode === !0 && (l = !0),
      n.identifierPrefix !== void 0 && (o = n.identifierPrefix),
      n.onRecoverableError !== void 0 && (i = n.onRecoverableError)),
    (t = Sc(t, null, e, 1, n ?? null, l, !1, o, i)),
    (e[be] = t.current),
    Gn(e),
    r)
  )
    for (e = 0; e < r.length; e++)
      ((n = r[e]),
        (l = n._getVersion),
        (l = l(n._source)),
        t.mutableSourceEagerHydrationData == null
          ? (t.mutableSourceEagerHydrationData = [n, l])
          : t.mutableSourceEagerHydrationData.push(n, l));
  return new Sl(t);
};
Ne.render = function (e, t, n) {
  if (!Nl(t)) throw Error(k(200));
  return El(null, e, t, !1, n);
};
Ne.unmountComponentAtNode = function (e) {
  if (!Nl(e)) throw Error(k(40));
  return e._reactRootContainer
    ? (Ft(function () {
        El(null, null, e, !1, function () {
          ((e._reactRootContainer = null), (e[be] = null));
        });
      }),
      !0)
    : !1;
};
Ne.unstable_batchedUpdates = $i;
Ne.unstable_renderSubtreeIntoContainer = function (e, t, n, r) {
  if (!Nl(n)) throw Error(k(200));
  if (e == null || e._reactInternals === void 0) throw Error(k(38));
  return El(e, t, n, !1, r);
};
Ne.version = '18.3.1-next-f1338f8080-20240426';
function Ec() {
  if (
    !(
      typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
      typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
    )
  )
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Ec);
    } catch (e) {
      console.error(e);
    }
}
(Ec(), (Es.exports = Ne));
var fp = Es.exports,
  Cc,
  rs = fp;
((Cc = rs.createRoot), rs.hydrateRoot);
function dp(e) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e)) throw new Error('Day must be encoded as YYYY-MM-DD');
  return e;
}
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const jc = (...e) =>
  e
    .filter((t, n, r) => !!t && t.trim() !== '' && r.indexOf(t) === n)
    .join(' ')
    .trim();
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const pp = (e) => e.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const mp = (e) =>
  e.replace(/^([A-Z])|[\s-_]+(\w)/g, (t, n, r) => (r ? r.toUpperCase() : n.toLowerCase()));
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const ls = (e) => {
  const t = mp(e);
  return t.charAt(0).toUpperCase() + t.slice(1);
};
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var eo = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const hp = (e) => {
    for (const t in e) if (t.startsWith('aria-') || t === 'role' || t === 'title') return !0;
    return !1;
  },
  vp = _.createContext({}),
  yp = () => _.useContext(vp),
  gp = _.forwardRef(
    (
      {
        color: e,
        size: t,
        strokeWidth: n,
        absoluteStrokeWidth: r,
        className: l = '',
        children: o,
        iconNode: i,
        ...s
      },
      u,
    ) => {
      const {
          size: a = 24,
          strokeWidth: m = 2,
          absoluteStrokeWidth: h = !1,
          color: v = 'currentColor',
          className: g = '',
        } = yp() ?? {},
        y = (r ?? h) ? (Number(n ?? m) * 24) / Number(t ?? a) : (n ?? m);
      return _.createElement(
        'svg',
        {
          ref: u,
          ...eo,
          width: t ?? a ?? eo.width,
          height: t ?? a ?? eo.height,
          stroke: e ?? v,
          strokeWidth: y,
          className: jc('lucide', g, l),
          ...(!o && !hp(s) && { 'aria-hidden': 'true' }),
          ...s,
        },
        [...i.map(([x, T]) => _.createElement(x, T)), ...(Array.isArray(o) ? o : [o])],
      );
    },
  );
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const A = (e, t) => {
  const n = _.forwardRef(({ className: r, ...l }, o) =>
    _.createElement(gp, {
      ref: o,
      iconNode: t,
      className: jc(`lucide-${pp(ls(e))}`, `lucide-${e}`, r),
      ...l,
    }),
  );
  return ((n.displayName = ls(e)), n);
};
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const wp = [
    ['path', { d: 'm5 12 7-7 7 7', key: 'hav0vg' }],
    ['path', { d: 'M12 19V5', key: 'x0mq9r' }],
  ],
  kp = A('arrow-up', wp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const xp = [['path', { d: 'M20 6 9 17l-5-5', key: '1gmf2c' }]],
  _p = A('check', xp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Sp = [['path', { d: 'm15 18-6-6 6-6', key: '1wnfg3' }]],
  os = A('chevron-left', Sp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Np = [['path', { d: 'm9 18 6-6-6-6', key: 'mthhwq' }]],
  Ep = A('chevron-right', Np);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Cp = [
    ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
    ['path', { d: 'm9 12 2 2 4-4', key: 'dzmm74' }],
  ],
  jp = A('circle-check', Cp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Pp = [
    ['path', { d: 'M10.1 2.182a10 10 0 0 1 3.8 0', key: '5ilxe3' }],
    ['path', { d: 'M13.9 21.818a10 10 0 0 1-3.8 0', key: '11zvb9' }],
    ['path', { d: 'M17.609 3.721a10 10 0 0 1 2.69 2.7', key: '1iw5b2' }],
    ['path', { d: 'M2.182 13.9a10 10 0 0 1 0-3.8', key: 'c0bmvh' }],
    ['path', { d: 'M20.279 17.609a10 10 0 0 1-2.7 2.69', key: '1ruxm7' }],
    ['path', { d: 'M21.818 10.1a10 10 0 0 1 0 3.8', key: 'qkgqxc' }],
    ['path', { d: 'M3.721 6.391a10 10 0 0 1 2.7-2.69', key: '1mcia2' }],
    ['path', { d: 'M6.391 20.279a10 10 0 0 1-2.69-2.7', key: '1fvljs' }],
  ],
  Tp = A('circle-dashed', Pp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const zp = [['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }]],
  Mp = A('circle', zp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Lp = [
    ['path', { d: 'M12 15V3', key: 'm9g1x1' }],
    ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', key: 'ih7n3h' }],
    ['path', { d: 'm7 10 5 5 5-5', key: 'brsn70' }],
  ],
  Rp = A('download', Lp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Op = [
    ['circle', { cx: '12', cy: '12', r: '1', key: '41hilf' }],
    ['circle', { cx: '12', cy: '5', r: '1', key: 'gxeob9' }],
    ['circle', { cx: '12', cy: '19', r: '1', key: 'lyex9k' }],
  ],
  Dp = A('ellipsis-vertical', Op);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const $p = [
    ['circle', { cx: '12', cy: '9', r: '1', key: '124mty' }],
    ['circle', { cx: '19', cy: '9', r: '1', key: '1ruzo2' }],
    ['circle', { cx: '5', cy: '9', r: '1', key: '1a8b28' }],
    ['circle', { cx: '12', cy: '15', r: '1', key: '1e56xg' }],
    ['circle', { cx: '19', cy: '15', r: '1', key: '1a92ep' }],
    ['circle', { cx: '5', cy: '15', r: '1', key: '5r1jwy' }],
  ],
  Ip = A('grip-horizontal', $p);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Fp = [
    ['path', { d: 'M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2', key: '1fvzgz' }],
    ['path', { d: 'M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2', key: '1kc0my' }],
    ['path', { d: 'M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8', key: '10h0bg' }],
    [
      'path',
      {
        d: 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
        key: '1s1gnw',
      },
    ],
  ],
  Ap = A('hand', Fp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Hp = [
    ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
    ['path', { d: 'M12 16v-4', key: '1dtifu' }],
    ['path', { d: 'M12 8h.01', key: 'e9boi3' }],
  ],
  Up = A('info', Hp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Vp = [
    [
      'path',
      {
        d: 'M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z',
        key: '1s6t7t',
      },
    ],
    ['circle', { cx: '16.5', cy: '7.5', r: '.5', fill: 'currentColor', key: 'w0ekpg' }],
  ],
  Bp = A('key-round', Vp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Wp = [
    ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
    ['path', { d: 'M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z', key: 'b2q4dd' }],
    ['line', { x1: '9', x2: '9.01', y1: '9', y2: '9', key: 'yxxnd0' }],
    ['line', { x1: '15', x2: '15.01', y1: '9', y2: '9', key: '1p4y9e' }],
  ],
  Qp = A('laugh', Wp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Kp = [
    ['path', { d: 'M4 5h16', key: '1tepv9' }],
    ['path', { d: 'M4 12h16', key: '1lakjw' }],
    ['path', { d: 'M4 19h16', key: '1djgab' }],
  ],
  Yp = A('menu', Kp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Gp = [['path', { d: 'M5 12h14', key: '1ays0h' }]],
  Xp = A('minus', Gp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const Zp = [
    ['path', { d: 'm15 9-6 6', key: '1uzhvr' }],
    [
      'path',
      {
        d: 'M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z',
        key: '2d38gg',
      },
    ],
    ['path', { d: 'm9 9 6 6', key: 'z0biqf' }],
  ],
  Jp = A('octagon-x', Zp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const qp = [
    ['path', { d: 'M5.8 11.3 2 22l10.7-3.79', key: 'gwxi1d' }],
    ['path', { d: 'M4 3h.01', key: '1vcuye' }],
    ['path', { d: 'M22 8h.01', key: '1mrtc2' }],
    ['path', { d: 'M15 2h.01', key: '1cjtqr' }],
    ['path', { d: 'M22 20h.01', key: '1mrys2' }],
    [
      'path',
      {
        d: 'm22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10',
        key: 'hbicv8',
      },
    ],
    [
      'path',
      { d: 'm22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17', key: '1i94pl' },
    ],
    [
      'path',
      { d: 'm11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7', key: '1cofks' },
    ],
    [
      'path',
      {
        d: 'M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z',
        key: '4kbmks',
      },
    ],
  ],
  is = A('party-popper', qp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const bp = [
    [
      'path',
      {
        d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
        key: '1a8usu',
      },
    ],
    ['path', { d: 'm15 5 4 4', key: '1mk7zo' }],
  ],
  em = A('pencil', bp);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const tm = [
    ['path', { d: 'M5 12h14', key: '1ays0h' }],
    ['path', { d: 'M12 5v14', key: 's699le' }],
  ],
  nm = A('plus', tm);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const rm = [
    [
      'path',
      {
        d: 'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915',
        key: '1i5ecw',
      },
    ],
    ['circle', { cx: '12', cy: '12', r: '3', key: '1v7zrd' }],
  ],
  lm = A('settings', rm);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const om = [
    ['path', { d: 'M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', key: '1m0v6g' }],
    [
      'path',
      {
        d: 'M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z',
        key: 'ohrbg2',
      },
    ],
  ],
  im = A('square-pen', om);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const um = [
    ['path', { d: 'M10 11v6', key: 'nco0om' }],
    ['path', { d: 'M14 11v6', key: 'outv1u' }],
    ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', key: 'miytrc' }],
    ['path', { d: 'M3 6h18', key: 'd0wm0j' }],
    ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', key: 'e791ji' }],
  ],
  sm = A('trash-2', um);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const am = [
    ['path', { d: 'M19 16v-2a2 2 0 0 0-4 0v2', key: '17sujf' }],
    ['path', { d: 'M9.5 15H7a4 4 0 0 0-4 4v2', key: '9it25y' }],
    ['circle', { cx: '10', cy: '7', r: '4', key: 'e45bow' }],
    ['rect', { x: '13', y: '16', width: '8', height: '5', rx: '.899', key: 'ur80nz' }],
  ],
  cm = A('user-lock', am);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const fm = [
    ['path', { d: 'M2 21a8 8 0 0 1 13.292-6', key: 'bjp14o' }],
    ['circle', { cx: '10', cy: '8', r: '5', key: 'o932ke' }],
    ['path', { d: 'M19 16v6', key: 'tddt3s' }],
    ['path', { d: 'M22 19h-6', key: 'vcuq98' }],
  ],
  dm = A('user-round-plus', fm);
/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const pm = [
    ['path', { d: 'M18 6 6 18', key: '1bl5f8' }],
    ['path', { d: 'm6 6 12 12', key: 'd8bk6v' }],
  ],
  mm = A('x', pm),
  hm = {
    gear: lm,
    chevronLeft: os,
    chevronRight: Ep,
    chevronBack: os,
    arrowUp: kp,
    check: _p,
    close: mm,
    'circle-check': jp,
    circle: Mp,
    'circle-dashed': Tp,
    download: Rp,
    'ellipsis-vertical': Dp,
    'grip-horizontal': Ip,
    hand: Ap,
    info: Up,
    minus: Xp,
    'key-round': Bp,
    laugh: Qp,
    menu: Yp,
    'octagon-x': Jp,
    pencil: em,
    'square-pen': im,
    trash: sm,
    'user-lock': cm,
    'user-round-plus': dm,
    plus: nm,
    party: is,
    'party-popper': is,
  },
  vm = { small: 13, medium: 16, large: 20 };
function At({ name: e, size: t = 'medium', sizePx: n, className: r }) {
  const l = hm[e],
    o = n ?? vm[t],
    i = e === 'plus' || e === 'minus' ? 2.5 : 2;
  return d.jsx(l, { className: r, size: o, strokeWidth: i, 'aria-hidden': !0 });
}
function Re({
  type: e,
  color: t = 'primary',
  size: n = 'medium',
  icon: r,
  circle: l = !1,
  text: o,
  className: i,
  ...s
}) {
  const u = r != null && !o,
    a = [
      'button',
      e === 'primary' && 'button--primary',
      e === 'secondary' && 'button--secondary',
      e === 'tertiary' && 'button--tertiary',
      t === 'danger' && 'button--danger',
      t === 'muted' && 'button--muted',
      `button--${n}`,
      r != null && 'button--with-icon',
      u && 'button--icon',
      l && u && 'button--circle',
      i,
    ]
      .filter(Boolean)
      .join(' ');
  return d.jsx('button', {
    type: 'button',
    className: a || void 0,
    ...s,
    children:
      r && o
        ? d.jsxs('span', {
            className: 'button__inner',
            children: [d.jsx(At, { name: r, size: n }), o],
          })
        : d.jsxs(d.Fragment, { children: [r != null ? d.jsx(At, { name: r, size: n }) : null, o] }),
  });
}
const Pc = _.createContext(null);
function Wi({
  children: e,
  id: t = 'modal-title',
  className: n,
  titleClassName: r,
  dismissDisabled: l = !1,
  dismissLabel: o = 'Close',
}) {
  const { closeModal: i } = Cl();
  return d.jsxs('div', {
    className: ['modal__header', n].filter(Boolean).join(' '),
    children: [
      d.jsx('h2', {
        id: t,
        className: ['modal__header-title', 'text-h-l', r].filter(Boolean).join(' '),
        children: e,
      }),
      d.jsx(Re, {
        type: 'tertiary',
        size: 'medium',
        icon: 'close',
        circle: !0,
        text: '',
        className: 'modal__header-dismiss',
        'aria-label': o,
        onClick: i,
        disabled: l,
      }),
    ],
  });
}
function Qi({ children: e, className: t }) {
  return d.jsx('div', { className: ['modal__content', t].filter(Boolean).join(' '), children: e });
}
function ym({ children: e, className: t }) {
  return d.jsx('div', { className: ['modal__footer', t].filter(Boolean).join(' '), children: e });
}
function gm({ children: e }) {
  const [t, n] = _.useState(null),
    r = _.useRef(null),
    l = _.useRef(0);
  r.current = t;
  const o = _.useCallback(() => {
      var a;
      const u = r.current;
      u && (n(null), (r.current = null), (a = u.onRequestClose) == null || a.call(u));
    }, []),
    i = _.useCallback((u) => {
      const a = ++l.current,
        m = {
          generation: a,
          content: u.content,
          size: u.size ?? 'medium',
          onRequestClose: u.onRequestClose,
        };
      return (
        (r.current = m),
        n(m),
        () => {
          n((h) => ((h == null ? void 0 : h.generation) === a ? ((r.current = null), null) : h));
        }
      );
    }, []);
  _.useEffect(() => {
    if (!t) return;
    const u = (a) => {
      a.key === 'Escape' && o();
    };
    return (window.addEventListener('keydown', u), () => window.removeEventListener('keydown', u));
  }, [t, o]);
  const s = _.useMemo(() => ({ present: i, closeModal: o }), [i, o]);
  return d.jsxs(Pc.Provider, {
    value: s,
    children: [
      e,
      t
        ? d.jsx('div', {
            className: 'modal__backdrop',
            role: 'presentation',
            onClick: o,
            children: d.jsx('div', {
              className: [
                'modal__dialog',
                t.size === 'large' && 'modal__dialog--large',
                t.size === 'xl' && 'modal__dialog--xl',
              ]
                .filter(Boolean)
                .join(' '),
              role: 'dialog',
              'aria-modal': 'true',
              'aria-labelledby': 'modal-title',
              onClick: (u) => u.stopPropagation(),
              children: t.content,
            }),
          })
        : null,
    ],
  });
}
function Cl() {
  const e = _.useContext(Pc);
  if (!e) throw new Error('useModal must be used within ModalProvider');
  return e;
}
function jl(e, t) {
  const n = typeof t == 'string' ? t.split(/\s+/).filter(Boolean) : [];
  for (const [r, l] of Object.entries(e)) l && n.push(r);
  return n.join(' ');
}
const wm = { info: 'info', error: 'octagon-x', success: 'circle-check', warning: 'info' },
  km = {
    info: 'text-light',
    error: 'text-error',
    success: 'text-success',
    warning: 'text-warning',
  },
  xm = {
    info: 'info-text--info',
    error: 'info-text--error',
    success: 'info-text--success',
    warning: 'info-text--warning',
  },
  _m = { small: 'text-b-s', medium: 'text-b-m' };
function Sm({ variant: e, size: t = 'small', children: n, className: r, ...l }) {
  const o = jl({ [r ?? '']: !!r }, `info-text ${xm[e]} ${_m[t]} ${km[e]}`);
  return d.jsxs('p', {
    className: o,
    ...l,
    children: [
      d.jsx(At, { className: 'info-text__icon', name: wm[e], size: 'medium' }),
      d.jsx('span', { children: n }),
    ],
  });
}
function jr(e) {
  return e.replace(/\D/g, '');
}
function to(e) {
  const t = e.replace(/\u2212/g, '-');
  let n = '',
    r = 0;
  t[r] === '-' && ((n = '-'), (r += 1));
  let l = '';
  for (; r < t.length; r += 1) {
    const o = t[r];
    o >= '0' && o <= '9' && (l += o);
  }
  return n !== '' && l === '' ? '-' : n + l;
}
function Nm(e) {
  const t = e.replace(/\u2212/g, '-');
  return !/^-?\d*$/.test(t);
}
const Em = 480;
function Cm({
  value: e = '',
  type: t = 'string',
  onChange: n,
  onSubmit: r,
  onReject: l,
  dismissable: o = !1,
  submittable: i = !1,
  disabled: s = !1,
  alwaysDismissable: u = !1,
  size: a = 'medium',
  className: m,
  inputClassName: h,
  applyAriaLabel: v,
  revertAriaLabel: g,
  allowNegative: y = !1,
  onTypingRejected: x,
  placeholder: T,
  autoFocus: f = !1,
  autoComplete: c,
  inputMode: p,
  pattern: w,
  ...S
}) {
  const j = _.useId(),
    N = _.useRef(null),
    P = (D) => (t === 'number' ? (y ? to(D) : jr(D)) : D),
    [$, L] = _.useState(() => P(e)),
    [ge, Ke] = _.useState(!1),
    we = _.useRef(void 0);
  _.useEffect(() => {
    L(t === 'number' ? (y ? to(e) : jr(e)) : e);
  }, [t, e, y]);
  const Et = $.trim() !== '',
    sr = u || (o && Et);
  (_.useLayoutEffect(() => {
    f &&
      queueMicrotask(() => {
        var D;
        return (D = N.current) == null ? void 0 : D.focus();
      });
  }, [f]),
    _.useEffect(
      () => () => {
        we.current !== void 0 && clearTimeout(we.current);
      },
      [],
    ));
  const gn = [
      'input',
      a === 'small' && 'input--small',
      !i && 'input--not-submittable',
      sr && 'input--dismissable',
      ge && 'input--reject-flash',
      m,
    ]
      .filter(Boolean)
      .join(' '),
    Ce = t === 'number',
    E = t === 'password',
    z = () => {
      (we.current !== void 0 && (clearTimeout(we.current), (we.current = void 0)),
        Ke(!1),
        queueMicrotask(() => {
          (Ke(!0),
            (we.current = setTimeout(() => {
              (Ke(!1), (we.current = void 0));
            }, Em)));
        }));
    },
    M = () => {
      if (l) {
        l();
        return;
      }
      if (i) {
        const rt = P(e);
        L(rt);
        return;
      }
      const D = P('');
      (L(D), n == null || n(D));
    },
    B = (D) => {
      Ce && (y ? Nm(D) : jr(D) !== D) && (z(), x == null || x());
      const rt = Ce ? (y ? to(D) : jr(D)) : D;
      (L(rt), i || n == null || n(rt));
    },
    X = (D) => {
      if (D.key === 'Escape') {
        (D.preventDefault(), M());
        return;
      }
      if (D.key === 'Enter') {
        if ((D.preventDefault(), !i || !Et)) return;
        r == null || r($);
      }
    },
    Ct = sr
      ? d.jsx(Re, {
          type: 'tertiary',
          size: 'small',
          icon: 'close',
          circle: !0,
          disabled: s,
          className: 'input__cta',
          'aria-label': g,
          onClick: M,
        })
      : null;
  return d.jsxs('label', {
    className: gn,
    htmlFor: j,
    children: [
      i ? Ct : null,
      d.jsx('input', {
        ...S,
        ref: N,
        id: j,
        type: E ? 'password' : 'text',
        role: Ce ? 'spinbutton' : void 0,
        placeholder: T,
        inputMode: Ce ? 'numeric' : p,
        pattern: Ce ? (y ? '-?[0-9]*' : '[0-9]*') : w,
        autoComplete: Ce ? 'off' : E ? (c ?? 'current-password') : c,
        'aria-valuemin': Ce && !y ? 0 : void 0,
        'aria-valuenow': Ce && $ !== '' && Number.isFinite(Number($)) ? Number($) : void 0,
        className: ['input__input', h].filter(Boolean).join(' '),
        value: $,
        onChange: (D) => B(D.target.value),
        disabled: s,
        onKeyDown: X,
      }),
      i ? null : Ct,
      i &&
        d.jsx(Re, {
          type: 'primary',
          size: 'medium',
          icon: 'arrowUp',
          circle: !0,
          disabled: s || !Et,
          className: 'input__cta',
          'aria-label': v,
          onClick: () => {
            Et && (r == null || r($));
          },
        }),
    ],
  });
}
const jm = 'Enter value',
  Pm = 'Value must be a number';
function us(e) {
  const t = e.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function Tm({ habitName: e, displayTotal: t, closeModal: n, onSubmit: r }) {
  const [l, o] = _.useState(''),
    [i, s] = _.useState(!1),
    [u, a] = _.useState(!1),
    m = _.useMemo(() => us(l), [l]),
    h = m != null ? (t ?? 0) + m : null,
    v = m != null && m < 0,
    g = m != null && !i,
    y = i ? (v ? 'Subtracting…' : 'Adding…') : v ? 'Subtract' : 'Add',
    x = (c) => {
      (c !== l && us(c) != null && a(!1), o(c));
    },
    T = async () => {
      if (!(m == null || i)) {
        s(!0);
        try {
          (await r(m), n());
        } finally {
          s(!1);
        }
      }
    },
    f =
      [
        u ? 'count-control-add-number-error' : null,
        h != null ? 'count-control-add-new-total' : null,
      ]
        .filter(Boolean)
        .join(' ') || void 0;
  return d.jsxs(d.Fragment, {
    children: [
      d.jsxs(Wi, { dismissDisabled: i, children: ['Add to "', e, '"'] }),
      d.jsxs(Qi, {
        className: 'count-control__modal',
        children: [
          d.jsx(Cm, {
            className: 'count-control__modal-input',
            size: 'small',
            type: 'number',
            allowNegative: !0,
            autoFocus: !0,
            value: l,
            onChange: x,
            onTypingRejected: () => a(!0),
            placeholder: jm,
            disabled: i,
            'aria-label': `Amount for ${e}`,
            'aria-describedby': f,
            'aria-invalid': u,
          }),
          u
            ? d.jsx(Sm, {
                id: 'count-control-add-number-error',
                size: 'small',
                variant: 'error',
                'aria-live': 'polite',
                children: Pm,
              })
            : null,
          h != null
            ? d.jsxs('p', {
                id: 'count-control-add-new-total',
                className: 'count-control__new-total text-b-m text-light',
                children: ['New total: ', h],
              })
            : null,
        ],
      }),
      d.jsxs(ym, {
        children: [
          d.jsx(Re, {
            type: 'tertiary',
            size: 'medium',
            text: 'Cancel',
            className: 'mr-2',
            disabled: i,
            onClick: n,
          }),
          d.jsx(Re, {
            type: 'primary',
            size: 'medium',
            text: y,
            disabled: !g,
            onClick: () => void T(),
          }),
        ],
      }),
    ],
  });
}
function zm(e) {
  const t = e
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return t.length > 0 ? t : 'habit';
}
function Ki(e, t) {
  const n = typeof t == 'string' ? t.split(/\s+/).filter(Boolean) : [];
  for (const [r, l] of Object.entries(e)) l && n.push(r);
  return n.join(' ');
}
const ss = 'habit';
function Tc(e) {
  return zm(e);
}
function Mm(e) {
  return Tc(e);
}
function Lm(e, t) {
  const n = new URLSearchParams(e);
  t ? n.set(ss, t) : n.delete(ss);
  const r = n.toString();
  return r ? `?${r}` : '';
}
function Rm(e, t) {
  const n = Lm('', Mm(t));
  return `/users/${encodeURIComponent(e)}/settings/config${n}`;
}
function Om(e, t, n = '') {
  const r = new URLSearchParams(n),
    l = new URLSearchParams();
  l.set('filter', Tc(t));
  for (const [o, i] of r) o !== 'filter' && l.append(o, i);
  return `/users/${encodeURIComponent(e)}/habits/detail?${l.toString()}`;
}
function Dm(e) {
  return e != null && e.manualInput && e.increments.length > 0;
}
function $m(e) {
  return e > 0 ? `+${e}` : String(e);
}
function zc(e) {
  return Fm(e) ? (e.total ?? 0) >= e.goal : !1;
}
function Im(e) {
  return e.type === 'summation';
}
function Fm(e) {
  return Im(e) && e.goal != null && e.goal > 0;
}
const as = 'after hours';
function Am(e) {
  const t = e.match(/^(\d{1,2}):/);
  if (!t) return null;
  const n = Number(t[1]);
  return !Number.isInteger(n) || n < 0 || n > 23 ? null : n;
}
function Hm(e) {
  const { day: t, time: n } = e.createdAt;
  return !t || !n ? null : Am(n);
}
function Um(e) {
  return new Date(2e3, 0, 1, e, 0, 0).toLocaleTimeString(void 0, { hour: 'numeric', hour12: !0 });
}
function Vm(e) {
  const t = (e + 1) % 24,
    n = new Intl.DateTimeFormat(void 0, { hour: 'numeric', hour12: !0 }),
    r = (u) => {
      var v, g;
      const a = n.formatToParts(new Date(2e3, 0, 1, u, 0, 0)),
        m = ((v = a.find((y) => y.type === 'hour')) == null ? void 0 : v.value) ?? '',
        h = (g = a.find((y) => y.type === 'dayPeriod')) == null ? void 0 : g.value;
      return { hourVal: m, dayPeriod: h };
    },
    l = r(e),
    o = r(t);
  if (l.dayPeriod && o.dayPeriod && l.dayPeriod === o.dayPeriod)
    return `${l.hourVal} – ${o.hourVal} ${o.dayPeriod}`;
  if (l.dayPeriod && o.dayPeriod)
    return `${l.hourVal} ${l.dayPeriod} – ${o.hourVal} ${o.dayPeriod}`;
  const i = new Date(2e3, 0, 1, e, 0, 0),
    s = new Date(2e3, 0, 1, t, 0, 0);
  return `${n.format(i)} – ${n.format(s)}`;
}
function Bm(e, t) {
  const n = e.createdAt.day;
  return n !== '' && n === t;
}
function Wm(e) {
  const t = [...e];
  let n = !0;
  for (; n; ) {
    n = !1;
    for (let l = 0; l < t.length; l++) {
      if (t[l] >= 0) continue;
      let o = l - 1;
      for (; o >= 0 && t[o] <= 0; ) o--;
      o < 0 || ((t[o] += t[l]), (t[l] = 0), (n = !0));
    }
  }
  const r = new Set();
  for (let l = 0; l < t.length; l++) t[l] < 0 && r.add(l);
  return { adjusted: t, negativeIndices: r };
}
function Qm(e, t) {
  const n = Array.from({ length: 24 }, () => 0);
  let r = 0,
    l = !1;
  for (const m of e) {
    if (!Bm(m, t)) {
      ((l = !0), (r += m.amount));
      continue;
    }
    const h = Hm(m);
    h != null && (n[h] += m.amount);
  }
  const o = l ? [...n, r] : n,
    { adjusted: i, negativeIndices: s } = Wm(o),
    u = Math.max(1, ...i.map((m) => Math.max(0, m))),
    a = {};
  for (let m = 0; m < 24; m++)
    a[Um(m)] = {
      value: i[m],
      top: u,
      hoverLabel: Vm(m),
      ...(s.has(m) ? { trackModifier: 'negative' } : {}),
    };
  return (
    l &&
      (a[as] = {
        value: i[24],
        top: u,
        hoverLabel: as,
        ...(s.has(24) ? { trackModifier: 'negative' } : {}),
      }),
    a
  );
}
const Km = { name: 'Habit', type: 'summation', goal: null, options: [], value: null, total: null };
function Ym(e) {
  return {
    name: e.name,
    type: 'single_select',
    goal: e.goal,
    options: e.options,
    value: e.value,
    ...(e.theme != null ? { theme: e.theme } : {}),
    ...(e.widgets != null ? { widgets: e.widgets } : {}),
  };
}
function Gm(e) {
  return {
    name: e.name,
    type: 'summation',
    goal: e.goal,
    total: e.total,
    ...(e.events != null ? { events: e.events } : {}),
    ...(e.summationOptions != null ? { summationOptions: e.summationOptions } : {}),
    ...(e.widgets != null ? { widgets: e.widgets } : {}),
  };
}
function cs(e, t) {
  return t === 'checkbox'
    ? {
        ...e,
        type: t,
        options: ['yes', 'no'],
        theme: 'checkbox',
        value: e.value === 'yes' || e.value === 'no' ? e.value : null,
      }
    : t === 'single_select'
      ? {
          ...e,
          type: t,
          theme: void 0,
          value: e.value,
          options: e.options.length > 0 ? e.options : [],
        }
      : { ...e, type: t };
}
function Xo(e) {
  const t = (n) => Xo({ ...e, ...n });
  return {
    withName: (n) => t({ name: n }),
    withType: (n) => Xo(cs(e, n)),
    withGoal: (n) => t({ goal: n }),
    withOptions: (n) => t({ options: n }),
    withTheme: (n) => t({ theme: n }),
    withValue: (n) => t({ value: n }),
    withTotal: (n) => t({ total: n }),
    withEvents: (n) => t({ events: n }),
    withSummationOptions: (n) => t({ summationOptions: n }),
    withWidgets: (n) => t({ widgets: n }),
    withWidget: (n) => t({ widgets: [...(e.widgets ?? []), n] }),
    model: () => (e.type === 'summation' ? Gm(e) : Ym(cs(e, e.type))),
  };
}
function Yi() {
  return Xo(Km);
}
const Xm = { title: 'Widget', body: [] };
function Mc(e) {
  const t = (r) => Mc({ ...e, ...r }),
    n = (r) => t({ body: [...e.body, r] });
  return {
    withTitle: (r) => t({ title: r }),
    withTitleValue: (r) => t({ titleValue: r }),
    withTitleValueHoverText: (r) => t({ titleValueHoverText: r }),
    withBody: (r) => t({ body: r }),
    withBodyItem: n,
    withPills: (r) => n({ kind: 'pills', pills: r }),
    withProgress: (r, l) => n({ kind: 'progress', value: r, max: l }),
    withBarGraph: ({ data: r, lines: l }) =>
      n({ kind: 'barGraph', data: r, ...(l != null ? { lines: l } : {}) }),
    withStreakGraph: (r) => n({ kind: 'streakGraph', graph: r }),
    model: () => ({
      title: e.title,
      body: e.body,
      ...(e.titleValue != null ? { titleValue: e.titleValue } : {}),
      ...(e.titleValueHoverText != null ? { titleValueHoverText: e.titleValueHoverText } : {}),
    }),
  };
}
function Gi() {
  return Mc(Xm);
}
function fs({ habitName: e, pending: t, onClick: n }) {
  return d.jsx(Re, {
    type: 'tertiary',
    size: 'medium',
    text: '+',
    disabled: t,
    className: 'count-control__amount-trigger text-b-m',
    onClick: n,
    'aria-label': `Enter custom amount for ${e}`,
  });
}
function Zm({ summationSteps: e, displayTotal: t, habitName: n, pending: r, onAddDelta: l }) {
  const o = Dm(e),
    i = o ? e.increments : [],
    { present: s, closeModal: u } = Cl(),
    a = _.useCallback(() => {
      s({ content: d.jsx(Tm, { habitName: n, displayTotal: t, closeModal: u, onSubmit: l }) });
    }, [s, u, n, t, l]),
    m = async (h) => {
      await l(h);
    };
  return o
    ? d.jsx('div', {
        className: 'count-control',
        children: d.jsxs('div', {
          className: 'count-control__manual-row',
          children: [
            d.jsx(fs, { habitName: n, pending: r, onClick: a }),
            d.jsx('div', {
              className: 'count-control__increments',
              role: 'group',
              'aria-label': 'Quick add amounts',
              children: i.map((h, v) =>
                d.jsx(
                  Re,
                  {
                    type: 'secondary',
                    size: 'medium',
                    text: $m(h),
                    disabled: r,
                    className: h < 0 ? 'text-error' : void 0,
                    onClick: () => void m(h),
                    'aria-label': h < 0 ? `Subtract ${Math.abs(h)} from ${n}` : `Add ${h} to ${n}`,
                  },
                  `${h}-${v}`,
                ),
              ),
            }),
          ],
        }),
      })
    : d.jsx('div', {
        className: 'count-control',
        children: d.jsx(fs, { habitName: n, pending: r, onClick: a }),
      });
}
function Lc({
  user: e,
  habitName: t,
  className: n,
  pending: r = !1,
  goalHit: l = !1,
  currentSearch: o,
  LinkComponent: i,
  menuAriaLabel: s,
  onMenuClick: u,
  actions: a,
}) {
  const m = Om(e, t, o ?? (typeof window < 'u' ? window.location.search : ''));
  return d.jsxs('div', {
    className: Ki({}, ['habit-heading', n].filter(Boolean).join(' ')),
    children: [
      d.jsxs('div', {
        className: 'habit-heading__left',
        children: [
          l
            ? d.jsx(At, {
                name: 'check',
                size: 'medium',
                className: 'habit-heading__goal-hit-check text-success',
              })
            : null,
          i
            ? d.jsx(i, { className: 'text-color-link text-h-m', to: m, children: t })
            : d.jsx('a', { className: 'text-color-link text-h-m', href: m, children: t }),
          d.jsx(Re, {
            type: 'tertiary',
            size: 'small',
            icon: 'ellipsis-vertical',
            circle: !0,
            text: '',
            disabled: r,
            onClick: u,
            'aria-label': s,
            className: 'habit-heading__menu',
          }),
        ],
      }),
      a ? d.jsx('div', { className: 'habit-heading__actions', children: a }) : null,
    ],
  });
}
function Jm({ user: e, habitName: t, pending: n = !1, onNavigate: r, closeModal: l, onReset: o }) {
  const i = () => {
    const s = Rm(e, t);
    (l(), r ? r(s) : (window.location.href = s));
  };
  return d.jsxs(d.Fragment, {
    children: [
      d.jsxs(Wi, { dismissDisabled: n, children: [t, ' options'] }),
      d.jsxs(Qi, {
        className: 'habit-menu-modal__body',
        children: [
          d.jsx(Re, {
            type: 'secondary',
            size: 'medium',
            text: 'Reset data for day',
            className: 'habit-menu-modal__action',
            disabled: n,
            onClick: () => {
              o();
            },
          }),
          d.jsx(Re, {
            type: 'secondary',
            size: 'medium',
            text: 'Edit widget',
            className: 'habit-menu-modal__action',
            disabled: n,
            onClick: i,
          }),
        ],
      }),
    ],
  });
}
function qm({
  selected: e,
  onToggle: t,
  size: n = 'large',
  children: r,
  className: l,
  type: o = 'button',
  ...i
}) {
  return d.jsx('button', {
    type: o,
    className: jl(
      {
        'pill--selected': e,
        'pill--small text-b-s': n === 'small',
        'pill--large text-b-m': n === 'large',
      },
      `pill pill--toggle ${l}`,
    ),
    'aria-pressed': e,
    onClick: () => t(!e),
    ...i,
    children: r,
  });
}
function bm(e) {
  return e == null ? 'yes' : e === 'yes' ? 'no' : null;
}
function eh({ value: e, onChange: t, className: n, type: r = 'button', ...l }) {
  return d.jsxs('button', {
    type: r,
    className: jl(
      { 'ternary-checkbox--yes': e === 'yes', 'ternary-checkbox--no': e === 'no' },
      ['ternary-checkbox', n].filter(Boolean).join(' '),
    ),
    onClick: () => t(bm(e)),
    ...l,
    children: [
      e === 'yes' ? d.jsx(At, { name: 'check', sizePx: 24, className: 'text-success' }) : null,
      e === 'no' ? d.jsx(At, { name: 'close', sizePx: 24, className: 'text-error' }) : null,
    ],
  });
}
function th(e) {
  return (
    e.theme === 'checkbox' &&
    e.options.length === 2 &&
    e.options.includes('yes') &&
    e.options.includes('no')
  );
}
function nh(e) {
  return e === 'yes' || e === 'no' ? e : null;
}
function rh({ user: e, habit: t, pending: n, onNavigate: r, onUpdate: l }) {
  const { present: o, closeModal: i } = Cl();
  return _.useCallback(() => {
    o({
      content: d.jsx(Jm, {
        user: e,
        habitName: t.name,
        pending: n,
        onNavigate: r,
        closeModal: i,
        onReset: async () => {
          (await l({ habit: t.name, action: 'clear' }), i());
        },
      }),
    });
  }, [o, i, t.name, r, l, n, e]);
}
function lh({ habit: e, pending: t, onUpdate: n }) {
  const r = th(e),
    l = _.useCallback(
      async (o) => {
        o == null
          ? await n({ habit: e.name, action: 'clear' })
          : await n({ habit: e.name, value: o });
      },
      [e.name, n],
    );
  return r
    ? d.jsx(eh, {
        value: nh(e.value),
        'aria-label': `${e.name}: ${e.value ?? 'not set'}`,
        disabled: t,
        onChange: (o) => {
          l(o);
        },
      })
    : d.jsx('div', {
        className: 'habit-select__options',
        children: e.options.map((o) => {
          const i = e.value === o,
            s = e.value != null && !i;
          return d.jsx(
            qm,
            {
              selected: i,
              disabled: t,
              className: s
                ? 'habit-select__option habit-select__option--dim'
                : 'habit-select__option',
              onToggle: (u) => {
                (async () =>
                  u
                    ? await n({ habit: e.name, value: o })
                    : await n({ habit: e.name, action: 'clear' }))();
              },
              children: o,
            },
            o,
          );
        }),
      });
}
function oh({
  user: e,
  habit: t,
  pending: n,
  currentSearch: r,
  LinkComponent: l,
  openResetModal: o,
  onUpdate: i,
}) {
  return d.jsx(Lc, {
    user: e,
    habitName: t.name,
    pending: n,
    goalHit: zc(t),
    currentSearch: r,
    LinkComponent: l,
    menuAriaLabel: `More options for ${t.name}`,
    onMenuClick: o,
    className: 'mb-4',
    actions: d.jsx(lh, { habit: t, pending: n, onUpdate: i }),
  });
}
function ih({
  user: e,
  habit: t,
  pending: n,
  currentSearch: r,
  LinkComponent: l,
  openResetModal: o,
  onUpdate: i,
}) {
  return d.jsx(Lc, {
    user: e,
    habitName: t.name,
    pending: n,
    goalHit: zc(t),
    currentSearch: r,
    LinkComponent: l,
    menuAriaLabel: `More options for ${t.name}`,
    onMenuClick: o,
    className: 'mb-4',
    actions: d.jsx(Zm, {
      summationSteps: t.summationOptions,
      displayTotal: t.total,
      habitName: t.name,
      pending: n,
      onAddDelta: (s) => i({ habit: t.name, total: s }),
    }),
  });
}
function uh({
  user: e,
  habit: t,
  pending: n,
  currentSearch: r,
  LinkComponent: l,
  onNavigate: o,
  onUpdate: i,
}) {
  const s = rh({ user: e, habit: t, pending: n, onNavigate: o, onUpdate: i });
  return t.type === 'single_select'
    ? d.jsx(oh, {
        user: e,
        habit: t,
        pending: n,
        currentSearch: r,
        LinkComponent: l,
        openResetModal: s,
        onUpdate: i,
      })
    : d.jsx(ih, {
        user: e,
        habit: t,
        pending: n,
        currentSearch: r,
        LinkComponent: l,
        openResetModal: s,
        onUpdate: i,
      });
}
const Rc = _.createContext(null);
function Oc(e) {
  const t = _.useContext(Rc);
  if (!t) throw new Error(`${e} must be used inside Hoverable.Root`);
  return t;
}
function sh({ children: e, openDelay: t = 60 }) {
  const [n, r] = _.useState(!1),
    l = _.useRef(null),
    o = _.useRef(null),
    i = _.useCallback(() => {
      o.current && (clearTimeout(o.current), (o.current = null));
    }, []),
    s = _.useCallback(() => {
      n ||
        (i(),
        (o.current = setTimeout(() => {
          ((o.current = null), r(!0));
        }, t)));
    }, [n, t, i]),
    u = _.useCallback(() => {
      (i(), r(!1));
    }, [i]),
    a = _.useMemo(() => ({ open: n, anchorRef: l, beginHover: s, endHover: u }), [n, s, u]);
  return (
    _.useLayoutEffect(
      () => () => {
        i();
      },
      [i],
    ),
    d.jsx(Rc.Provider, { value: a, children: e })
  );
}
const ah = _.forwardRef(function ({ onMouseEnter: t, onMouseLeave: n, ...r }, l) {
  const { anchorRef: o, beginHover: i, endHover: s } = Oc('Hoverable.Anchor'),
    u = (a) => {
      ((o.current = a), typeof l == 'function' ? l(a) : l && (l.current = a));
    };
  return d.jsx('div', {
    ref: u,
    onMouseEnter: (a) => {
      (i(), t == null || t(a));
    },
    onMouseLeave: (a) => {
      (s(), n == null || n(a));
    },
    ...r,
  });
});
function ch({ children: e, className: t, offset: n = 8, side: r = 'bottom', ...l }) {
  const { open: o, anchorRef: i } = Oc('Hoverable.Content'),
    s = _.useRef(null),
    [u, a] = _.useState({ position: 'fixed', visibility: 'hidden', zIndex: 1200, left: 0, top: 0 });
  return (
    _.useLayoutEffect(() => {
      if (!o) return;
      const m = () => {
        const h = i.current,
          v = s.current;
        if (!h || !v) return;
        const g = h.getBoundingClientRect(),
          y = 8,
          x = Math.min(320, window.innerWidth - 2 * y);
        v.style.maxWidth = `${x}px`;
        const T = v.getBoundingClientRect(),
          f = window.innerHeight,
          c = window.innerWidth;
        let p, w;
        const S = (N) => Math.min(Math.max(y, N), f - T.height - y),
          j = () => {
            let N = g.left + g.width / 2 - T.width / 2;
            return (N < y && (N = y), N + T.width > c - y && (N = c - T.width - y), N);
          };
        (r === 'top'
          ? ((p = g.top - T.height - n),
            p < y && (p = g.bottom + n),
            p + T.height > f - y && (p = f - T.height - y),
            (w = j()))
          : r === 'bottom'
            ? ((p = g.bottom + n),
              p + T.height > f - y && (p = g.top - T.height - n),
              p < y && (p = y),
              (w = j()))
            : r === 'left'
              ? ((w = g.left - T.width - n),
                w < y && (w = g.right + n),
                w + T.width > c - y && (w = c - T.width - y),
                (p = S(g.top + (g.height - T.height) / 2)))
              : ((w = g.right + n),
                w + T.width > c - y && (w = g.left - T.width - n),
                w < y && (w = y),
                (p = S(g.top + (g.height - T.height) / 2))),
          a({ position: 'fixed', zIndex: 1200, left: w, top: p, visibility: 'visible' }));
      };
      return (
        m(),
        window.addEventListener('scroll', m, !0),
        window.addEventListener('resize', m),
        () => {
          (window.removeEventListener('scroll', m, !0), window.removeEventListener('resize', m));
        }
      );
    }, [o, i, n, r]),
    o
      ? d.jsx('div', {
          ref: s,
          role: 'tooltip',
          className: ['hover-layer__panel', 'text-b-m', t].filter(Boolean).join(' '),
          style: u,
          ...l,
          children: e,
        })
      : null
  );
}
const ae = { Root: sh, Anchor: ah, Content: ch },
  fh = 'No data';
function dh(e, t = []) {
  const n = [1, ...e, ...t];
  return Math.max(...n);
}
function ds(e, t) {
  return e == null || t <= 0 ? 0 : Math.max(0, Math.min(100, (e / t) * 100));
}
function Dc({ data: e, onHover: t, lines: n = [] }) {
  const r = Object.entries(e);
  if (r.length === 0) return null;
  const l = r.map(([, u]) => u.value).filter((u) => u != null),
    o = r.map(([, u]) => u.top),
    i = dh(l, o),
    s = n.filter((u) => u.value > 0 && l.some((a) => a > u.value));
  return d.jsx('div', {
    className: 'bar-graph',
    role: 'presentation',
    children: d.jsxs('div', {
      className: 'bar-graph__wrap',
      children: [
        r.map(([u, { value: a, hoverLabel: m, outline: h, dimmed: v, trackModifier: g }]) => {
          const y = Ki(
            {
              'bar-graph__track--negative': g === 'negative',
              'bar-graph__track--outlined': h,
              'bar-graph__track--dimmed': v,
            },
            'bar-graph__track',
          );
          return d.jsxs(
            ae.Root,
            {
              children: [
                d.jsx(ae.Anchor, {
                  className: y,
                  onMouseEnter: () => (t == null ? void 0 : t({ key: u, value: a })),
                  children: d.jsx('div', {
                    className: 'bar-graph__fill',
                    style: { height: `${ds(a, i)}%` },
                  }),
                }),
                d.jsx(ae.Content, {
                  className: 'bar-graph__hover',
                  side: 'top',
                  children: d.jsxs('div', {
                    className: 'bar-graph__hover-body',
                    children: [
                      d.jsx('span', { className: 'bar-graph__hover-range', children: m }),
                      d.jsx('span', {
                        className: 'bar-graph__hover-value text-h-m',
                        children: a ?? fh,
                      }),
                    ],
                  }),
                }),
              ],
            },
            u,
          );
        }),
        s.length > 0
          ? d.jsx('div', {
              className: 'bar-graph__lines-layer',
              children: s.map((u) =>
                d.jsx(
                  'div',
                  {
                    className: 'bar-graph__line',
                    style: { height: `${ds(u.value, i)}%` },
                    children: d.jsxs(ae.Root, {
                      children: [
                        d.jsx(ae.Anchor, { className: 'bar-graph__line-dot' }),
                        d.jsx(ae.Content, {
                          className: 'bar-graph__hover',
                          side: 'top',
                          children: d.jsx('span', { className: 'text-b-m', children: u.label }),
                        }),
                      ],
                    }),
                  },
                  `${u.value}-${u.label}`,
                ),
              ),
            })
          : null,
      ],
    }),
  });
}
function ph(e) {
  return e > 0 ? `+${e}` : String(e);
}
function mh(e) {
  if (!e.day) return e.time || '—';
  if (!e.time) {
    const r = new Date(
      Number(e.day.slice(0, 4)),
      Number(e.day.slice(5, 7)) - 1,
      Number(e.day.slice(8, 10)),
    );
    return Number.isNaN(r.getTime())
      ? e.day
      : r.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const t = e.time.match(/^(\d{1,2}):(\d{2})/);
  if (!t) return e.time;
  const n = new Date(2e3, 0, 1, Number(t[1]), Number(t[2]), 0);
  return Number.isNaN(n.getTime())
    ? e.time
    : n.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function hh(e) {
  const [t, n, r] = e.split('-').map((o) => Number(o));
  if (!t || !n || !r || Number.isNaN(t) || Number.isNaN(n) || Number.isNaN(r)) return e;
  const l = new Date(t, n - 1, r);
  return Number.isNaN(l.getTime())
    ? e
    : l.toLocaleDateString(void 0, { month: 'short', day: 'numeric', year: 'numeric' });
}
function vh({ habitName: e, events: t, onDeleteEvent: n }) {
  const [r, l] = _.useState(t),
    [o, i] = _.useState(null),
    s = async (u) => {
      i(u);
      try {
        (await n(u), l((a) => a.filter((m) => m.id !== u)));
      } finally {
        i(null);
      }
    };
  return d.jsxs(d.Fragment, {
    children: [
      d.jsxs(Wi, { children: ['Events — ', e] }),
      d.jsx(Qi, {
        className: 'habit-module-events__modal-body',
        children:
          r.length > 0
            ? d.jsx('ul', {
                className: 'habit-module-events__list',
                children: r.map((u) =>
                  d.jsxs(
                    'li',
                    {
                      className: 'habit-module-events__event',
                      children: [
                        d.jsx('span', { className: 'text-h-m', children: ph(u.amount) }),
                        d.jsxs('div', {
                          className: 'habit-module-events__event-actions',
                          children: [
                            d.jsxs('span', {
                              className: 'habit-module-events__datetime text-light text-b-m',
                              children: [
                                d.jsx('span', { children: mh(u.createdAt) }),
                                d.jsx('span', { children: hh(u.createdAt.day) }),
                              ],
                            }),
                            d.jsx(Re, {
                              type: 'tertiary',
                              size: 'medium',
                              icon: 'close',
                              circle: !0,
                              'aria-label': 'Remove this event',
                              disabled: o !== null,
                              onClick: () => void s(u.id),
                            }),
                          ],
                        }),
                      ],
                    },
                    u.id,
                  ),
                ),
              })
            : d.jsx('p', {
                className: 'text-light text-b-m',
                children: 'No summation events recorded for this day.',
              }),
      }),
    ],
  });
}
function yh({ habitName: e, dayKey: t, events: n, onBarHover: r, onDeleteSummationEvent: l }) {
  const { present: o, closeModal: i } = Cl(),
    s = _.useMemo(() => (n == null || n.length === 0 ? {} : Qm(n, t)), [n, t]),
    u = _.useCallback(() => {
      n != null && o({ content: d.jsx(vh, { habitName: e, events: n, onDeleteEvent: l }) });
    }, [o, i, e, n, l]);
  return n == null
    ? null
    : n.length === 0
      ? d.jsx('div', {
          className: 'habit-module-events',
          children: d.jsx('p', {
            className: 'text-light text-b-m habit-module-events__empty',
            children: 'No data',
          }),
        })
      : d.jsxs('div', {
          className: 'habit-module-events',
          children: [
            d.jsxs('div', {
              className: 'text-light text-b-m habit-module-events__meta',
              children: [
                d.jsx('span', { children: "Today's events" }),
                d.jsxs('span', {
                  className: 'habit-module-events__summary',
                  children: [
                    d.jsx('span', { children: n.length }),
                    d.jsx(Re, {
                      type: 'tertiary',
                      size: 'medium',
                      icon: 'square-pen',
                      circle: !0,
                      'aria-label': `Open events for ${e}`,
                      onClick: u,
                    }),
                  ],
                }),
              ],
            }),
            d.jsx(Dc, { data: s, onHover: r }),
          ],
        });
}
function gh({ body: e }) {
  return Object.keys(e.data).length === 0
    ? null
    : d.jsx('div', {
        className: 'habit-module-graph',
        children: d.jsx(Dc, { data: e.data, lines: e.lines }),
      });
}
function wh({ pills: e }) {
  return e == null || e.length === 0
    ? null
    : d.jsx('div', {
        className: 'habit-module-pills',
        children: e.map((t) =>
          t.hover
            ? d.jsxs(
                ae.Root,
                {
                  children: [
                    d.jsx(ae.Anchor, {
                      className: 'habit-module-pills__pill text-b-s text--hoverable',
                      children: t.label,
                    }),
                    d.jsx(ae.Content, {
                      className: 'habit-module-pills__pill-tooltip',
                      side: 'top',
                      children: d.jsx('span', { className: 'text-b-m', children: t.hover }),
                    }),
                  ],
                },
                `${t.label}-${t.hover}`,
              )
            : d.jsx(
                'span',
                { className: 'habit-module-pills__pill text-b-s', children: t.label },
                t.label,
              ),
        ),
      });
}
function kh(e, t) {
  return !Number.isFinite(e) || !Number.isFinite(t) || t <= 0
    ? 0
    : Math.min(100, Math.max(0, Math.round((e / t) * 100)));
}
function xh(e, t) {
  return !Number.isFinite(e) || !Number.isFinite(t) || t <= 0 ? 0 : Math.min(t, Math.max(0, e));
}
function _h({ value: e, max: t, className: n, 'aria-label': r }) {
  const l = kh(e, t),
    o = xh(e, t),
    i = `${e} of ${t}`;
  return d.jsx('div', {
    className: ['progress', n].filter(Boolean).join(' ') || void 0,
    role: 'progressbar',
    'aria-valuemin': 0,
    'aria-valuemax': t,
    'aria-valuenow': o,
    'aria-label': r ?? i,
    children: d.jsx('div', {
      className: 'progress__fill',
      style: { width: `${l}%` },
      'aria-hidden': !0,
    }),
  });
}
function Sh({ habitName: e, body: t }) {
  return d.jsx('div', {
    className: 'habit-module-progress',
    children: d.jsx(_h, {
      value: t.value ?? 0,
      max: t.max,
      'aria-label': `${e}: ${t.value ?? 0} of ${t.max}`,
    }),
  });
}
const $c = 3,
  Nh = 1,
  Eh = 12;
function Ch(e) {
  const t = Number.parseFloat(e);
  return Number.isFinite(t) ? t : 0;
}
function jh(e) {
  const t = window.getComputedStyle(e),
    n = Ch(t.columnGap || t.gap),
    r = e.querySelector('.heatmap__cell'),
    l = (r == null ? void 0 : r.getBoundingClientRect().width) ?? Eh,
    o = e.getBoundingClientRect().width;
  return Math.max(1, Math.floor((o + n) / (l + n)));
}
function Ph(e, t) {
  const n = Array.from({ length: t }, () => []);
  for (
    e.forEach((r, l) => {
      n[l % t].push(r);
    });
    n.length > 0 && n[n.length - 1].length === 0;
  )
    n.pop();
  return n;
}
function Th(e) {
  return Number.isFinite(e) ? Math.max(1, Math.trunc(e)) : $c;
}
function zh({ datum: e }) {
  const t = Ki(
      { 'heatmap__cell--outlined': e.outline, 'heatmap__cell--dimmed': e.dimmed },
      'heatmap__cell',
    ),
    n = { backgroundColor: e.color };
  return d.jsxs(ae.Root, {
    children: [
      d.jsx(ae.Anchor, { className: t, role: 'listitem', 'aria-label': e.ariaLabel, style: n }),
      d.jsxs(ae.Content, {
        className: 'heatmap__tooltip',
        side: 'top',
        children: [
          d.jsx('div', {
            className: 'heatmap__tooltip-label text-light text-b-s',
            children: e.label,
          }),
          d.jsx('div', { className: 'text-b-m', children: e.value }),
        ],
      }),
    ],
  });
}
function Mh({ entries: e, className: t, rows: n = $c }) {
  const r = _.useRef(null),
    [l, o] = _.useState(Nh),
    i = Th(n),
    s = e.slice(-(l * i)),
    u = Ph(s, i),
    a = t == null ? 'heatmap' : `heatmap ${t}`;
  return (
    _.useLayoutEffect(() => {
      const m = r.current;
      if (!m) return;
      const h = () => {
        const g = jh(m);
        o((y) => (y === g ? y : g));
      };
      h();
      const v = new ResizeObserver(h);
      return (v.observe(m), () => v.disconnect());
    }, [e.length]),
    e.length === 0
      ? null
      : d.jsx('div', {
          ref: r,
          className: a,
          role: 'list',
          children: u.map((m, h) =>
            d.jsx(
              'div',
              {
                className: 'heatmap__row',
                children: m.map(([v, g]) => d.jsx(zh, { datum: g }, v)),
              },
              h,
            ),
          ),
        })
  );
}
function Lh(e) {
  const [t, n, r] = e.split('-'),
    l = Number(t),
    o = Number(n),
    i = Number(r);
  if (!Number.isFinite(l) || !Number.isFinite(o) || !Number.isFinite(i)) return e;
  const s = new Date(l, o - 1, i);
  return Number.isNaN(s.getTime())
    ? e
    : s.toLocaleDateString(void 0, { weekday: 'short', month: 'short', day: 'numeric' });
}
function Rh(e) {
  const t = Number.isFinite(e.fill) ? Math.trunc(e.fill) : 0,
    n = Math.max(0, Math.min(10, t));
  return n === 0 && e.value != null ? 1 : n;
}
const Oh = [
  'var(--heatmap-fill-0)',
  'var(--heatmap-fill-1)',
  'var(--heatmap-fill-2)',
  'var(--heatmap-fill-3)',
  'var(--heatmap-fill-4)',
  'var(--heatmap-fill-5)',
  'var(--heatmap-fill-6)',
  'var(--heatmap-fill-7)',
  'var(--heatmap-fill-8)',
  'var(--heatmap-fill-9)',
  'var(--heatmap-fill-10)',
];
function Dh(e, t) {
  const n = t.label ?? Lh(e),
    r = t.value ?? (t.label != null ? 'No streak days logged' : 'No selection logged'),
    l = Rh(t);
  return [
    e,
    {
      label: n,
      value: t.value ?? '—',
      ariaLabel: `${n}: ${r}, fill ${l} of 10`,
      color: Oh[l],
      outline: t.outline,
      dimmed: t.dimmed,
    },
  ];
}
function $h({ streak: e }) {
  const t = _.useMemo(
      () => Object.entries(e.data).sort(([r], [l]) => r.localeCompare(l)),
      [e.data],
    ),
    n = _.useMemo(() => t.map(([r, l]) => Dh(r, l)), [t]);
  return t.length === 0
    ? null
    : d.jsx(Mh, { entries: n, className: 'habit-module-streak__heatmap' });
}
function Ih({ widget: e }) {
  return e.titleValue
    ? e.titleValueHoverText
      ? d.jsxs(ae.Root, {
          children: [
            d.jsx(ae.Anchor, {
              className: 'habit-widget__widget-title-value text--hoverable',
              children: e.titleValue,
            }),
            d.jsx(ae.Content, {
              className: 'habit-widget__widget-title-value-tooltip',
              side: 'top',
              children: d.jsx('span', { className: 'text-b-m', children: e.titleValueHoverText }),
            }),
          ],
        })
      : d.jsx('span', { className: 'habit-widget__widget-title-value', children: e.titleValue })
    : null;
}
function Fh(e, t) {
  switch (t.kind) {
    case 'pills':
      return d.jsx(wh, { pills: t.pills });
    case 'progress':
      return e.type === 'summation' ? d.jsx(Sh, { habitName: e.name, body: t }) : null;
    case 'barGraph':
      return d.jsx(gh, { body: t });
    case 'streakGraph':
      return d.jsx($h, { streak: t.graph });
  }
}
function Ah({ habit: e, widget: t }) {
  const n = t.body
    .map((r, l) => ({ key: `${r.kind}-${l}`, node: Fh(e, r) }))
    .filter((r) => r.node != null);
  return n.length === 0 && !t.titleValue
    ? null
    : d.jsxs('section', {
        className: 'habit-widget__widget',
        role: 'listitem',
        'aria-label': t.titleValue ? `${t.title}, ${t.titleValue}` : t.title,
        children: [
          d.jsxs('div', {
            className: 'habit-widget__widget-header text-light text-b-m',
            children: [
              d.jsx('span', { className: 'habit-widget__widget-title', children: t.title }),
              d.jsx(Ih, { widget: t }),
            ],
          }),
          n.length > 0
            ? d.jsx('div', {
                className: 'habit-widget__widget-body',
                children: n.map(({ key: r, node: l }) =>
                  d.jsx('div', { className: 'habit-widget__widget-body-item', children: l }, r),
                ),
              })
            : null,
        ],
      });
}
function Hh({ habit: e, viewDate: t, onDeleteSummationEvent: n }) {
  const r = e.widgets ?? [];
  return d.jsxs('div', {
    className: 'habit-widget',
    children: [
      e.type === 'summation'
        ? d.jsx(yh, {
            habitName: e.name,
            dayKey: t,
            events: e.events,
            onDeleteSummationEvent: (l) => (n == null ? void 0 : n(l)) ?? Promise.resolve(),
          })
        : null,
      r.length > 0
        ? d.jsx('div', {
            className: 'habit-widget__widgets',
            role: 'list',
            children: r.map((l, o) =>
              d.jsx(Ah, { habit: e, widget: l }, `${l.title}-${l.titleValue ?? 'widget'}-${o}`),
            ),
          })
        : null,
    ],
  });
}
const Ic = _.createContext(null);
function Uh({ children: e, linkComponent: t }) {
  const [n, r] = _.useState(null),
    l = _.useRef(null),
    o = _.useCallback(() => {
      (l.current != null && (window.clearTimeout(l.current), (l.current = null)),
        r((u) => {
          var a;
          return ((a = u == null ? void 0 : u.onDismiss) == null || a.call(u), null);
        }));
    }, []),
    i = _.useCallback(
      (u) => {
        (l.current != null && (window.clearTimeout(l.current), (l.current = null)),
          r((a) => {
            var m;
            return ((m = a == null ? void 0 : a.onDismiss) == null || m.call(a), u);
          }),
          u.persistent || (l.current = window.setTimeout(o, 6500)));
      },
      [o],
    );
  _.useEffect(
    () => () => {
      l.current != null && window.clearTimeout(l.current);
    },
    [],
  );
  const s = _.useMemo(() => ({ showToast: i, dismissToast: o }), [i, o]);
  return d.jsxs(Ic.Provider, {
    value: s,
    children: [
      e,
      n
        ? d.jsx('div', {
            className: 'toast__viewport',
            'aria-live': n.type === 'error' ? 'assertive' : 'polite',
            children: d.jsxs('div', {
              className: jl(
                {
                  'toast--error': n.type === 'error',
                  'toast--success': n.type === 'success',
                  'toast--info': n.type === 'info',
                },
                'toast',
              ),
              role: n.type === 'error' ? 'alert' : 'status',
              'aria-labelledby': n.title ? 'toast-title' : void 0,
              children: [
                d.jsxs('div', {
                  className: 'toast__content',
                  children: [
                    n.title
                      ? d.jsxs('div', {
                          className: 'toast__header',
                          children: [
                            n.titleIcon
                              ? d.jsx(At, {
                                  name: n.titleIcon,
                                  size: 'large',
                                  sizePx: 20,
                                  className: 'toast__title-icon',
                                })
                              : null,
                            d.jsx('p', {
                              id: 'toast-title',
                              className: 'toast__title text-h-s',
                              children: n.title,
                            }),
                          ],
                        })
                      : null,
                    d.jsxs('p', {
                      className: [
                        'toast__message',
                        'text-b-m',
                        n.type === 'error' ? 'text-error' : null,
                        n.type === 'success' ? 'text-success' : null,
                        n.title ? 'text-light' : null,
                      ]
                        .filter(Boolean)
                        .join(' '),
                      children: [
                        n.message,
                        n.ctaTitle && n.ctaLocation
                          ? d.jsxs(d.Fragment, {
                              children: [
                                ' ',
                                t
                                  ? d.jsx(t, {
                                      to: n.ctaLocation,
                                      className: 'toast__cta',
                                      onClick: o,
                                      children: n.ctaTitle,
                                    })
                                  : d.jsx('a', {
                                      href: n.ctaLocation,
                                      className: 'toast__cta',
                                      onClick: o,
                                      children: n.ctaTitle,
                                    }),
                              ],
                            })
                          : null,
                      ],
                    }),
                  ],
                }),
                d.jsx('button', {
                  type: 'button',
                  className: 'toast__dismiss text-dismiss-glyph',
                  'aria-label': 'Dismiss notification',
                  onClick: o,
                  children: '×',
                }),
              ],
            }),
          })
        : null,
    ],
  });
}
function Vh() {
  const e = _.useContext(Ic);
  if (!e) throw new Error('useToast must be used within ToastProvider');
  return e;
}
function Bh({ onError: e }) {
  const [t, n] = _.useState(!1),
    r = _.useCallback(
      async (l) => {
        n(!0);
        try {
          await l();
        } catch (o) {
          e(o instanceof Error ? o.message : String(o));
        } finally {
          n(!1);
        }
      },
      [e],
    );
  return { pending: t, runOp: r };
}
function Wh(e) {
  const {
      user: t,
      habit: n,
      viewDate: r,
      onUpdate: l,
      currentSearch: o,
      LinkComponent: i,
      onNavigate: s,
    } = e,
    { showToast: u } = Vh(),
    a = _.useCallback(
      (g) => {
        u({ type: 'error', message: g });
      },
      [u],
    ),
    { pending: m, runOp: h } = Bh({ onError: a }),
    v = _.useCallback((g) => h(() => l(g)), [l, h]);
  return d.jsxs('div', {
    className: 'card habit',
    children: [
      d.jsx(uh, {
        user: t,
        habit: n,
        pending: m,
        currentSearch: o,
        LinkComponent: i,
        onNavigate: s,
        onUpdate: v,
      }),
      d.jsx(Hh, {
        habit: n,
        viewDate: r,
        onDeleteSummationEvent: (g) => v({ habit: n.name, action: 'delete_event', eventId: g }),
      }),
    ],
  });
}
const Qh = dp('2026-06-19'),
  Kh = 'demo',
  Yh = Gi().withTitle('Progress').withTitleValue('7,500 steps').withProgress(7500, 1e4).model(),
  Gh = Gi()
    .withTitle('Today')
    .withTitleValue('steady')
    .withPills([{ label: 'steady' }, { label: 'focused' }])
    .model(),
  Xh = Gi().withTitle('Goal').withTitleValue('5 of 8').withProgress(5, 8).model(),
  Zh = Yi()
    .withName('Movement')
    .withType('summation')
    .withGoal(1e4)
    .withTotal(7500)
    .withSummationOptions({ manualInput: !0, increments: [500, 1e3, -500] })
    .withWidget(Yh)
    .model(),
  Jh = Yi()
    .withName('Mood')
    .withType('single_select')
    .withOptions(['low', 'steady', 'bright'])
    .withValue('steady')
    .withWidget(Gh)
    .model(),
  qh = Yi()
    .withName('Water before coffee')
    .withType('checkbox')
    .withValue('yes')
    .withWidget(Xh)
    .model(),
  ps = [Zh, Jh, qh],
  bh = ['Calculate totals and add custom incrementations.', 'temp2', 'temp3'];
function ev(e) {
  const t = _.useRef(null),
    [n, r] = _.useState(0);
  return (
    _.useEffect(() => {
      const l = () => {
        const o = t.current;
        if (!o) return;
        const i = o.getBoundingClientRect().top + window.scrollY,
          s = window.scrollY - i + window.innerHeight * 0.45,
          u = Math.min(e - 1, Math.max(0, Math.floor(s / window.innerHeight)));
        r((a) => (a === u ? a : u));
      };
      return (
        l(),
        window.addEventListener('scroll', l, { passive: !0 }),
        window.addEventListener('resize', l),
        () => {
          (window.removeEventListener('scroll', l), window.removeEventListener('resize', l));
        }
      );
    }, [e]),
    { activeStep: n, rootRef: t }
  );
}
function tv() {
  const { activeStep: e, rootRef: t } = ev(ps.length);
  return d.jsx(Uh, {
    children: d.jsx(gm, {
      children: d.jsx('main', {
        ref: t,
        className: 'homepage-habits',
        children: d.jsxs('div', {
          className: 'homepage-habits__stage',
          children: [
            d.jsxs('section', {
              className: 'homepage-habits__copy',
              'aria-live': 'polite',
              children: [
                d.jsx('h1', {
                  className: 'homepage-habits__title text-h-xl',
                  children: 'Welcome to Habsum, an incredibly customizable habit tracker.',
                }),
                d.jsx('p', {
                  className: 'homepage-habits__caption text-b-xl text-light',
                  children: bh[e],
                }),
              ],
            }),
            d.jsx('section', {
              className: 'homepage-habits__cards',
              'aria-label': 'Habits',
              children: ps.map((n, r) =>
                d.jsx(
                  'div',
                  {
                    className: [
                      'homepage-habits__card',
                      e === r ? 'homepage-habits__card--active' : null,
                    ]
                      .filter(Boolean)
                      .join(' '),
                    children: d.jsx(Wh, {
                      user: Kh,
                      viewDate: Qh,
                      habit: n,
                      onUpdate: async () => {},
                    }),
                  },
                  n.name,
                ),
              ),
            }),
          ],
        }),
      }),
    }),
  });
}
const Fc = document.getElementById('root');
if (Fc == null) throw new Error('Root element not found');
Cc(Fc).render(d.jsx(_.StrictMode, { children: d.jsx(tv, {}) }));
