(() => {
  'use strict';

  const TABS = [
    { file: 'Workfolio.html', label: 'Home', accent: '#38bdf8', blurb: 'Profile · Experience · Certs' },
    { file: 'Workfolio-Data.html', label: 'Analytica', accent: '#fb7185', blurb: 'Data analytics & science' },
    { file: 'Workfolio-Finance.html', label: 'StratBay', accent: '#f472b6', blurb: 'Finance · Markets · Tools' },
    { file: 'Workfolio-UIUX.html', label: 'UICraft', accent: '#fbbf24', blurb: 'UX case studies' },
    { file: 'Workfolio-InsightLab.html', label: 'InsightLab', accent: '#34d399', blurb: 'Research notes' },
  ];

  const ARM_PX = 18;
  const COMMIT_RATIO = 0.23;
  const SETTLE_MS = 220;
  const EXIT_MS = 250;
  const ENTER_MS = 280;
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
  background: #020617 !important;
}

/* Incoming page fills the whole screen under the sliding page — no black gap */
.wf-swipe-incoming {
  position: fixed; inset: 0; z-index: 99970; display: none;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 70% 15%, color-mix(in srgb, var(--wf-in-accent,#38bdf8) 34%, transparent), transparent 55%),
    linear-gradient(160deg, color-mix(in srgb, var(--wf-in-accent,#38bdf8) 18%, #0b1220), #020617 62%);
}
html.wf-swiping .wf-swipe-incoming.is-on { display: block; }
.wf-swipe-incoming-inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; justify-content: center;
  padding: 28px 28px 90px;
  color: #f8fafc;
}
.wf-swipe-incoming-kicker {
  font: 700 11px/1.2 system-ui, -apple-system, sans-serif;
  letter-spacing: .12em; text-transform: uppercase;
  color: color-mix(in srgb, var(--wf-in-accent,#38bdf8) 85%, #fff);
  margin-bottom: 10px;
}
.wf-swipe-incoming-title {
  font: 800 clamp(28px, 8vw, 40px)/1.05 system-ui, -apple-system, sans-serif;
  letter-spacing: -.03em; margin: 0 0 10px;
}
.wf-swipe-incoming-blurb {
  margin: 0; max-width: 16rem;
  color: #cbd5e1; font: 500 14px/1.45 system-ui, -apple-system, sans-serif;
}
.wf-swipe-incoming-hint {
  position: absolute; left: 28px; right: 28px;
  bottom: max(28px, env(safe-area-inset-bottom));
  color: #94a3b8; font: 600 12px/1 system-ui, -apple-system, sans-serif;
}

.wf-swipe-rail {
  position: fixed; left: 0; right: 0;
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 99990; display: none; justify-content: center; gap: 8px;
  pointer-events: none;
}
html.wf-swiping .wf-swipe-rail { display: flex; }
.wf-swipe-dot {
  width: 6px; height: 6px; border-radius: 999px;
  background: rgba(148,163,184,.45); opacity: .75;
}
.wf-swipe-dot.is-on {
  background: var(--wf-accent, #38bdf8); opacity: 1;
  box-shadow: 0 0 8px color-mix(in srgb, var(--wf-accent,#38bdf8) 60%, transparent);
}

/* Current page slides as an opaque sheet over the incoming preview */
html.wf-swiping .wrap {
  position: relative;
  z-index: 99980;
  will-change: transform;
  transform: translate3d(var(--wf-x, 0px), 0, 0);
  transition: none !important;
  background: #020617;
  box-shadow: 0 0 0 1px rgba(15,23,42,.9), 8px 0 28px rgba(0,0,0,.35);
  min-height: 100vh;
}
html.wf-swipe-settle .wrap {
  transition: transform .22s cubic-bezier(.25,.8,.25,1) !important;
}
html.wf-swipe-exit .wrap {
  transition: transform .25s cubic-bezier(.25,.8,.25,1) !important;
}
html.wf-swipe-exit-left .wrap { transform: translate3d(-100%, 0, 0); }
html.wf-swipe-exit-right .wrap { transform: translate3d(100%, 0, 0); }

html.wf-swipe-enter .wrap {
  transform: translate3d(var(--wf-enter-x, 100%), 0, 0);
  box-shadow: 8px 0 28px rgba(0,0,0,.35);
}
html.wf-swipe-enter-active .wrap {
  transition: transform .28s cubic-bezier(.25,.8,.25,1) !important;
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
    const incoming = document.createElement('div');
    incoming.className = 'wf-swipe-incoming';
    incoming.innerHTML = `
      <div class="wf-swipe-incoming-inner">
        <div class="wf-swipe-incoming-kicker">Workfolio</div>
        <h2 class="wf-swipe-incoming-title" data-title></h2>
        <p class="wf-swipe-incoming-blurb" data-blurb></p>
        <div class="wf-swipe-incoming-hint" data-hint>Release to open</div>
      </div>`;
    const rail = document.createElement('div');
    rail.className = 'wf-swipe-rail';
    rail.innerHTML = TABS.map((_, i) => `<span class="wf-swipe-dot" data-i="${i}"></span>`).join('');
    document.documentElement.append(incoming, rail);
    ui = {
      incoming,
      rail,
      title: incoming.querySelector('[data-title]'),
      blurb: incoming.querySelector('[data-blurb]'),
      hint: incoming.querySelector('[data-hint]'),
    };
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

  const setIncoming = (neighborIndex, ready) => {
    const u = ensureUi();
    if (neighborIndex < 0 || neighborIndex >= TABS.length) {
      u.incoming.classList.remove('is-on');
      return;
    }
    const tab = TABS[neighborIndex];
    u.incoming.style.setProperty('--wf-in-accent', tab.accent);
    u.title.textContent = tab.label;
    u.blurb.textContent = tab.blurb;
    u.hint.textContent = ready ? 'Release to open' : 'Keep sliding';
    u.incoming.classList.add('is-on');

    document.documentElement.style.setProperty('--wf-accent', tab.accent);
    u.rail.querySelectorAll('.wf-swipe-dot').forEach((dot) => {
      dot.classList.toggle('is-on', Number(dot.dataset.i) === neighborIndex);
    });
  };

  const open = (index) => {
    ensureUi();
    const root = document.documentElement;
    root.classList.remove('wf-swipe-settle', 'wf-swipe-exit', 'wf-swipe-exit-left', 'wf-swipe-exit-right');
    root.classList.add('wf-swiping');
    setX(0);
    setIncoming(index, false);
    // Until direction is known, preview current accent on dots
    ui.rail.querySelectorAll('.wf-swipe-dot').forEach((dot) => {
      dot.classList.toggle('is-on', Number(dot.dataset.i) === index);
    });
  };

  const clearInline = () => {
    const el = wrapEl();
    el.style.removeProperty('--wf-x');
    el.style.transform = '';
    el.style.boxShadow = '';
  };

  const closeUi = () => {
    document.documentElement.classList.remove(
      'wf-swiping', 'wf-swipe-settle', 'wf-swipe-exit',
      'wf-swipe-exit-left', 'wf-swipe-exit-right'
    );
    if (ui) ui.incoming.classList.remove('is-on');
    clearInline();
  };

  const rubberX = (dx, index) => {
    if ((index <= 0 && dx > 0) || (index >= TABS.length - 1 && dx < 0)) {
      return dx * 0.2;
    }
    return dx;
  };

  const neighborFor = (dx, index) => {
    if (dx < -2) return index + 1;
    if (dx > 2) return index - 1;
    return -1;
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
    setIncoming(next, true);
    wrapEl().style.removeProperty('--wf-x');
    root.classList.remove('wf-swiping');
    root.classList.add('wf-swipe-exit', dir > 0 ? 'wf-swipe-exit-left' : 'wf-swipe-exit-right');
    // Keep incoming visible during exit
    if (ui) ui.incoming.classList.add('is-on');
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
    setIncoming(index, false);
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
      gesture.armed = true;
      open(gesture.index);
    }

    const dx = rubberX(t.clientX - gesture.x0, gesture.index);
    gesture.x = t.clientX;
    gesture.samples.push({ t: performance.now(), x: t.clientX });
    if (gesture.samples.length > 4) gesture.samples.shift();

    setX(dx);
    const neighbor = neighborFor(dx, gesture.index);
    const w = window.innerWidth || 1;
    const ready = Math.abs(dx) > w * COMMIT_RATIO;
    if (neighbor >= 0 && neighbor < TABS.length) setIncoming(neighbor, ready);
    else setIncoming(gesture.index, false);
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
