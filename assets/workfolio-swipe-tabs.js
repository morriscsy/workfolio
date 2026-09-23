(() => {
  'use strict';

  const TABS = [
    { file: 'Workfolio.html', label: 'Home', accent: '#38bdf8' },
    { file: 'Workfolio-Data.html', label: 'Analytica', accent: '#fb7185' },
    { file: 'Workfolio-Finance.html', label: 'StratBay', accent: '#f472b6' },
    { file: 'Workfolio-UIUX.html', label: 'UICraft', accent: '#fbbf24' },
    { file: 'Workfolio-InsightLab.html', label: 'InsightLab', accent: '#34d399' },
  ];

  const ARM_PX = 16;
  const COMMIT_RATIO = 0.22; // of viewport width
  const SETTLE_MS = 240;
  const EXIT_MS = 260;
  const ENTER_MS = 280;
  const STORAGE_KEY = 'wf-tab-swipe-lite';
  const MOBILE_QUERY = window.matchMedia(
    '(max-width: 900px), (pointer: coarse) and (max-width: 1100px)'
  );

  let touch = null;
  let ui = null;
  let navigating = false;
  let index = -1;

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => MOBILE_QUERY.matches;
  const page = () => document.querySelector('.wrap') || document.body;

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
html.wf-swiping, html.wf-swiping body { overflow: hidden !important; touch-action: none; }

.wf-swipe-veil {
  position: fixed; inset: 0; z-index: 99980; display: none;
  background: rgba(2, 6, 23, .28);
  pointer-events: none;
  opacity: 0;
  transition: opacity .18s ease;
}
html.wf-swiping .wf-swipe-veil { display: block; opacity: 1; }

.wf-swipe-rail {
  position: fixed; left: 0; right: 0; bottom: max(14px, env(safe-area-inset-bottom));
  z-index: 99990; display: none; justify-content: center; gap: 7px;
  pointer-events: none;
}
html.wf-swiping .wf-swipe-rail { display: flex; }
.wf-swipe-dot {
  width: 6px; height: 6px; border-radius: 999px;
  background: rgba(148,163,184,.45);
  transition: transform .18s ease, background .18s ease, width .18s ease;
}
.wf-swipe-dot.is-on {
  width: 16px; background: var(--wf-accent, #38bdf8);
  box-shadow: 0 0 10px color-mix(in srgb, var(--wf-accent,#38bdf8) 55%, transparent);
}

.wf-swipe-hint {
  position: fixed; top: max(12px, env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%) translateY(-6px);
  z-index: 99991; display: none; align-items: center; gap: 7px;
  padding: 6px 11px; border-radius: 999px;
  background: rgba(15, 23, 42, .72);
  border: 1px solid rgba(148,163,184,.18);
  color: #e2e8f0; font: 600 12px/1 system-ui, -apple-system, sans-serif;
  letter-spacing: .02em; opacity: 0; pointer-events: none;
  transition: opacity .16s ease, transform .16s ease;
}
html.wf-swiping .wf-swipe-hint { display: flex; opacity: 1; transform: translateX(-50%) translateY(0); }
.wf-swipe-hint i {
  width: 7px; height: 7px; border-radius: 999px; background: var(--wf-accent,#38bdf8);
}

/* Live page: gentle scale + slide only (no giant card / no blank fade) */
html.wf-swiping .wrap,
html.wf-swiping body > .wrap {
  transform: translate3d(var(--wf-x, 0px), 0, 0) scale(var(--wf-s, .94));
  transform-origin: center center;
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(0,0,0,.28);
  will-change: transform;
  transition: none;
}
html.wf-swipe-settle .wrap {
  transition: transform .24s cubic-bezier(.22,.7,.25,1), border-radius .24s ease, box-shadow .24s ease !important;
}
html.wf-swipe-exit .wrap {
  transition: transform .26s cubic-bezier(.22,.7,.25,1), opacity .2s ease !important;
}
html.wf-swipe-exit-left .wrap { transform: translate3d(-34%,0,0) scale(.92); opacity: .96; }
html.wf-swipe-exit-right .wrap { transform: translate3d(34%,0,0) scale(.92); opacity: .96; }

html.wf-swipe-enter .wrap {
  transform: translate3d(var(--wf-enter-x, 24%), 0, 0) scale(.94);
  opacity: .98;
  border-radius: 18px;
}
html.wf-swipe-enter-active .wrap {
  transition: transform .28s cubic-bezier(.22,.7,.25,1), opacity .2s ease, border-radius .28s ease !important;
  transform: translate3d(0,0,0) scale(1);
  opacity: 1;
  border-radius: 0;
}

.wf-swipe-side {
  position: fixed; top: 18%; bottom: 18%; width: 10px; z-index: 99985;
  border-radius: 10px; opacity: 0; pointer-events: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--wf-side,#38bdf8) 55%, #0f172a), #0f172a);
  box-shadow: 0 10px 28px rgba(0,0,0,.28);
  transition: opacity .14s ease, transform .14s ease, width .14s ease;
}
.wf-swipe-side.is-left { left: 6px; transform: translateX(-4px); }
.wf-swipe-side.is-right { right: 6px; transform: translateX(4px); }
html.wf-swiping .wf-swipe-side.is-show {
  opacity: .9; width: 12px; transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  html.wf-swipe-settle .wrap,
  html.wf-swipe-exit .wrap,
  html.wf-swipe-enter-active .wrap,
  .wf-swipe-veil, .wf-swipe-hint, .wf-swipe-dot { transition: none !important; }
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
    const left = document.createElement('div');
    left.className = 'wf-swipe-side is-left';
    const right = document.createElement('div');
    right.className = 'wf-swipe-side is-right';
    document.documentElement.append(veil, rail, hint, left, right);
    ui = { veil, rail, hint, left, right, txt: hint.querySelector('[data-txt]') };
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

  const paint = (dx, liveIndex) => {
    const root = document.documentElement;
    const wrap = page();
    const w = window.innerWidth || 1;
    // Rubber-band at ends
    let x = dx;
    if ((liveIndex <= 0 && dx > 0) || (liveIndex >= TABS.length - 1 && dx < 0)) {
      x = dx * 0.28;
    }
    const progress = Math.min(1, Math.abs(x) / (w * 0.55));
    const scale = 1 - progress * 0.06; // 1 -> 0.94
    wrap.style.setProperty('--wf-x', `${x}px`);
    wrap.style.setProperty('--wf-s', String(scale));

    const u = ensureUi();
    const toward = x < 0 ? liveIndex + 1 : liveIndex - 1;
    const clamped = Math.max(0, Math.min(TABS.length - 1, toward));
    const tab = TABS[Math.abs(x) > 8 ? clamped : liveIndex];
    root.style.setProperty('--wf-accent', tab.accent);
    u.txt.textContent = tab.label;
    u.hint.style.setProperty('--wf-accent', tab.accent);
    u.rail.style.setProperty('--wf-accent', tab.accent);
    u.rail.querySelectorAll('.wf-swipe-dot').forEach((dot) => {
      dot.classList.toggle('is-on', Number(dot.dataset.i) === (Math.abs(x) > 8 ? clamped : liveIndex));
    });

    // Slim edge peeks instead of giant neighbor cards
    const showLeft = liveIndex > 0 && x > 10;
    const showRight = liveIndex < TABS.length - 1 && x < -10;
    u.left.classList.toggle('is-show', showLeft);
    u.right.classList.toggle('is-show', showRight);
    if (showLeft) u.left.style.setProperty('--wf-side', TABS[liveIndex - 1].accent);
    if (showRight) u.right.style.setProperty('--wf-side', TABS[liveIndex + 1].accent);
  };

  const open = (i) => {
    index = i;
    ensureUi();
    document.documentElement.classList.add('wf-swiping');
    document.documentElement.classList.remove('wf-swipe-settle', 'wf-swipe-exit', 'wf-swipe-exit-left', 'wf-swipe-exit-right');
    paint(0, i);
  };

  const clearInline = () => {
    const wrap = page();
    wrap.style.removeProperty('--wf-x');
    wrap.style.removeProperty('--wf-s');
    wrap.style.transform = '';
    wrap.style.opacity = '';
    wrap.style.borderRadius = '';
    wrap.style.boxShadow = '';
  };

  const closeUi = () => {
    document.documentElement.classList.remove(
      'wf-swiping', 'wf-swipe-settle', 'wf-swipe-exit',
      'wf-swipe-exit-left', 'wf-swipe-exit-right'
    );
    clearInline();
  };

  const go = (next, dir) => {
    if (navigating) return;
    navigating = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ dir, t: Date.now() }));
    } catch (_) {}

    // Prefetch hard nav target once more
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = TABS[next].file;
    document.head.appendChild(link);

    if (reduced()) {
      location.href = TABS[next].file;
      return;
    }

    const root = document.documentElement;
    root.classList.add('wf-swipe-exit', dir > 0 ? 'wf-swipe-exit-left' : 'wf-swipe-exit-right');
    // Keep opacity near 1 — blank frames feel like network failure
    page().style.opacity = '0.97';
    window.setTimeout(() => {
      location.href = TABS[next].file;
    }, EXIT_MS);
  };

  const cancel = () => {
    if (reduced()) {
      closeUi();
      return;
    }
    const root = document.documentElement;
    root.classList.add('wf-swipe-settle');
    paint(0, index);
    window.setTimeout(() => {
      closeUi();
    }, SETTLE_MS);
  };

  const endGesture = (dx, vx) => {
    const w = window.innerWidth || 1;
    const commit = Math.abs(dx) > w * COMMIT_RATIO || (Math.abs(vx) > 0.7 && Math.abs(dx) > 28);
    if (!commit) {
      cancel();
      return;
    }
    const dir = dx < 0 ? 1 : -1;
    const next = index + dir;
    if (next < 0 || next >= TABS.length) {
      cancel();
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
    root.style.setProperty('--wf-enter-x', payload.dir > 0 ? '22%' : '-22%');
    root.classList.add('wf-swipe-enter');
    void page().offsetWidth;
    requestAnimationFrame(() => {
      root.classList.add('wf-swipe-enter-active');
      window.setTimeout(() => {
        root.classList.remove('wf-swipe-enter', 'wf-swipe-enter-active');
        root.style.removeProperty('--wf-enter-x');
        clearInline();
      }, ENTER_MS + 40);
    });
  };

  const onStart = (e) => {
    touch = null;
    if (navigating || !mobile() || e.touches.length !== 1) return;
    if (ignored(e.target)) return;
    const i = tabIndex();
    if (i < 0) return;
    const t = e.touches[0];
    touch = {
      x0: t.clientX, y0: t.clientY, x: t.clientX,
      decided: false, horizontal: false, index: i,
      samples: [],
    };
  };

  const onMove = (e) => {
    if (!touch || navigating || !mobile()) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.x0;
    const dy = t.clientY - touch.y0;

    if (!touch.decided) {
      if (Math.abs(dx) < ARM_PX && Math.abs(dy) < ARM_PX) return;
      touch.decided = true;
      touch.horizontal = Math.abs(dx) > Math.abs(dy) * 1.2;
      if (!touch.horizontal) {
        touch = null;
        return;
      }
      open(touch.index);
      touch.x0 = t.clientX;
    }

    const x = t.clientX - touch.x0;
    touch.x = t.clientX;
    touch.samples.push({ t: performance.now(), x: t.clientX });
    if (touch.samples.length > 5) touch.samples.shift();
    paint(x, touch.index);
  };

  const velocity = () => {
    const s = (touch && touch.samples) || [];
    if (s.length < 2) return 0;
    const a = s[0];
    const b = s[s.length - 1];
    return (b.x - a.x) / Math.max(1, b.t - a.t);
  };

  const onEnd = () => {
    if (!touch || navigating) { touch = null; return; }
    if (!touch.horizontal) { touch = null; return; }
    const dx = touch.x - touch.x0;
    const vx = velocity();
    const i = touch.index;
    touch = null;
    index = i;
    endGesture(dx, vx);
  };

  injectCss();
  prefetchTabs();
  playEnter();

  document.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onEnd, { passive: true });
  document.addEventListener('touchcancel', () => {
    if (touch && touch.horizontal) cancel();
    touch = null;
  }, { passive: true });
})();
