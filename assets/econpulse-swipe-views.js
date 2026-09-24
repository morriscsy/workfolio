(() => {
  'use strict';

  const TABS = [
    { id: 'month', label: 'Month', accent: '#a78bfa', blurb: 'Calendar grid · high-impact prints' },
    { id: 'week', label: 'Week', accent: '#67e8f9', blurb: '7-day strip · ET clock' },
    { id: 'agenda', label: 'Agenda', accent: '#34d399', blurb: 'Upcoming list · HKT titles' },
    { id: 'inflation', label: 'Inflation G20', accent: '#f59e0b', blurb: 'Rates table · TE list' },
  ];

  const ARM_PX = 18;
  const COMMIT_RATIO = 0.23;
  const SETTLE_MS = 220;
  const EXIT_MS = 250;
  const ENTER_MS = 280;
  const MOBILE_QUERY = window.matchMedia(
    '(max-width: 900px), (pointer: coarse) and (max-width: 1100px)'
  );

  let gesture = null;
  let ui = null;
  let navigating = false;

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => MOBILE_QUERY.matches;
  const wrapEl = () => document.querySelector('.ep-swipe-wrap') || document.querySelector('main') || document.body;
  const sheetOpen = () => document.documentElement.classList.contains('sheet-open');

  const currentView = () => {
    if (window.EconPulse && typeof window.EconPulse.getView === 'function') {
      return window.EconPulse.getView();
    }
    const active = document.querySelector('[data-view].active');
    return (active && active.dataset.view) || 'month';
  };

  const tabIndex = () => {
    const v = currentView();
    return TABS.findIndex((t) => t.id === v);
  };

  const callSetView = (id) => {
    if (window.EconPulse && typeof window.EconPulse.setView === 'function') {
      window.EconPulse.setView(id);
      return;
    }
    const btn = document.querySelector(`[data-view="${id}"]`);
    if (btn) btn.click();
  };

  const injectCss = () => {
    if (document.getElementById('ep-swipe-views-css')) return;
    const style = document.createElement('style');
    style.id = 'ep-swipe-views-css';
    style.textContent = `
html.ep-swiping, html.ep-swiping body {
  overflow: hidden !important;
  touch-action: pan-y;
  background: #080b14 !important;
}

/* Incoming view fills screen under the sliding sheet — no black gap */
.ep-swipe-incoming {
  position: fixed; inset: 0; z-index: 8200; display: none;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 70% 15%, color-mix(in srgb, var(--ep-in-accent,#a78bfa) 34%, transparent), transparent 55%),
    linear-gradient(160deg, color-mix(in srgb, var(--ep-in-accent,#a78bfa) 18%, #0d1225), #080b14 62%);
}
html.ep-swiping .ep-swipe-incoming.is-on { display: block; }
.ep-swipe-incoming-inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; justify-content: center;
  padding: 28px 28px 90px;
  color: #e8eaf0;
}
.ep-swipe-incoming-kicker {
  font: 700 11px/1.2 Inter, system-ui, -apple-system, sans-serif;
  letter-spacing: .12em; text-transform: uppercase;
  color: color-mix(in srgb, var(--ep-in-accent,#a78bfa) 85%, #fff);
  margin-bottom: 10px;
}
.ep-swipe-incoming-title {
  font: 800 clamp(28px, 8vw, 40px)/1.05 Inter, system-ui, -apple-system, sans-serif;
  letter-spacing: -.03em; margin: 0 0 10px;
}
.ep-swipe-incoming-blurb {
  margin: 0; max-width: 16rem;
  color: #a0a8c0; font: 500 14px/1.45 Inter, system-ui, -apple-system, sans-serif;
}
.ep-swipe-incoming-hint {
  position: absolute; left: 28px; right: 28px;
  bottom: max(28px, env(safe-area-inset-bottom));
  color: #6b7280; font: 600 12px/1 Inter, system-ui, -apple-system, sans-serif;
}

.ep-swipe-rail {
  position: fixed; left: 0; right: 0;
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 8500; display: none; justify-content: center; gap: 8px;
  pointer-events: none;
}
html.ep-swiping .ep-swipe-rail { display: flex; }
.ep-swipe-dot {
  width: 6px; height: 6px; border-radius: 999px;
  background: rgba(160,168,192,.45); opacity: .75;
}
.ep-swipe-dot.is-on {
  background: var(--ep-accent, #a78bfa); opacity: 1;
  box-shadow: 0 0 8px color-mix(in srgb, var(--ep-accent,#a78bfa) 60%, transparent);
}

/* Current page slides as an opaque sheet over the incoming preview */
html.ep-swiping .ep-swipe-wrap {
  position: relative;
  z-index: 8400;
  will-change: transform;
  transform: translate3d(var(--ep-x, 0px), 0, 0);
  transition: none !important;
  background: #080b14;
  box-shadow: 0 0 0 1px rgba(8,11,20,.9), 8px 0 28px rgba(0,0,0,.35);
  min-height: 100vh;
  /* Force a real box even if desktop used display:contents */
  display: flex !important;
  flex-direction: column;
}
html.ep-swipe-settle .ep-swipe-wrap {
  transition: transform .22s cubic-bezier(.25,.8,.25,1) !important;
}
html.ep-swipe-exit .ep-swipe-wrap {
  transition: transform .25s cubic-bezier(.25,.8,.25,1) !important;
}
html.ep-swipe-exit-left .ep-swipe-wrap { transform: translate3d(-100%, 0, 0); }
html.ep-swipe-exit-right .ep-swipe-wrap { transform: translate3d(100%, 0, 0); }

html.ep-swipe-enter .ep-swipe-wrap {
  transform: translate3d(var(--ep-enter-x, 100%), 0, 0);
  box-shadow: 8px 0 28px rgba(0,0,0,.35);
  position: relative;
  z-index: 8400;
  background: #080b14;
  min-height: 100vh;
  display: flex !important;
  flex-direction: column;
}
html.ep-swipe-enter-active .ep-swipe-wrap {
  transition: transform .28s cubic-bezier(.25,.8,.25,1) !important;
  transform: translate3d(0, 0, 0);
}

@media (prefers-reduced-motion: reduce) {
  html.ep-swipe-settle .ep-swipe-wrap,
  html.ep-swipe-exit .ep-swipe-wrap,
  html.ep-swipe-enter-active .ep-swipe-wrap { transition: none !important; }
}
`;
    document.head.appendChild(style);
  };

  const ensureUi = () => {
    if (ui) return ui;
    const incoming = document.createElement('div');
    incoming.className = 'ep-swipe-incoming';
    incoming.setAttribute('aria-hidden', 'true');
    incoming.innerHTML = `
      <div class="ep-swipe-incoming-inner">
        <div class="ep-swipe-incoming-kicker">EconPulse</div>
        <h2 class="ep-swipe-incoming-title" data-title></h2>
        <p class="ep-swipe-incoming-blurb" data-blurb></p>
        <div class="ep-swipe-incoming-hint" data-hint>Release to open</div>
      </div>`;
    const rail = document.createElement('div');
    rail.className = 'ep-swipe-rail';
    rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = TABS.map((_, i) => `<span class="ep-swipe-dot" data-i="${i}"></span>`).join('');
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
    if (target.closest('a,button,input,textarea,select,[contenteditable="true"],.gallery,.mapbox,#detail,.sheet-dim,#tipcard,#toasts,#catLegend,[data-no-swipe]')) {
      return true;
    }
    let el = target;
    while (el && el !== document.body) {
      if (el.matches('.gallery,.mapbox,[data-no-swipe]')) return true;
      const s = getComputedStyle(el);
      if (/^(auto|scroll|overlay)$/.test(s.overflowX) && el.scrollWidth > el.clientWidth) return true;
      el = el.parentElement;
    }
    return false;
  };

  const setX = (x) => {
    wrapEl().style.setProperty('--ep-x', `${x}px`);
  };

  const setIncoming = (neighborIndex, ready) => {
    const u = ensureUi();
    if (neighborIndex < 0 || neighborIndex >= TABS.length) {
      u.incoming.classList.remove('is-on');
      return;
    }
    const tab = TABS[neighborIndex];
    u.incoming.style.setProperty('--ep-in-accent', tab.accent);
    u.title.textContent = tab.label;
    u.blurb.textContent = tab.blurb;
    u.hint.textContent = ready ? 'Release to open' : 'Keep sliding';
    u.incoming.classList.add('is-on');

    document.documentElement.style.setProperty('--ep-accent', tab.accent);
    u.rail.querySelectorAll('.ep-swipe-dot').forEach((dot) => {
      dot.classList.toggle('is-on', Number(dot.dataset.i) === neighborIndex);
    });
  };

  const open = (index) => {
    ensureUi();
    const root = document.documentElement;
    root.classList.remove('ep-swipe-settle', 'ep-swipe-exit', 'ep-swipe-exit-left', 'ep-swipe-exit-right');
    root.classList.add('ep-swiping');
    setX(0);
    setIncoming(index, false);
    ui.rail.querySelectorAll('.ep-swipe-dot').forEach((dot) => {
      dot.classList.toggle('is-on', Number(dot.dataset.i) === index);
    });
  };

  const clearInline = () => {
    const el = wrapEl();
    el.style.removeProperty('--ep-x');
    el.style.transform = '';
    el.style.boxShadow = '';
  };

  const closeUi = () => {
    document.documentElement.classList.remove(
      'ep-swiping', 'ep-swipe-settle', 'ep-swipe-exit',
      'ep-swipe-exit-left', 'ep-swipe-exit-right',
      'ep-swipe-enter', 'ep-swipe-enter-active'
    );
    document.documentElement.style.removeProperty('--ep-enter-x');
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
    const tab = TABS[next];

    if (reduced()) {
      closeUi();
      callSetView(tab.id);
      navigating = false;
      return;
    }

    const root = document.documentElement;
    setIncoming(next, true);
    wrapEl().style.removeProperty('--ep-x');
    root.classList.remove('ep-swiping');
    root.classList.add('ep-swipe-exit', dir > 0 ? 'ep-swipe-exit-left' : 'ep-swipe-exit-right');
    if (ui) ui.incoming.classList.add('is-on');

    window.setTimeout(() => {
      callSetView(tab.id);
      root.classList.remove('ep-swipe-exit', 'ep-swipe-exit-left', 'ep-swipe-exit-right');
      root.style.setProperty('--ep-enter-x', dir > 0 ? '100%' : '-100%');
      root.classList.add('ep-swipe-enter');
      void wrapEl().offsetWidth;
      requestAnimationFrame(() => {
        root.classList.add('ep-swipe-enter-active');
        window.setTimeout(() => {
          closeUi();
          navigating = false;
        }, ENTER_MS + 30);
      });
    }, EXIT_MS);
  };

  const cancel = (index) => {
    if (reduced()) {
      closeUi();
      return;
    }
    const root = document.documentElement;
    root.classList.add('ep-swipe-settle');
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

  const velocity = (samples) => {
    if (!samples || samples.length < 2) return 0;
    const a = samples[0];
    const b = samples[samples.length - 1];
    return (b.x - a.x) / Math.max(1, b.t - a.t);
  };

  const onStart = (e) => {
    gesture = null;
    if (navigating || !mobile() || sheetOpen() || e.touches.length !== 1) return;
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
    if (!gesture || navigating || !mobile() || sheetOpen()) return;
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

  const boot = () => {
    if (!document.querySelector('.ep-swipe-wrap')) return;
    injectCss();
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', () => {
      if (gesture && gesture.armed) cancel(gesture.index);
      gesture = null;
    }, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
