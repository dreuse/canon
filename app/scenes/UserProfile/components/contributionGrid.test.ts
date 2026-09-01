import { addDays, getDay, parseISO } from "date-fns";
import { buildDarkTheme, buildLightTheme } from "@shared/styles/theme";
import { toISODate } from "@shared/utils/date";
import {
  CONTRIBUTION_WEEKS,
  DAYS_IN_WEEK,
  HEATMAP_LEVELS,
  buildContributionWeeks,
  contributionLevel,
  contributionScale,
} from "./contributionGrid";

const today = parseISO("2026-08-14");

describe("buildContributionWeeks", () => {
  it("returns a full rectangular grid", () => {
    const weeks = buildContributionWeeks({}, { today });

    expect(weeks).toHaveLength(CONTRIBUTION_WEEKS);
    weeks.forEach((week) => {
      expect(week.days).toHaveLength(DAYS_IN_WEEK);
    });
  });

  it.each([0, 1] as const)(
    "aligns the first column to weekStartsOn %i",
    (weekStartsOn) => {
      const weeks = buildContributionWeeks({}, { today, weekStartsOn });
      const first = weeks[0].days[0];

      expect(first).not.toBeNull();
      expect(getDay(parseISO(first!.date))).toBe(weekStartsOn);
    }
  );

  it("ends on today and leaves the remainder of the column empty", () => {
    const weeks = buildContributionWeeks({}, { today });
    const lastColumn = weeks[weeks.length - 1].days;

    const populated = lastColumn.filter((day) => day !== null);
    expect(populated[populated.length - 1]!.date).toBe(toISODate(today));

    const firstNull = lastColumn.findIndex((day) => day === null);
    if (firstNull !== -1) {
      expect(lastColumn.slice(firstNull).every((day) => day === null)).toBe(
        true
      );
    }
  });

  it("produces a strictly increasing, gapless run of dates", () => {
    const weeks = buildContributionWeeks({}, { today });
    const dates = weeks
      .flatMap((week) => week.days)
      .filter((day): day is NonNullable<typeof day> => day !== null)
      .map((day) => day.date);

    expect(dates.length).toBeGreaterThan(0);

    dates.forEach((date, index) => {
      if (index === 0) {
        return;
      }
      const previous = parseISO(dates[index - 1]);
      expect(date).toBe(toISODate(addDays(previous, 1)));
    });
  });

  it("places a count on the matching day, with no off-by-one", () => {
    const weeks = buildContributionWeeks({ "2026-08-14": 3 }, { today });
    const match = weeks
      .flatMap((week) => week.days)
      .find((day) => day?.date === "2026-08-14");

    expect(match?.count).toBe(3);
  });

  it("defaults missing dates to zero", () => {
    const weeks = buildContributionWeeks({ "2026-08-14": 3 }, { today });
    const other = weeks
      .flatMap((week) => week.days)
      .find((day) => day?.date === "2026-08-13");

    expect(other?.count).toBe(0);
    expect(other?.level).toBe(0);
  });

  it("renders an all-empty grid when there is no activity", () => {
    const weeks = buildContributionWeeks({}, { today });
    const days = weeks
      .flatMap((week) => week.days)
      .filter((day) => day !== null);

    expect(days.every((day) => day!.level === 0)).toBe(true);
  });

  it("labels months without repeating or crowding the right edge", () => {
    const weeks = buildContributionWeeks({}, { today });
    const labels = weeks.map((week) => week.monthLabel);

    const present = labels.filter(Boolean);
    expect(present.length).toBeGreaterThanOrEqual(12);
    expect(present.length).toBeLessThanOrEqual(13);

    expect(labels[CONTRIBUTION_WEEKS - 1]).toBeUndefined();
    expect(labels[CONTRIBUTION_WEEKS - 2]).toBeUndefined();

    const labelledColumns = labels
      .map((label, column) => (label ? column : -1))
      .filter((column) => column >= 0);

    labelledColumns.forEach((column, index) => {
      if (index === 0) {
        return;
      }
      expect(column - labelledColumns[index - 1]).toBeGreaterThanOrEqual(3);
    });

    labels.forEach((label, index) => {
      if (index === 0 || !label) {
        return;
      }
      const previous = labels.slice(0, index).filter(Boolean).pop();
      expect(label).not.toBe(previous);
    });
  });

  it("honours the injected day rather than the wall clock", () => {
    const earlier = parseISO("2025-03-09");
    const weeks = buildContributionWeeks({}, { today: earlier });
    const days = weeks
      .flatMap((week) => week.days)
      .filter((day) => day !== null);

    expect(days[days.length - 1]!.date).toBe(toISODate(earlier));
  });
});

describe("contributionLevel", () => {
  it("returns zero for no contributions", () => {
    expect(contributionLevel(0, 50)).toBe(0);
    expect(contributionLevel(0, 0)).toBe(0);
  });

  it("maps counts directly when the busiest day is small", () => {
    expect(contributionLevel(1, 3)).toBe(1);
    expect(contributionLevel(2, 3)).toBe(2);
    expect(contributionLevel(3, 3)).toBe(3);
  });

  it("puts the busiest day at the top level", () => {
    [5, 12, 97, 1000].forEach((max) => {
      expect(contributionLevel(max, max)).toBe(HEATMAP_LEVELS);
    });
  });

  it("never decreases and never exceeds the top level", () => {
    const max = 37;
    let previous = 0;

    for (let count = 0; count <= max; count++) {
      const level = contributionLevel(count, max);
      expect(level).toBeGreaterThanOrEqual(previous);
      expect(level).toBeLessThanOrEqual(HEATMAP_LEVELS);
      previous = level;
    }
  });
});

describe("contributionScale", () => {
  const themes = {
    light: buildLightTheme({}),
    dark: buildDarkTheme({}),
  };

  it.each(Object.entries(themes))(
    "returns distinct steps in the %s theme",
    (_name, theme) => {
      const scale = contributionScale(theme);

      expect(scale).toHaveLength(HEATMAP_LEVELS + 1);
      expect(new Set(scale).size).toBe(HEATMAP_LEVELS + 1);
    }
  );
});
