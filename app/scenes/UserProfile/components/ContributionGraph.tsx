import { format, parseISO } from "date-fns";
import type { Locale } from "date-fns";
import { transparentize } from "polished";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import {
  CONTRIBUTION_WEEKS,
  DAYS_IN_WEEK,
  buildContributionWeeks,
  contributionScale,
} from "./contributionGrid";
import type { HeatmapDay, WeekStart } from "./contributionGrid";

interface Props {
  /** Contribution counts keyed by local `yyyy-MM-dd` date. */
  counts: Record<string, number>;
  /** The total number of contributions in the window. */
  total: number;
  /** The first day of the week, following the viewer's locale. */
  weekStartsOn?: WeekStart;
  /** The locale used for month and weekday labels. */
  locale?: Locale;
}

/** The weekday rows that carry a label, matching the density GitHub uses. */
const LABELLED_ROWS = [1, 3, 5];

/**
 * Renders a year of daily contribution counts as a heatmap, one column per
 * week. The grid is exposed to assistive technology as a single image with a
 * summary label rather than several hundred cells; the activity feed beneath
 * it is the real textual alternative.
 */
export function ContributionGraph({
  counts,
  total,
  weekStartsOn = 0,
  locale,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HeatmapDay | null>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });

  const scale = useMemo(() => contributionScale(theme), [theme]);

  const weeks = useMemo(
    () =>
      buildContributionWeeks(counts, {
        today: new Date(),
        weekStartsOn,
        locale,
      }),
    [counts, weekStartsOn, locale]
  );

  const daysByDate = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    weeks.forEach((week) =>
      week.days.forEach((day) => {
        if (day) {
          map.set(day.date, day);
        }
      })
    );
    return map;
  }, [weeks]);

  const weekdayLabels = useMemo(() => {
    const reference = weeks[0]?.days.find((day) => day !== null);
    if (!reference) {
      return [];
    }
    const start = parseISO(reference.date);
    return Array.from({ length: DAYS_IN_WEEK }, (_, row) =>
      LABELLED_ROWS.includes(row)
        ? format(new Date(start.getTime() + row * 86400000), "iii", { locale })
        : ""
    );
  }, [weeks, locale]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.scrollLeft = element.scrollWidth;
    }
  }, [weeks]);

  const handlePointerOver = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const cell = target.closest<HTMLElement>("[data-date]");
      if (!cell?.dataset.date) {
        setHovered(null);
        return;
      }
      setAnchor({
        x: cell.offsetLeft + cell.offsetWidth / 2,
        y: cell.offsetTop,
      });
      setHovered(daysByDate.get(cell.dataset.date) ?? null);
    },
    [daysByDate]
  );

  const handlePointerLeave = useCallback(() => setHovered(null), []);

  const tooltipContent = hovered
    ? hovered.count > 0
      ? t("{{count}} contribution on {{date}}", {
          count: hovered.count,
          date: format(parseISO(hovered.date), "d MMM", { locale }),
        })
      : t("No contributions on {{date}}", {
          date: format(parseISO(hovered.date), "d MMM", { locale }),
        })
    : "";

  const busiest = useMemo(
    () =>
      Array.from(daysByDate.values()).reduce<HeatmapDay | null>(
        (highest, day) =>
          !highest || day.count > highest.count ? day : highest,
        null
      ),
    [daysByDate]
  );

  return (
    <Wrapper column gap={8}>
      <Scroller ref={scrollRef}>
        <Layout
          role="img"
          tabIndex={0}
          aria-label={t("{{count}} contribution in the last year", {
            count: total,
          })}
        >
          <Weekdays aria-hidden="true">
            {weekdayLabels.map((label, row) => (
              <WeekdayLabel key={row}>{label}</WeekdayLabel>
            ))}
          </Weekdays>
          <Columns>
            <Months aria-hidden="true">
              {weeks.map((week, column) =>
                week.monthLabel ? (
                  <MonthLabel key={column} style={{ gridColumn: column + 1 }}>
                    {week.monthLabel}
                  </MonthLabel>
                ) : null
              )}
            </Months>
            <Grid
              onPointerOver={handlePointerOver}
              onPointerLeave={handlePointerLeave}
            >
              {weeks.map((week, column) =>
                week.days.map((day, row) =>
                  day ? (
                    <Cell
                      key={day.date}
                      data-date={day.date}
                      $color={scale[day.level]}
                    />
                  ) : (
                    <Spacer key={`${column}-${row}`} />
                  )
                )
              )}
              <Anchor style={{ left: anchor.x, top: anchor.y }}>
                <Tooltip content={tooltipContent} open={!!hovered} side="top">
                  <AnchorPoint />
                </Tooltip>
              </Anchor>
            </Grid>
          </Columns>
        </Layout>
      </Scroller>
      <VisuallyHidden.Root>
        {busiest && busiest.count > 0
          ? t("Busiest day: {{count}} contributions on {{date}}", {
              count: busiest.count,
              date: busiest.date,
            })
          : null}
      </VisuallyHidden.Root>
      <Legend aria-hidden="true" align="center" gap={4}>
        <Text size="xsmall" type="tertiary">
          {t("Less")}
        </Text>
        {scale.map((color, level) => (
          <LegendCell key={level} $color={color} />
        ))}
        <Text size="xsmall" type="tertiary">
          {t("More")}
        </Text>
      </Legend>
    </Wrapper>
  );
}

const CELL = 11;
const GAP = 3;

const Wrapper = styled(Flex)`
  width: 100%;
`;

const Scroller = styled.div`
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding-bottom: 4px;
`;

const Layout = styled.div`
  display: flex;
  gap: 6px;
  min-width: max-content;
  outline-offset: 4px;
  border-radius: 4px;
`;

const Weekdays = styled.div`
  display: grid;
  grid-template-rows: repeat(${DAYS_IN_WEEK}, ${CELL}px);
  gap: ${GAP}px;
  padding-top: 18px;
`;

const WeekdayLabel = styled.div`
  font-size: 10px;
  line-height: ${CELL}px;
  color: ${s("textTertiary")};
  white-space: nowrap;
`;

const Columns = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Months = styled.div`
  display: grid;
  grid-template-columns: repeat(${CONTRIBUTION_WEEKS}, ${CELL}px);
  gap: ${GAP}px;
  height: 14px;
`;

const MonthLabel = styled.div`
  font-size: 10px;
  color: ${s("textTertiary")};
  white-space: nowrap;
  justify-self: start;
`;

const Grid = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(${CONTRIBUTION_WEEKS}, ${CELL}px);
  grid-template-rows: repeat(${DAYS_IN_WEEK}, ${CELL}px);
  grid-auto-flow: column;
  gap: ${GAP}px;

  ${breakpoint("mobile", "mobileLarge")`
    grid-template-columns: repeat(${CONTRIBUTION_WEEKS}, 9px);
    grid-template-rows: repeat(${DAYS_IN_WEEK}, 9px);
  `}
`;

const Cell = styled.div<{ $color: string }>`
  background: ${(props) => props.$color};
  border-radius: 2px;
  outline: 1px solid ${(props) => transparentize(0.9, props.theme.divider)};
  outline-offset: -1px;
`;

const Spacer = styled.div`
  visibility: hidden;
`;

const Anchor = styled.div`
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
`;

const AnchorPoint = styled.span`
  display: block;
  width: 0;
  height: 0;
`;

const Legend = styled(Flex)`
  align-self: flex-end;
`;

const LegendCell = styled.div<{ $color: string }>`
  width: ${CELL}px;
  height: ${CELL}px;
  background: ${(props) => props.$color};
  border-radius: 2px;
  outline: 1px solid ${(props) => transparentize(0.9, props.theme.divider)};
  outline-offset: -1px;
`;
