import { createContext, useContext } from "react";
import { useTheme } from "styled-components";

const SurfaceContext = createContext<string | undefined>(undefined);

/**
 * Declares the background color that descendants are painted on. Wrap any
 * surface that sits above the content plane — a menu, a modal, a card — so that
 * contrast-sensitive children measure against what they actually sit on.
 */
export const SurfaceProvider = SurfaceContext.Provider;

/**
 * Returns the background color of the nearest declared surface.
 *
 * @returns the surface color, falling back to the content plane when no
 * surface has declared itself.
 */
export function useSurface(): string {
  const surface = useContext(SurfaceContext);
  const theme = useTheme();
  return surface ?? theme.background;
}
