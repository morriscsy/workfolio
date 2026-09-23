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
  const MOBILE_QUERY = window.matchMedia(
    '(max-width: 900px), (pointer: coarse) and (max-width: 1100px)'
  );
  let touchStart = null;

  const isMobileViewport = () => MOBILE_QUERY.matches;

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

  const handleTouchStart = (event) => {
    touchStart = null;
    if (!isMobileViewport() || event.touches.length !== 1) return;
    if (isIgnoredTarget(event.target)) return;

    const touch = event.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    if (!touchStart || !isMobileViewport() || event.changedTouches.length !== 1) {
      touchStart = null;
      return;
    }

    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy) * 1.2) return;

    const index = currentTabIndex();
    if (index < 0) return;

    const direction = dx < 0 ? 1 : -1;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;

    window.location.href = TAB_ORDER[nextIndex];
  };

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
})();
