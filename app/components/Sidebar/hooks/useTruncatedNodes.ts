import { useCallback, useEffect, useState } from "react";

const DEFAULT_VISIBLE = 8;

const STEP = 50;

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
