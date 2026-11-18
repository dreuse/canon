import type { Transition } from "framer-motion";
import useMediaQuery from "~/hooks/useMediaQuery";
import { sidebarSpring } from "~/styles/animations";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const INSTANT_TRANSITION: Transition = { duration: 0 };

/**
 * Returns the transition that moves the comments margin and the text beside
 * it, which is instant when the user prefers reduced motion.
 *
 * @returns the transition and whether motion is reduced.
 */
export default function useMarginTransition() {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  return {
    transition: reducedMotion ? INSTANT_TRANSITION : sidebarSpring,
    reducedMotion,
  };
}
