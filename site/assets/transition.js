export const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// The kit marks a closing panel only inside its shadow root, so the page marks it here for the stylesheet.
// The mark waits a beat because a listener after this one can still cancel the close.
document.addEventListener('wa-hide', event => {
  const panel = event.target;
  if (!panel.matches('wa-dialog, wa-popover, wa-toast-item')) return;
  queueMicrotask(() => {
    if (!event.defaultPrevented) panel.classList.add('is-closing');
  });
});

document.addEventListener('wa-after-hide', event => {
  event.target.classList.remove('is-closing');
  aimedPanels.delete(event.target);
});

// A popover's arrow sits where it meets its anchor, so the popover grows from there and drops toward the side it opened on.
// The event doesn't bubble, so the page listens on the way down instead. The aim only matters as the popover opens,
// so it is worked out once per opening rather than on every scroll that repositions it.
const aimedPanels = new WeakSet();

document.addEventListener('wa-reposition', event => {
  const panel = event.target;
  if (!panel.matches('wa-popover') || aimedPanels.has(panel)) return;
  const popup = panel.shadowRoot.querySelector('wa-popup');
  const arrow = popup?.shadowRoot.querySelector('[part~="arrow"]');
  if (!arrow) return;
  const placement = popup.getAttribute('data-current-placement');
  if (!placement || !arrow.style.left) return;
  const arrowCentre = parseFloat(arrow.style.left) + arrow.offsetWidth / 2;
  const isAboveAnchor = placement.startsWith('top');
  panel.style.setProperty('--panel-origin', `${arrowCentre}px ${isAboveAnchor ? 'bottom' : 'top'}`);
  panel.style.setProperty('--panel-drop-from', isAboveAnchor ? '0.5rem' : '-0.5rem');
  aimedPanels.add(panel);
}, { capture: true });

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
