import type { Variants, Transition } from "framer-motion";

const easeOut: Transition["ease"] = [0.2, 0.7, 0.2, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};

export const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: easeOut } },
};

/**
 * Stagger container — children animate in sequence with a delay between each.
 * Pair with `fadeUp` (or any variant) on each child.
 */
export const stagger = (delayChildren = 0, staggerChildren = 0.08): Variants => ({
  hidden: {},
  visible: {
    transition: { delayChildren, staggerChildren },
  },
});

/**
 * Animate-on-mount props (no viewport detection).
 * Critical content uses these so it's GUARANTEED to render even if the
 * IntersectionObserver fails to fire (a known issue on Safari and certain
 * desktop browsers). Animations still play on page load via `animate`.
 */
export const inViewProps = {
  initial: "hidden" as const,
  animate: "visible" as const,
};
