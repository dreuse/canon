import { render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { buildDarkTheme, light } from "@shared/styles/theme";
import { resolveIconColor } from "@shared/utils/iconColor";
import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import stores from "~/stores";
import CollectionLink from "./CollectionLink";

const USER_ID = "user-1";
const NOOP = () => undefined;
const COLLECTION_COLOR = "rgb(47, 125, 79)";
const COLLECTION_HEX = "#2f7d4f";
const dark = buildDarkTheme({});
const VERY_DARK_HEX = "#1a1a1a";
const RAW_DARK_RGB = "rgb(26, 26, 26)";
const DOT_TEST_ID = "collection-dot";
const LOCK_LABEL = "Private collection";

beforeAll(() => {
  runInAction(() => {
    stores.users.add({ id: USER_ID, name: "Tester" });
    stores.auth.currentUserId = USER_ID;
  });
});

function renderLink(
  permission: CollectionPermission | null,
  color = COLLECTION_HEX,
  theme = light
) {
  const collection = new Collection(
    {
      id: "collection-1",
      name: "Engineering",
      color,
      permission,
    },
    stores.collections
  );

  return render(
    <ThemeProvider theme={theme}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <CollectionLink collection={collection} onDisclosureClick={NOOP} />
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

function dotColor() {
  return getComputedStyle(screen.getByTestId(DOT_TEST_ID)).backgroundColor;
}

describe("CollectionLink", () => {
  it("R10 renders a dot and no lock for a workspace-visible collection", () => {
    renderLink(CollectionPermission.ReadWrite);

    expect(screen.getByTestId(DOT_TEST_ID)).not.toBeNull();
    expect(screen.queryByRole("img", { name: LOCK_LABEL })).toBeNull();
  });

  it("R10 renders a dot and a lock for a private collection", () => {
    renderLink(null);

    expect(screen.getByTestId(DOT_TEST_ID)).not.toBeNull();
    expect(screen.getByRole("img", { name: LOCK_LABEL })).not.toBeNull();
  });

  it("R10 draws the lock as a 12px outline glyph in the faint tone", () => {
    renderLink(null);

    const lock = screen.getByRole("img", { name: LOCK_LABEL });
    const glyph = lock.querySelector("svg");

    expect(glyph?.getAttribute("width")).toBe("12");
    expect(glyph?.getAttribute("height")).toBe("12");
    expect(glyph?.getAttribute("stroke-width")).toBe("1.75");
    expect(glyph?.getAttribute("fill")).toBe("none");
    expect(getComputedStyle(lock).color).toBe("rgb(95, 102, 115)");
  });

  it("R10 draws the dot in the collection colour", () => {
    renderLink(CollectionPermission.ReadWrite);

    expect(dotColor()).toBe(COLLECTION_COLOR);
  });

  it("R10 lifts a very dark colour to stay visible on the dark theme", () => {
    renderLink(CollectionPermission.ReadWrite, VERY_DARK_HEX, dark);

    expect(resolveIconColor(VERY_DARK_HEX, dark.background)).not.toBe(
      VERY_DARK_HEX
    );
    expect(dotColor()).not.toBe(RAW_DARK_RGB);
  });
});
