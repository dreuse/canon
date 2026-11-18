import { breakpoints } from "@shared/styles";
import useMediaQuery from "~/hooks/useMediaQuery";

/**
 * Hook to detect if the current viewport is narrower than the desktop breakpoint.
 *
 * @returns boolean indicating whether the sidebar is a drawer.
 */
export default function useBelowDesktop(): boolean {
  return useMediaQuery(`(max-width: ${breakpoints.desktop - 1}px)`);
}
