import { EventHelper } from "@shared/utils/EventHelper";
import { describeEvent } from "./UserActivity";

describe("describeEvent", () => {
  it.each(EventHelper.ACTIVITY_EVENTS)("describes %s", (name) => {
    const description = describeEvent({ name });

    expect(description).toBeDefined();
    expect(description?.defaults).toBeTruthy();
    expect(description?.icon).toBeTruthy();
  });

  it("returns nothing for an unrecognised event", () => {
    expect(describeEvent({ name: "documents.something_new" })).toBeUndefined();
  });
});
