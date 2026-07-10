// @ts-nocheck
import { flushSync } from 'react-dom';

/**
 * Runs a state change inside a View Transition and reveals the new state
 * with a circle that grows from the trigger point to cover the full page.
 * Falls back to applying the change instantly where the API is missing.
 */
export function revealFrom(event, apply) {
  const doc = document;
  if (!doc.startViewTransition) { apply(); return; }

  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = doc.startViewTransition(() => {
    flushSync(() => apply());
  });

  transition.ready.then(() => {
    doc.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 550, easing: 'cubic-bezier(0.2, 0, 0, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}
