// A finger never leaves a button the way a mouse does, so a tooltip opened by a tap would stay up, even through a scroll.
// Tooltips are for hover and keyboard focus only.
let isFingerInUse = false;

document.addEventListener(
  'pointerover',
  (event) => {
    isFingerInUse = event.pointerType === 'touch';
  },
  true
);

document.addEventListener(
  'keydown',
  () => {
    isFingerInUse = false;
  },
  true
);

document.addEventListener('wa-show', (event) => {
  if (isFingerInUse && event.target.localName === 'wa-tooltip') {
    event.preventDefault();
  }
});
