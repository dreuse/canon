import { breakpoints } from "@shared/styles/breakpoint";
import { sidebarRailWidth } from "@shared/styles/theme";
import { useSplitView } from "~/components/SplitView/context";
import useMediaQuery from "~/hooks/useMediaQuery";
import useStores from "~/hooks/useStores";
import {
  type CommentsLayout,
  NO_COMMENTS_LAYOUT,
  getCommentsLayout,
} from "~/scenes/Document/components/commentsLayout";

/**
 * Returns the document layout for the current window while Conversas is open
 * in the margin, or a layout without margin when it is closed or in a split
 * view. The mode follows media queries, and the widths are read from the
 * window when the hook renders, so it does not re-render on every resize.
 * Call it from an observer component.
 *
 * @returns the comments layout.
 */
export default function useCommentsLayout(): CommentsLayout {
  const { ui } = useStores();
  const { pane, isSplitView } = useSplitView();
  const isDesktop = useMediaQuery(`(min-width: ${breakpoints.desktop}px)`);
  const isWide = useMediaQuery(`(min-width: ${breakpoints.desktopWide}px)`);

  if (isSplitView || ui.getRightSidebar(pane) !== "comments" || !isDesktop) {
    return NO_COMMENTS_LAYOUT;
  }

  const viewportWidth = isWide
    ? Math.max(window.innerWidth, breakpoints.desktopWide)
    : Math.min(
        Math.max(window.innerWidth, breakpoints.desktop),
        breakpoints.desktopWide - 1
      );

  return getCommentsLayout(
    viewportWidth,
    ui.sidebarIsClosed ? sidebarRailWidth : ui.sidebarWidth
  );
}
