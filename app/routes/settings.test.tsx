import { settingsPath } from "~/utils/routeHelpers";
import { settingsColumnWidth } from "./settings";

describe("settings column width", () => {
  it("R17 renders a form route in an 816px column", () => {
    expect(settingsColumnWidth(settingsPath("appearance"))).toBe("816px");
    expect(settingsColumnWidth(settingsPath())).toBe("816px");
  });

  it("R17 renders a list route in a 1064px column", () => {
    [
      "users",
      "groups",
      "templates",
      "emojis",
      "shares",
      "api-keys",
      "webhooks",
    ].forEach((route) => {
      expect(settingsColumnWidth(settingsPath(route))).toBe("1064px");
    });
    expect(settingsColumnWidth(settingsPath("groups", "abc", "members"))).toBe(
      "1064px"
    );
  });

  it("R17 renders template editor routes in the form column", () => {
    expect(settingsColumnWidth(settingsPath("templates", "new"))).toBe("816px");
    expect(settingsColumnWidth(settingsPath("templates", "abc"))).toBe("816px");
  });

  it("R17 defaults a plugin route to the form column", () => {
    expect(settingsColumnWidth(settingsPath("some-plugin"))).toBe("816px");
    expect(settingsColumnWidth("/settings/integrations/slack")).toBe("816px");
  });
});
