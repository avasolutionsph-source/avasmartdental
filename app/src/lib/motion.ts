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
 * Use with `whileInView` so the animation triggers once per page load.
 * `amount: "some"` fires as soon as ANY pixel of the element is visible.
 * Generous bottom margin pre-triggers elements while they're still below the fold,
 * ensuring they're already visible by the time the user scrolls to them
 * (much more robust than `amount: 0.18` on Safari + large desktops).
 */
export const inViewProps = {
  initial: "hidden" as const,
  whileInView: "visible" as const,
  viewport: { once: true, amount: "some" as const, margin: "0px 0px 200px 0px" },
};
