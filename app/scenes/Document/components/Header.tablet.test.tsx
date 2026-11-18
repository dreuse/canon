import { render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { light } from "@shared/styles/theme";
import { TOCPosition, UserRole } from "@shared/types";
import { DocumentContextProvider } from "~/components/DocumentContext";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import { shouldShowContents } from "./Contents";
import DocumentHeader from "./Header";

const TABLET_WIDTH = 820;
const DESKTOP_WIDTH = 1280;
const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "document-1";
const CONTENTS_MENU_LABEL = "Table of contents";
const CONTENTS_RAIL_TOGGLE_LABEL = "Show contents";
const MAX_WIDTH_QUERY = /\(max-width:\s*(\d+)px\)/;

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubViewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const maxWidth = MAX_WIDTH_QUERY.exec(query)?.[1];
    return {
      media: query,
      matches: maxWidth !== undefined && width <= Number(maxWidth),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });
}

function renderHeader() {
  const document = stores.documents.get(DOCUMENT_ID);
  if (!document) {
    throw new Error("document missing");
  }
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider>
            <DocumentContextProvider>
              <DocumentHeader
                document={document}
                revision={undefined}
                isDraft={false}
                isEditing={false}
                isSaving={false}
                isPublishing={false}
                publishingIsDisabled={false}
                savingIsDisabled={false}
                onSelectTemplate={vi.fn()}
                onSave={vi.fn()}
              />
            </DocumentContextProvider>
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

describe("Document header below the desktop breakpoint", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(client.post).mockResolvedValue({
      data: [],
      policies: [],
      pagination: {},
    });
    stores.clear();
    stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
    stores.auth.add({ id: TEAM_ID, name: "Test Team" });
    stores.documents.add({ id: DOCUMENT_ID, title: "Test document" });
    runInAction(() => {
      stores.auth.currentUserId = USER_ID;
      stores.auth.currentTeamId = TEAM_ID;
      stores.collections.isLoaded = true;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("R02 shows the Sumário button at 820px", () => {
    stubViewport(TABLET_WIDTH);
    renderHeader();

    expect(
      screen.getByRole("button", { name: CONTENTS_MENU_LABEL })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: CONTENTS_RAIL_TOGGLE_LABEL })
    ).toBeNull();
  });

  it("R02 does not render the contents rail at 820px", () => {
    expect(
      shouldShowContents({
        belowDesktop: true,
        isShare: false,
        tocVisible: true,
        tocPosition: TOCPosition.Left,
      })
    ).toBe(false);
    expect(
      shouldShowContents({
        belowDesktop: true,
        isShare: true,
        tocVisible: true,
        tocPosition: TOCPosition.Left,
      })
    ).toBe(false);
  });

  it("R02 keeps the contents rail toggle at 1280px", () => {
    stubViewport(DESKTOP_WIDTH);
    renderHeader();

    expect(
      screen.getByRole("button", { name: CONTENTS_RAIL_TOGGLE_LABEL })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: CONTENTS_MENU_LABEL })
    ).toBeNull();
    expect(
      shouldShowContents({
        belowDesktop: false,
        isShare: false,
        tocVisible: true,
        tocPosition: TOCPosition.Left,
      })
    ).toBe(true);
  });
});
