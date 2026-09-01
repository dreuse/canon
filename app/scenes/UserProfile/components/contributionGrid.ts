import {
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
  subDays,
} from "date-fns";
import type { Locale } from "date-fns";
import { lighten, mix } from "polished";
import type { DefaultTheme } from "styled-components";
import { toISODate } from "@shared/utils/date";

/** The number of week columns rendered in the contribution graph. */
export const CONTRIBUTION_WEEKS = 53;

/** The number of day rows in a week column. */
export const DAYS_IN_WEEK = 7;

/** The number of non-empty intensity steps in the contribution scale. */
export const HEATMAP_LEVELS = 4;

/**
 * The smallest number of columns between two month labels. A month occupying
 * fewer columns than this goes unlabelled, so that labels never overlap.
 */
const MIN_LABEL_GAP = 3;

/** The first day of the week, as understood by date-fns. */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HeatmapDay {
  /** The local calendar date, as a `yyyy-MM-dd` key. */
  date: string;
  /** The number of contributions made on this day. */
  count: number;
  /** The intensity bucket, 0 for none through to HEATMAP_LEVELS. */
  level: number;
}

export interface HeatmapWeek {
  /** The seven days of the column. Days after today are null. */
  days: (HeatmapDay | null)[];
  /** A month name rendered above the column when the column opens a month. */
  monthLabel?: string;
}

/**
 * Places a day's contribution count into an intensity bucket, scaled against
 * the busiest day in the window so that the graph stays legible for both light
 * and heavy contributors.
 *
 * @param count The number of contributions on the day.
 * @param max The highest daily count in the window.
 * @returns The bucket index, 0 for none through to HEATMAP_LEVELS.
 */
export function contributionLevel(count: number, max: number): number {
  if (count <= 0) {
    return 0;
  }
  if (max <= HEATMAP_LEVELS) {
    return Math.min(count, HEATMAP_LEVELS);
  }
  return Math.min(HEATMAP_LEVELS, Math.ceil((count / max) * HEATMAP_LEVELS));
}

/**
 * Builds the week columns of the contribution graph from a map of daily
 * counts, aligning the first column to the start of the week.
 *
 * @param counts Daily contribution counts keyed by local `yyyy-MM-dd` date.
 * @param options The day the graph ends on, the first day of the week, and the
 * locale used for month labels.
 * @returns Exactly CONTRIBUTION_WEEKS columns of DAYS_IN_WEEK days.
 */
export function buildContributionWeeks(
  counts: Record<string, number>,
  options: { today: Date; weekStartsOn?: WeekStart; locale?: Locale }
): HeatmapWeek[] {
  const { today, weekStartsOn = 0, locale } = options;

  const lastColumnStart = startOfWeek(today, { weekStartsOn });
  const gridStart = subDays(
    lastColumnStart,
    (CONTRIBUTION_WEEKS - 1) * DAYS_IN_WEEK
  );
  const gridEnd = endOfWeek(today, { weekStartsOn });

  const max = Object.values(counts).reduce(
    (highest, count) => Math.max(highest, count),
    0
  );
  const todayKey = toISODate(today);

  const dates = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: HeatmapWeek[] = [];
  let previousMonth = -1;
  let lastLabelColumn = -MIN_LABEL_GAP;

  for (let column = 0; column < CONTRIBUTION_WEEKS; column++) {
    const slice = dates.slice(
      column * DAYS_IN_WEEK,
      (column + 1) * DAYS_IN_WEEK
    );

    const days = slice.map((date) => {
      const key = toISODate(date);
      if (key > todayKey) {
        return null;
      }
      const count = counts[key] ?? 0;
      return { date: key, count, level: contributionLevel(count, max) };
    });

    const month = slice[0].getMonth();
    const opensMonth = month !== previousMonth;
    previousMonth = month;

    const hasRoom =
      column - lastLabelColumn >= MIN_LABEL_GAP &&
      column <= CONTRIBUTION_WEEKS - MIN_LABEL_GAP;
    const labelled = opensMonth && hasRoom;

    if (labelled) {
      lastLabelColumn = column;
    }

    weeks.push({
      days,
      monthLabel: labelled ? format(slice[0], "LLL", { locale }) : undefined,
    });
  }

  return weeks;
}

/**
 * Builds the intensity scale for the contribution graph, ramping from an inert
 * empty cell to the workspace accent colour so that the graph follows any
 * custom branding in either theme.
 *
 * @param theme The active theme.
 * @returns One colour per intensity level, index 0 being no contributions.
 */
export function contributionScale(theme: DefaultTheme): string[] {
  const empty = theme.isDark
    ? theme.backgroundSecondary
    : theme.backgroundQuaternary;
  const peak = theme.isDark ? lighten(0.12, theme.accent) : theme.accent;

  return [
    empty,
    mix(0.25, peak, empty),
    mix(0.5, peak, empty),
    mix(0.75, peak, empty),
    peak,
  ];
}
