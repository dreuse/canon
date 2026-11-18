const COMMENT_EVENT_PREFIX = "comments.";

const EDIT_EVENT_NAMES = [
  "revisions.create",
  "documents.update",
  "documents.publish",
  "documents.unpublish",
  "documents.move",
  "documents.archive",
  "documents.unarchive",
  "documents.restore",
];

/** The filters offered above the activity feed. */
export enum ActivityFilter {
  All = "all",
  Edits = "edits",
  Comments = "comments",
}

/**
 * Whether an activity event belongs to a feed filter.
 *
 * @param eventName the name of the event, such as `revisions.create`.
 * @param filter the feed filter to match against.
 * @returns true when the event is shown under the filter.
 */
export function matchesActivityFilter(
  eventName: string,
  filter: ActivityFilter
) {
  switch (filter) {
    case ActivityFilter.Comments:
      return eventName.startsWith(COMMENT_EVENT_PREFIX);
    case ActivityFilter.Edits:
      return EDIT_EVENT_NAMES.includes(eventName);
    default:
      return true;
  }
}
