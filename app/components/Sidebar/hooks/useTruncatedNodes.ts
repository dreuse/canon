import { useCallback, useEffect, useState } from "react";

const DEFAULT_VISIBLE = 8;

const STEP = 50;

export const SEE_ALL_THRESHOLD = 20;

/**
 * Decides whether a node list is long enough that the sidebar should link out
 * to the collection instead of revealing further rows inline.
 *
 * @param total the number of child nodes.
 * @returns true when the list is longer than the see all threshold.
 */
export function exceedsSeeAllThreshold(total: number) {
  return total > SEE_ALL_THRESHOLD;
}

export function useTruncatedNodes<T>(
  nodes: T[] | undefined,
  expanded: boolean,
  initial = DEFAULT_VISIBLE
) {
  const [showing, setShowing] = useState(initial);

  useEffect(() => {
    if (!expanded) {
      setShowing(initial);
    }
  }, [expanded, initial]);

  const showMore = useCallback(() => {
    setShowing((value) => value + STEP);
  }, []);

  const total = nodes?.length ?? 0;

  return {
    visible: nodes?.slice(0, showing),
    remaining: Math.max(total - showing, 0),
    showMore,
  };
}
