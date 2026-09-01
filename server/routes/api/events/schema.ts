import { z } from "zod";
import { EventHelper } from "@shared/utils/EventHelper";
import { BaseSchema } from "@server/routes/api/schema";
import { zodTimezone } from "@server/utils/zod";

export const EventsListSchema = BaseSchema.extend({
  body: z.object({
    /** Events to retrieve */
    events: z
      .array(
        z.union([
          z.enum(EventHelper.ACTIVITY_EVENTS),
          z.enum(EventHelper.AUDIT_EVENTS),
        ])
      )
      .optional(),

    /** Id of the user who performed the action */
    actorId: z.uuid().optional(),

    /** Id of the document to filter the events for */
    documentId: z.uuid().optional(),

    /** Id of the collection to filter the events for */
    collectionId: z.uuid().optional(),

    /** Whether to include audit events */
    auditLog: z.boolean().prefault(false),

    /** @deprecated, use 'events' parameter instead
     * Name of the event to retrieve
     */
    name: z.string().optional(),

    /** The attribute to sort the events by */
    sort: z
      .string()
      .refine((val) => ["name", "createdAt"].includes(val))
      .prefault("createdAt"),

    /** The direction to sort the events */
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),
  }),
});

export type EventsListReq = z.infer<typeof EventsListSchema>;

/** IANA `Area/Location` timezone names, plus the bare `UTC` alias. */
const IANATimezoneRegex =
  /^(UTC|[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+){1,2})$/;

export const EventsCountsSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the user whose activity is being counted */
    actorId: z.uuid(),

    /**
     * IANA timezone used to assign each event to a calendar day, for example
     * "America/Sao_Paulo". Bucketing in UTC would place an evening edit in
     * UTC-3 on the following day.
     */
    timezone: z.string().regex(IANATimezoneRegex).pipe(zodTimezone()),

    /** Number of calendar days to return, ending today in `timezone` */
    days: z.int().min(1).max(366).prefault(365),
  }),
});

export type EventsCountsReq = z.infer<typeof EventsCountsSchema>;
