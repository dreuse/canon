import { render, screen } from "@testing-library/react";
import { AcademicCapIcon } from "outline-icons";
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
const COLLECTION_HEX = "#2f7d4f";
const dark = buildDarkTheme({});
const VERY_DARK_HEX = "#1a1a1a";
const DOT_TEST_ID = "collection-dot";
const CHOSEN_ICON = "academicCap";
const ROW_ICON_SIZE = "16px";
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
  theme = light,
  icon: string | null = CHOSEN_ICON
) {
  const collection = new Collection(
    {
      id: "collection-1",
      name: "Engineering",
      color,
      permission,
      icon,
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

function rowIcon() {
  return document.querySelector('span[aria-hidden="true"] > svg');
}

function glyphPath(svg: Element | null) {
  return svg?.querySelector("path")?.getAttribute("d");
}

describe("CollectionLink", () => {
  it("renders the chosen icon and no lock for a workspace-visible collection", () => {
    const { container: expected } = render(<AcademicCapIcon />);
    const chosen = glyphPath(expected.querySelector("svg"));
    expected.remove();

    renderLink(CollectionPermission.ReadWrite);

    expect(screen.queryByTestId(DOT_TEST_ID)).toBeNull();
    expect(glyphPath(rowIcon())).toBe(chosen);
    expect(screen.queryByRole("img", { name: LOCK_LABEL })).toBeNull();
  });

  it("renders the chosen icon and a lock for a private collection", () => {
    renderLink(null);

    expect(screen.queryByTestId(DOT_TEST_ID)).toBeNull();
    expect(rowIcon()).not.toBeNull();
    expect(screen.getByRole("img", { name: LOCK_LABEL })).not.toBeNull();
  });

  it("draws the icon at 16px so the row keeps the dot's footprint", () => {
    renderLink(CollectionPermission.ReadWrite);

    expect(rowIcon()?.getAttribute("width")).toBe(ROW_ICON_SIZE);
    expect(rowIcon()?.getAttribute("height")).toBe(ROW_ICON_SIZE);
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

  it("draws the default icon in the collection colour", () => {
    renderLink(CollectionPermission.ReadWrite, COLLECTION_HEX, light, null);

    expect(rowIcon()?.getAttribute("fill")).toBe(COLLECTION_HEX);
  });

  it("lifts a very dark colour to stay visible on the dark theme", () => {
    renderLink(CollectionPermission.ReadWrite, VERY_DARK_HEX, dark, null);

    expect(resolveIconColor(VERY_DARK_HEX, dark.background)).not.toBe(
      VERY_DARK_HEX
    );
    expect(rowIcon()?.getAttribute("fill")).toBeTruthy();
    expect(rowIcon()?.getAttribute("fill")).not.toBe(VERY_DARK_HEX);
  });
});
