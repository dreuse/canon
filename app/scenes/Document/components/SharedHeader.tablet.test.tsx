import { render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { useLayoutEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { ShareContext } from "@shared/hooks/useShare";
import { light } from "@shared/styles/theme";
import {
  DocumentContextProvider,
  useDocumentContext,
} from "~/components/DocumentContext";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import SharedHeader from "./SharedHeader";

const TABLET_WIDTH = 820;
const DESKTOP_WIDTH = 1280;
const DOCUMENT_ID = "document-1";
const SHARE_ID = "share-1";
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

function SeedHeadings() {
  const documentContext = useDocumentContext();
  useLayoutEffect(() => {
    runInAction(() => {
      documentContext.headings = [{ title: "Intro", level: 2, id: "intro" }];
    });
  }, [documentContext]);
  return null;
}

function renderSharedHeader() {
  const document = stores.documents.get(DOCUMENT_ID);
  if (!document) {
    throw new Error("document missing");
  }
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider>
            <ShareContext.Provider value={{ shareId: SHARE_ID }}>
              <DocumentContextProvider>
                <SeedHeadings />
                <SharedHeader document={document} />
              </DocumentContextProvider>
            </ShareContext.Provider>
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

describe("Shared document header below the desktop breakpoint", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(client.post).mockResolvedValue({
      data: [],
      policies: [],
      pagination: {},
    });
    stores.clear();
    stores.documents.add({ id: DOCUMENT_ID, title: "Test document" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("R02 shows the Table of contents menu and no rail toggle at 820px", () => {
    stubViewport(TABLET_WIDTH);
    renderSharedHeader();

    expect(
      screen.getByRole("button", { name: CONTENTS_MENU_LABEL })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: CONTENTS_RAIL_TOGGLE_LABEL })
    ).toBeNull();
  });

  it("R02 keeps the contents rail toggle at 1280px", () => {
    stubViewport(DESKTOP_WIDTH);
    renderSharedHeader();

    expect(
      screen.getByRole("button", { name: CONTENTS_RAIL_TOGGLE_LABEL })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: CONTENTS_MENU_LABEL })
    ).toBeNull();
  });
});
