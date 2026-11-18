import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import { settingsPath } from "~/utils/routeHelpers";
import SettingsRoutes, { settingsColumnWidth } from "./settings";

vi.mock("~/hooks/useSettingsConfig", () => ({ default: () => [] }));

const TEMPLATE_URL_ID = "my-template-AbC123";
const COLLECTION_ID = "collection-1";

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Route
        path="/settings"
        render={({ location }) =>
          location.pathname.startsWith("/settings/") ? (
            <SettingsRoutes />
          ) : null
        }
      />
      <Route
        path="*"
        render={({ location }) => (
          <div data-testid="location">
            {location.pathname}
            {location.search}
          </div>
        )}
      />
    </MemoryRouter>
  );
  return screen.getByTestId("location").textContent;
}

describe("settings column width", () => {
  it("R17 renders a form route in an 816px column", () => {
    expect(settingsColumnWidth(settingsPath("appearance"))).toBe("816px");
    expect(settingsColumnWidth(settingsPath())).toBe("816px");
  });

  it("R17 renders a list route in a 1064px column", () => {
    [
      "users",
      "groups",
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

  it("R17 defaults a plugin route to the form column", () => {
    expect(settingsColumnWidth(settingsPath("some-plugin"))).toBe("816px");
    expect(settingsColumnWidth("/settings/integrations/slack")).toBe("816px");
  });
});

describe("template routes", () => {
  it("R33 redirects /settings/templates to /templates", () => {
    expect(renderAt("/settings/templates")).toBe("/templates");
  });

  it("R33 redirects /settings/templates/new and keeps the collection id", () => {
    expect(
      renderAt(`/settings/templates/new?collectionId=${COLLECTION_ID}`)
    ).toBe(`/templates/new?collectionId=${COLLECTION_ID}`);
  });

  it("R33 redirects /settings/templates/:id to /templates/:id", () => {
    expect(renderAt(`/settings/templates/${TEMPLATE_URL_ID}`)).toBe(
      `/templates/${TEMPLATE_URL_ID}`
    );
  });
});
