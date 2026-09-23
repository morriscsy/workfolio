(() => {
  'use strict';

  const TABS = [
    { file: 'Workfolio.html', label: 'Home', accent: '#38bdf8' },
    { file: 'Workfolio-Data.html', label: 'Analytica', accent: '#fb7185' },
    { file: 'Workfolio-Finance.html', label: 'StratBay', accent: '#f472b6' },
    { file: 'Workfolio-UIUX.html', label: 'UICraft', accent: '#fbbf24' },
    { file: 'Workfolio-InsightLab.html', label: 'InsightLab', accent: '#34d399' },
  ];

  const ARM_PX = 18;
  const COMMIT_RATIO = 0.24;
  const SETTLE_MS = 220;
  const EXIT_MS = 240;
  const ENTER_MS = 260;
  const STORAGE_KEY = 'wf-tab-swipe-lite';
  const MOBILE_QUERY = window.matchMedia(
    '(max-width: 900px), (pointer: coarse) and (max-width: 1100px)'
  );

  let gesture = null;
  let ui = null;
  let navigating = false;

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => MOBILE_QUERY.matches;
  const wrapEl = () => document.querySelector('.wrap') || document.body;

  const tabIndex = () => {
    const file = location.pathname.split('/').pop() || 'Workfolio.html';
    return TABS.findIndex((t) => t.file.toLowerCase() === file.toLowerCase());
  };

  const prefetchTabs = () => {
    TABS.forEach((t) => {
      if (document.head.querySelector(`link[data-wf-pre="${t.file}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = t.file;
      link.as = 'document';
      link.dataset.wfPre = t.file;
      document.head.appendChild(link);
    });
  };

  const injectCss = () => {
    if (document.getElementById('wf-swipe-lite-css')) return;
    const style = document.createElement('style');
    style.id = 'wf-swipe-lite-css';
    style.textContent = `
html.wf-swiping, html.wf-swiping body {
  overflow: hidden !important;
  touch-action: pan-y;
}

.wf-swipe-veil {
  position: fixed; inset: 0; z-index: 99980; display: none;
  background: rgba(2, 6, 23, .18);
  pointer-events: none; opacity: 0;
}
html.wf-swiping .wf-swipe-veil { display: block; opacity: 1; }

.wf-swipe-rail {
  position: fixed; left: 0; right: 0;
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 99990; display: none; justify-content: center; gap: 8px;
  pointer-events: none;
}
html.wf-swiping .wf-swipe-rail { display: flex; }
.wf-swipe-dot {
  width: 6px; height: 6px; border-radius: 999px;
  background: rgba(148,163,184,.4);
  transform: scale(1);
  opacity: .7;
}
.wf-swipe-dot.is-on {
  background: var(--wf-accent, #38bdf8);
  opacity: 1;
  transform: scale(1.35);
}

.wf-swipe-hint {
  position: fixed;
  top: max(10px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 99991; display: none; align-items: center; gap: 7px;
  padding: 5px 10px; border-radius: 999px;
  background: rgba(15, 23, 42, .7);
  border: 1px solid rgba(148,163,184,.16);
  color: #e2e8f0; font: 600 12px/1 system-ui, -apple-system, sans-serif;
  pointer-events: none; opacity: 0;
}
html.wf-swiping .wf-swipe-hint { display: flex; opacity: 1; }
.wf-swipe-hint i {
  width: 6px; height: 6px; border-radius: 999px;
  background: var(--wf-accent, #38bdf8);
}

/* Translate only — no scale (scale caused the wiggle) */
html.wf-swiping .wrap {
  will-change: transform;
  transform: translate3d(var(--wf-x, 0px), 0, 0);
  transition: none !important;
}
html.wf-swipe-settle .wrap {
  transition: transform .22s cubic-bezier(.25,.8,.25,1) !important;
}
html.wf-swipe-exit .wrap {
  transition: transform .24s cubic-bezier(.25,.8,.25,1) !important;
}
html.wf-swipe-exit-left .wrap { transform: translate3d(-100%, 0, 0); }
html.wf-swipe-exit-right .wrap { transform: translate3d(100%, 0, 0); }

html.wf-swipe-enter .wrap {
  transform: translate3d(var(--wf-enter-x, 100%), 0, 0);
}
html.wf-swipe-enter-active .wrap {
  transition: transform .26s cubic-bezier(.25,.8,.25,1) !important;
  transform: translate3d(0, 0, 0);
}

@media (prefers-reduced-motion: reduce) {
  html.wf-swipe-settle .wrap,
  html.wf-swipe-exit .wrap,
  html.wf-swipe-enter-active .wrap { transition: none !important; }
}
`;
    document.head.appendChild(style);
  };

  const ensureUi = () => {
    if (ui) return ui;
    const veil = document.createElement('div');
    veil.className = 'wf-swipe-veil';
    const rail = document.createElement('div');
    rail.className = 'wf-swipe-rail';
    rail.innerHTML = TABS.map((_, i) => `<span class="wf-swipe-dot" data-i="${i}"></span>`).join('');
    const hint = document.createElement('div');
    hint.className = 'wf-swipe-hint';
    hint.innerHTML = '<i></i><span data-txt></span>';
    document.documentElement.append(veil, rail, hint);
    ui = { veil, rail, hint, txt: hint.querySelector('[data-txt]') };
    return ui;
  };

  const ignored = (target) => {
    if (!(target instanceof Element)) return true;
    if (target.closest('a,button,input,textarea,select,[contenteditable="true"],.gallery,[data-no-swipe]')) {
      return true;
    }
    let el = target;
    while (el && el !== document.body) {
      if (el.matches('.gallery,[data-no-swipe]')) return true;
      const s = getComputedStyle(el);
      if (/^(auto|scroll|overlay)$/.test(s.overflowX) && el.scrollWidth > el.clientWidth) return true;
      el = el.parentElement;
    }
    return false;
  };

  const setX = (x) => {
    wrapEl().style.setProperty('--wf-x', `${x}px`);
  };

  const updateChrome = (dx, index) => {
    const u = ensureUi();
    const toward = dx < -8 ? index + 1 : dx > 8 ? index - 1 : index;
    const clamped = Math.max(0, Math.min(TABS.length - 1, toward));
    const tab = TABS[clamped];
    document.documentElement.style.setProperty('--wf-accent', tab.accent);
    u.txt.textContent = tab.label;
    u.hint.style.setProperty('--wf-accent', tab.accent);
    u.rail.style.setProperty('--wf-accent', tab.accent);
    u.rail.querySelectorAll('.wf-swipe-dot').forEach((dot) => {
      dot.classList.toggle('is-on', Number(dot.dataset.i) === clamped);
    });
  };

  const open = (index) => {
    ensureUi();
    const root = document.documentElement;
    root.classList.remove('wf-swipe-settle', 'wf-swipe-exit', 'wf-swipe-exit-left', 'wf-swipe-exit-right');
    root.classList.add('wf-swiping');
    setX(0);
    updateChrome(0, index);
  };

  const clearInline = () => {
    const el = wrapEl();
    el.style.removeProperty('--wf-x');
    el.style.transform = '';
  };

  const closeUi = () => {
    document.documentElement.classList.remove(
      'wf-swiping', 'wf-swipe-settle', 'wf-swipe-exit',
      'wf-swipe-exit-left', 'wf-swipe-exit-right'
    );
    clearInline();
  };

  const rubberX = (dx, index) => {
    if ((index <= 0 && dx > 0) || (index >= TABS.length - 1 && dx < 0)) {
      return dx * 0.22;
    }
    return dx;
  };

  const go = (next, dir) => {
    if (navigating) return;
    navigating = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ dir, t: Date.now() }));
    } catch (_) {}

    if (reduced()) {
      location.href = TABS[next].file;
      return;
    }

    const root = document.documentElement;
    // Clear CSS var so exit class transform wins cleanly (avoids fighting)
    wrapEl().style.removeProperty('--wf-x');
    root.classList.remove('wf-swiping');
    root.classList.add('wf-swipe-exit', dir > 0 ? 'wf-swipe-exit-left' : 'wf-swipe-exit-right');
    window.setTimeout(() => {
      location.href = TABS[next].file;
    }, EXIT_MS);
  };

  const cancel = (index) => {
    if (reduced()) {
      closeUi();
      return;
    }
    const root = document.documentElement;
    root.classList.add('wf-swipe-settle');
    setX(0);
    updateChrome(0, index);
    window.setTimeout(closeUi, SETTLE_MS);
  };

  const endGesture = (dx, vx, index) => {
    const w = window.innerWidth || 1;
    const flicked = Math.abs(vx) > 0.75 && Math.abs(dx) > 24;
    const dragged = Math.abs(dx) > w * COMMIT_RATIO;
    if (!flicked && !dragged) {
      cancel(index);
      return;
    }
    const dir = dx < 0 ? 1 : -1;
    const next = index + dir;
    if (next < 0 || next >= TABS.length) {
      cancel(index);
      return;
    }
    go(next, dir);
  };

  const playEnter = () => {
    let payload = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STORAGE_KEY);
      payload = JSON.parse(raw);
    } catch (_) { return; }
    if (!payload || Date.now() - (payload.t || 0) > 3500) return;
    if (reduced()) return;

    const root = document.documentElement;
    root.style.setProperty('--wf-enter-x', payload.dir > 0 ? '100%' : '-100%');
    root.classList.add('wf-swipe-enter');
    void wrapEl().offsetWidth;
    requestAnimationFrame(() => {
      root.classList.add('wf-swipe-enter-active');
      window.setTimeout(() => {
        root.classList.remove('wf-swipe-enter', 'wf-swipe-enter-active');
        root.style.removeProperty('--wf-enter-x');
        clearInline();
      }, ENTER_MS + 30);
    });
  };

  const velocity = (samples) => {
    if (!samples || samples.length < 2) return 0;
    const a = samples[0];
    const b = samples[samples.length - 1];
    return (b.x - a.x) / Math.max(1, b.t - a.t);
  };

  const onStart = (e) => {
    gesture = null;
    if (navigating || !mobile() || e.touches.length !== 1) return;
    if (ignored(e.target)) return;
    const index = tabIndex();
    if (index < 0) return;
    const t = e.touches[0];
    gesture = {
      x0: t.clientX,
      y0: t.clientY,
      x: t.clientX,
      index,
      armed: false,
      samples: [],
    };
  };

  const onMove = (e) => {
    if (!gesture || navigating || !mobile()) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx0 = t.clientX - gesture.x0;
    const dy0 = t.clientY - gesture.y0;

    if (!gesture.armed) {
      if (Math.abs(dx0) < ARM_PX && Math.abs(dy0) < ARM_PX) return;
      if (Math.abs(dx0) <= Math.abs(dy0) * 1.25) {
        gesture = null;
        return;
      }
      // Arm without resetting origin — avoids the jump/wiggle at start
      gesture.armed = true;
      open(gesture.index);
    }

    const dx = rubberX(t.clientX - gesture.x0, gesture.index);
    gesture.x = t.clientX;
    gesture.samples.push({ t: performance.now(), x: t.clientX });
    if (gesture.samples.length > 4) gesture.samples.shift();
    setX(dx);
    updateChrome(dx, gesture.index);
  };

  const onEnd = () => {
    if (!gesture || navigating) { gesture = null; return; }
    if (!gesture.armed) { gesture = null; return; }
    const dx = rubberX(gesture.x - gesture.x0, gesture.index);
    const vx = velocity(gesture.samples);
    const index = gesture.index;
    gesture = null;
    endGesture(dx, vx, index);
  };

  injectCss();
  prefetchTabs();
  playEnter();

  document.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onEnd, { passive: true });
  document.addEventListener('touchcancel', () => {
    if (gesture && gesture.armed) cancel(gesture.index);
    gesture = null;
  }, { passive: true });
})();
