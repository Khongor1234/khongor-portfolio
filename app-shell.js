// Home-screen app shell. A site saved to an iPhone's home screen opens with no
// browser bars, so there is no back button: this adds one when there is
// somewhere to go back to.
(function () {
  var DEPTH_KEY = 'app-depth';
  var isApp = navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  if (!isApp) return;
  document.documentElement.classList.add('is-app');

  function readLastDepth() {
    try {
      var saved = sessionStorage.getItem(DEPTH_KEY);
      return saved === null ? null : Number(saved);
    } catch (e) {
      return null; // Storage blocked: every page counts as the first one.
    }
  }

  function saveDepth(depth) {
    try { sessionStorage.setItem(DEPTH_KEY, String(depth)); } catch (e) { /* see readLastDepth */ }
  }

  // Each history entry remembers how many steps it is from where the app opened.
  function stampDepth() {
    var state = history.state || {};
    var depth = typeof state.appDepth === 'number' ? state.appDepth : null;
    if (depth === null) {
      var last = readLastDepth();
      // A fresh launch has one history entry, whatever an old session saved.
      depth = history.length > 1 && last !== null && isFinite(last) ? last + 1 : 0;
      history.replaceState(Object.assign({}, state, { appDepth: depth }), '');
    }
    saveDepth(depth);
    return depth;
  }

  function init() {
    // Pages with their own back link use it; the rest get a floating button.
    var ownBackLinks = document.querySelectorAll('[data-app-back]');
    var button = null;

    if (ownBackLinks.length === 0) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'app-back';
      button.setAttribute('aria-label', document.documentElement.lang === 'ja' ? '戻る' : 'Back');
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
      button.addEventListener('click', function () { history.back(); });
      document.body.appendChild(button);
    }

    ownBackLinks.forEach(function (link) {
      link.addEventListener('click', function (event) {
        if (stampDepth() === 0) return; // Opened here directly: follow the link.
        event.preventDefault();
        history.back();
      });
    });

    function refresh() {
      var depth = stampDepth();
      if (button) button.classList.toggle('is-shown', depth > 0);
    }
    window.addEventListener('popstate', refresh);
    window.addEventListener('hashchange', refresh);
    window.addEventListener('pageshow', refresh);
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
