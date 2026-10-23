import { useEffect } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Observe an element and add `is-visible` once it enters the viewport.
 * Does not re-hide on scroll away. Respects prefers-reduced-motion.
 *
 * @param {React.RefObject<Element | null>} ref
 * @param {{ rootMargin?: string, threshold?: number }} [options]
 */
export function useInViewReveal(ref, options = {}) {
  const rootMargin = options.rootMargin ?? '0px 0px -10% 0px';
  const threshold = options.threshold ?? 0.12;

  useEffect(() => {
    const node = ref?.current;
    if (!node) return undefined;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return undefined;
    }

    if (node.classList.contains('is-visible')) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { root: null, rootMargin, threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);
}
