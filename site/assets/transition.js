const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// A page nobody is looking at has no frames to animate in, and a transition started there holds the change back until it times out.
export function changeWithTransition(change, types = []) {
  const canAnimate = document.startViewTransition && document.visibilityState === 'visible' && document.hasFocus();
  if (!canAnimate || prefersReducedMotion.matches) {
    change();
    return null;
  }
  // Browsers that only know the callback form throw on the options form, so that one is kept for typed transitions.
  if (types.length === 0) return document.startViewTransition(change);
  return document.startViewTransition({ update: change, types });
}
