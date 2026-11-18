import { EventHelper } from "./EventHelper";

describe("EventHelper", () => {
  it.each(["comments.create", "documents.create"])(
    "lists %s as an activity event",
    (name) => {
      expect(EventHelper.ACTIVITY_EVENTS).toContain(name);
    }
  );
});
