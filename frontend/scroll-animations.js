/**
 * Scroll-triggered reveal animations (Intersection Observer).
 * Call refreshScrollReveals(container) after dynamic HTML updates.
 */
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let revealObserver;

  function createRevealObserver() {
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
  }

  function markVisible(el) {
    el.classList.add('is-visible');
  }

  function observeReveals(root) {
    if (!revealObserver) revealObserver = createRevealObserver();

    const scope = root && root.querySelectorAll ? root : document;
    const nodes = scope.querySelectorAll
      ? scope.querySelectorAll('.scroll-reveal:not(.is-visible)')
      : [];

    if (prefersReduced.matches) {
      nodes.forEach(markVisible);
      return;
    }

    nodes.forEach((el) => revealObserver.observe(el));
  }

  function initHeroEntrance() {
    document.querySelectorAll('.scroll-reveal-instant').forEach((el) => {
      requestAnimationFrame(() => markVisible(el));
    });
  }

  function initScrollProgress() {
    const bar = document.querySelector('.scroll-progress-bar');
    if (!bar) return;

    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    };

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function initNavOnScroll() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;

    const update = () => {
      nav.classList.toggle('top-nav--scrolled', window.scrollY > 20);
    };

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function init() {
    initHeroEntrance();
    observeReveals(document);
    initScrollProgress();
    initNavOnScroll();
  }

  window.refreshScrollReveals = observeReveals;

  prefersReduced.addEventListener('change', () => {
    document.querySelectorAll('.scroll-reveal').forEach(markVisible);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
