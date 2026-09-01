import Router from "koa-router";
import { intersection } from "es-toolkit/compat";
import type { Includeable, InferAttributes, WhereOptions } from "sequelize";
import { Op, Sequelize } from "sequelize";
import { UserRole } from "@shared/types";
import { EventHelper } from "@shared/utils/EventHelper";
import { InternalError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { Event, User, Collection, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentEvent } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

/**
 * The where fragment that restricts events to those a user may see. Kept as a
 * concrete object shape so that it can be spread into a larger where clause.
 */
type VisibilityWhere = { [Op.or]: WhereOptions<Event>[] };

/**
 * Builds the where fragment and include that restrict a team-wide event query
 * to the events a given user may see: events with no document attached, plus
 * events on published documents in collections the user has access to.
 *
 * The returned where fragment uses `$document.…$` paths and is only valid when
 * merged into a query that also uses the returned include, under the alias
 * `document`.
 *
 * @param user The user the query is being run for.
 * @param documentAttributes Columns to select from the joined document. Pass an
 * empty array when only the visibility filter is needed.
 * @returns The where fragment and the include it depends on.
 */
async function buildVisibilityScope(
  user: User,
  documentAttributes: Array<keyof InferAttributes<Document>> = []
): Promise<{ where: VisibilityWhere; include: Includeable[] }> {
  const isVisibleDocument: WhereOptions<Event> = {
    "$document.publishedAt$": { [Op.ne]: null },
  };

  if (!user.isAdmin) {
    isVisibleDocument["$document.collectionId$"] = await user.collectionIds();
  }

  return {
    where: { [Op.or]: [{ documentId: null }, isVisibleDocument] },
    include: [
      {
        model: Document.unscoped(),
        as: "document",
        required: false,
        paranoid: false,
        attributes: documentAttributes,
      },
    ],
  };
}

/** Milliseconds in a calendar day, used for UTC-only date arithmetic. */
const DayInMs = 24 * 60 * 60 * 1000;

/**
 * Renders a point in time as the calendar date it falls on in a timezone.
 *
 * @param date The instant to render.
 * @param timezone The IANA timezone to resolve the calendar date in.
 * @returns The date as a `yyyy-MM-dd` string.
 */
function toCalendarDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Lists every calendar date between two dates, inclusive of both ends.
 *
 * @param startDate The first date, as `yyyy-MM-dd`.
 * @param endDate The last date, as `yyyy-MM-dd`.
 * @returns The dates in ascending order.
 */
function eachCalendarDate(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const end = Date.parse(`${endDate}T00:00:00Z`);

  for (
    let at = Date.parse(`${startDate}T00:00:00Z`);
    at <= end;
    at += DayInMs
  ) {
    dates.push(new Date(at).toISOString().slice(0, 10));
  }

  return dates;
}

/**
 * Narrows an aggregate column that Postgres returns as text.
 *
 * @param value The raw column value.
 * @returns The value as a string.
 * @throws {InternalError} When the aggregate did not return a string.
 */
function readString(value: unknown): string {
  if (typeof value !== "string") {
    throw InternalError("Unexpected aggregate result");
  }
  return value;
}

/**
 * Narrows a `COUNT()` column, which node-postgres surfaces as text because
 * Postgres types it as a bigint.
 *
 * @param value The raw column value.
 * @returns The value as a number.
 * @throws {InternalError} When the aggregate did not return a number.
 */
function readCount(value: unknown): number {
  const count = typeof value === "string" ? Number.parseInt(value, 10) : value;
  if (typeof count !== "number" || Number.isNaN(count)) {
    throw InternalError("Unexpected aggregate result");
  }
  return count;
}

router.post(
  "events.list",
  auth(),
  pagination(),
  validate(T.EventsListSchema),
  async (ctx: APIContext<T.EventsListReq>) => {
    const { user } = ctx.state.auth;
    const {
      name,
      events,
      auditLog,
      actorId,
      documentId,
      collectionId,
      sort,
      direction,
    } = ctx.input.body;

    let where: WhereOptions<Event> = {
      teamId: user.teamId,
      actorId: { [Op.ne]: null },
    };

    if (auditLog) {
      authorize(user, "audit", user.team);
      where.name = events
        ? intersection(EventHelper.AUDIT_EVENTS, events)
        : EventHelper.AUDIT_EVENTS;
    } else {
      where.name = events
        ? intersection(EventHelper.ACTIVITY_EVENTS, events)
        : EventHelper.ACTIVITY_EVENTS;
    }

    if (name && (where.name as string[]).includes(name)) {
      where.name = name;
    }

    if (actorId) {
      const actor = await User.findByPk(actorId);
      authorize(user, auditLog ? "readDetails" : "read", actor);
      where = { ...where, actorId };
    }

    const hasExplicitScope = !!documentId || !!collectionId;

    if (documentId) {
      const document = await Document.findByPk(documentId, {
        userId: user.id,
      });
      authorize(user, "read", document);
      where = { ...where, documentId };
    }

    if (collectionId) {
      const collection = await Collection.findByPk(collectionId, {
        userId: user.id,
      });
      authorize(user, "read", collection);
      where = { ...where, collectionId };
    }

    const { where: visibilityWhere, include: documentInclude } =
      await buildVisibilityScope(user, ["id", "title", "urlId", "deletedAt"]);

    if (!hasExplicitScope) {
      where = { ...where, ...visibilityWhere };
    }

    const loadedEvents = await Event.findAll({
      where,
      order: [[sort, direction]],
      include: [
        {
          model: User,
          as: "actor",
          paranoid: false,
        },
        ...documentInclude,
      ],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
      subQuery: false,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: loadedEvents.map((event) => presentEvent(event, auditLog)),
    };
  }
);

router.post(
  "events.counts",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth({ role: UserRole.Viewer }),
  validate(T.EventsCountsSchema),
  async (ctx: APIContext<T.EventsCountsReq>) => {
    const { user } = ctx.state.auth;
    const { actorId, timezone, days } = ctx.input.body;

    const actor = await User.findByPk(actorId);
    authorize(user, "read", actor);

    const { where: visibilityWhere, include } =
      await buildVisibilityScope(user);

    const endDate = toCalendarDate(new Date(), timezone);
    const startDate = toCalendarDate(
      new Date(Date.parse(`${endDate}T00:00:00Z`) - (days - 1) * DayInMs),
      "UTC"
    );

    const dayBucket = Sequelize.fn(
      "TO_CHAR",
      Sequelize.literal(`"event"."createdAt" AT TIME ZONE :timezone`),
      "YYYY-MM-DD"
    );

    const rows = await Event.findAll({
      attributes: [
        [dayBucket, "date"],
        "name",
        [Sequelize.fn("COUNT", Sequelize.col("event.id")), "count"],
      ],
      where: {
        ...visibilityWhere,
        teamId: user.teamId,
        actorId,
        name: [...EventHelper.ACTIVITY_EVENTS],
        [Op.and]: [
          Sequelize.literal(
            `"event"."createdAt" >= (CAST(:startDate AS timestamp) AT TIME ZONE :timezone)`
          ),
          Sequelize.literal(
            `"event"."createdAt" < ((CAST(:endDate AS timestamp) + INTERVAL '1 day') AT TIME ZONE :timezone)`
          ),
        ],
      },
      include,
      group: [dayBucket, "event.name"],
      replacements: { timezone, startDate, endDate },
      subQuery: false,
    });

    const perDay = new Map<string, number>();
    const perName = new Map<string, number>();
    let total = 0;

    for (const row of rows) {
      const date = readString(row.get("date"));
      const name = readString(row.get("name"));
      const count = readCount(row.get("count"));

      perDay.set(date, (perDay.get(date) ?? 0) + count);
      perName.set(name, (perName.get(name) ?? 0) + count);
      total += count;
    }

    ctx.body = {
      data: {
        timezone,
        startDate,
        endDate,
        total,
        days: eachCalendarDate(startDate, endDate).map((date) => ({
          date,
          count: perDay.get(date) ?? 0,
        })),
        stats: {
          documentsPublished: perName.get("documents.publish") ?? 0,
          edits: perName.get("revisions.create") ?? 0,
          collectionsCreated: perName.get("collections.create") ?? 0,
          total,
        },
      },
    };
  }
);

export default router;
