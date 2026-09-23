(() => {
  'use strict';

  const TAB_ORDER = [
    'Workfolio.html',
    'Workfolio-Data.html',
    'Workfolio-Finance.html',
    'Workfolio-UIUX.html',
    'Workfolio-InsightLab.html',
  ];
  const SWIPE_THRESHOLD = 64;
  const EXIT_MS = 300;
  const ENTER_MS = 340;
  const STORAGE_KEY = 'wf-tab-swipe';
  const MOBILE_QUERY = window.matchMedia(
    '(max-width: 900px), (pointer: coarse) and (max-width: 1100px)'
  );

  let touchStart = null;
  let dragActive = false;
  let navigating = false;

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isMobileViewport = () => MOBILE_QUERY.matches;

  const injectStyles = () => {
    if (document.getElementById('wf-swipe-motion-css')) return;
    const style = document.createElement('style');
    style.id = 'wf-swipe-motion-css';
    style.textContent = `
html.wf-swipe-drag body {
  transition: none !important;
  will-change: transform, opacity;
}
html.wf-swipe-exit body {
  transition: transform ${EXIT_MS}ms cubic-bezier(.22,.61,.36,1),
              opacity ${EXIT_MS}ms ease;
  will-change: transform, opacity;
  pointer-events: none;
}
html.wf-swipe-exit-left body { transform: translate3d(-32%,0,0); opacity: 0; }
html.wf-swipe-exit-right body { transform: translate3d(32%,0,0); opacity: 0; }

html.wf-swipe-enter body {
  transform: translate3d(var(--wf-enter-x, 28%), 0, 0);
  opacity: 0;
  will-change: transform, opacity;
}
html.wf-swipe-enter-from-right { --wf-enter-x: 30%; }
html.wf-swipe-enter-from-left { --wf-enter-x: -30%; }
html.wf-swipe-enter-active body {
  transition: transform ${ENTER_MS}ms cubic-bezier(.22,.61,.36,1),
              opacity ${ENTER_MS}ms ease;
  transform: translate3d(0,0,0);
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  html.wf-swipe-exit body,
  html.wf-swipe-enter body,
  html.wf-swipe-enter-active body,
  html.wf-swipe-drag body {
    transition: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
`;
    document.head.appendChild(style);
  };

  const isHorizontalScroller = (target) => {
    let element = target instanceof Element ? target : target.parentElement;
    while (element && element !== document.body) {
      if (element.matches('.gallery, [data-no-swipe]')) return true;
      const styles = window.getComputedStyle(element);
      if (
        /^(auto|scroll|overlay)$/.test(styles.overflowX) &&
        element.scrollWidth > element.clientWidth
      ) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  };

  const isIgnoredTarget = (target) => {
    if (!(target instanceof Element)) return true;
    if (
      target.closest(
        'a, button, input, textarea, select, [contenteditable="true"], .gallery, [data-no-swipe]'
      )
    ) {
      return true;
    }
    return isHorizontalScroller(target);
  };

  const currentTabIndex = () => {
    const file = window.location.pathname.split('/').pop() || 'Workfolio.html';
    return TAB_ORDER.findIndex((tab) => tab.toLowerCase() === file.toLowerCase());
  };

  const clearDrag = () => {
    document.documentElement.classList.remove('wf-swipe-drag');
    document.body.style.transform = '';
    document.body.style.opacity = '';
    dragActive = false;
  };

  const navigateWithMotion = (href, direction) => {
    if (navigating) return;
    navigating = true;

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dir: direction, t: Date.now() })
      );
    } catch (_) { /* private mode */ }

    if (prefersReducedMotion()) {
      window.location.href = href;
      return;
    }

    clearDrag();
    const root = document.documentElement;
    root.classList.add(
      'wf-swipe-exit',
      direction > 0 ? 'wf-swipe-exit-left' : 'wf-swipe-exit-right'
    );

    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      window.location.href = href;
    };

    window.setTimeout(go, EXIT_MS + 40);
    document.body.addEventListener('transitionend', (event) => {
      if (event.target === document.body && event.propertyName === 'transform') {
        go();
      }
    }, { once: true });
  };

  const playEnterMotion = () => {
    if (prefersReducedMotion()) return;
    let payload = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STORAGE_KEY);
      payload = JSON.parse(raw);
    } catch (_) {
      return;
    }
    if (!payload || typeof payload.dir !== 'number') return;
    if (Date.now() - (payload.t || 0) > 4000) return;

    const root = document.documentElement;
    root.classList.add(
      'wf-swipe-enter',
      payload.dir > 0 ? 'wf-swipe-enter-from-right' : 'wf-swipe-enter-from-left'
    );

    // Force layout, then animate in.
    void document.body.offsetWidth;
    requestAnimationFrame(() => {
      root.classList.add('wf-swipe-enter-active');
      window.setTimeout(() => {
        root.classList.remove(
          'wf-swipe-enter',
          'wf-swipe-enter-active',
          'wf-swipe-enter-from-right',
          'wf-swipe-enter-from-left'
        );
      }, ENTER_MS + 60);
    });
  };

  const handleTouchStart = (event) => {
    touchStart = null;
    dragActive = false;
    if (navigating || !isMobileViewport() || event.touches.length !== 1) return;
    if (isIgnoredTarget(event.target)) return;

    const touch = event.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY, decided: false, horizontal: false };
  };

  const handleTouchMove = (event) => {
    if (!touchStart || navigating || !isMobileViewport() || prefersReducedMotion()) return;
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;

    if (!touchStart.decided) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      touchStart.decided = true;
      touchStart.horizontal = Math.abs(dx) > Math.abs(dy) * 1.15;
      if (!touchStart.horizontal) {
        touchStart = null;
        clearDrag();
        return;
      }
      document.documentElement.classList.add('wf-swipe-drag');
      dragActive = true;
    }

    if (!touchStart.horizontal) return;

    const index = currentTabIndex();
    if (index < 0) return;

    // Rubber-band at ends
    let resist = 1;
    if ((dx > 0 && index === 0) || (dx < 0 && index === TAB_ORDER.length - 1)) {
      resist = 0.28;
    }
    const shift = Math.max(-120, Math.min(120, dx * 0.42 * resist));
    const fade = 1 - Math.min(0.28, Math.abs(shift) / 420);
    document.body.style.transform = `translate3d(${shift}px,0,0)`;
    document.body.style.opacity = String(fade);
  };

  const handleTouchEnd = (event) => {
    if (!touchStart || navigating || !isMobileViewport() || event.changedTouches.length !== 1) {
      touchStart = null;
      clearDrag();
      return;
    }

    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const wasHorizontal = touchStart.horizontal || Math.abs(dx) > Math.abs(dy) * 1.2;
    touchStart = null;

    if (!wasHorizontal || Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy) * 1.2) {
      clearDrag();
      return;
    }

    const index = currentTabIndex();
    if (index < 0) {
      clearDrag();
      return;
    }

    const direction = dx < 0 ? 1 : -1;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) {
      clearDrag();
      return;
    }

    navigateWithMotion(TAB_ORDER[nextIndex], direction);
  };

  injectStyles();
  playEnterMotion();

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchcancel', () => {
    touchStart = null;
    clearDrag();
  }, { passive: true });
})();
