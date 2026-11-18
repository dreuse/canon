import { render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { light } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import { ActionContextProvider } from "~/hooks/useActionContext";
import TitleDocumentMeta from "~/scenes/Document/components/DocumentMeta";
import stores from "~/stores";

const PHONE_WIDTH = 390;
const USER_ID = "user-1";
const TEAM_ID = "team-1";
const AUTHOR_ID = "user-2";
const AUTHOR_NAME = "Marina Lopes";
const AUTHOR_INITIAL = "M";
const DOCUMENT_ID = "document-1";
const META_SELECTOR = "[data-document-meta]";
const MAX_WIDTH_QUERY = /\(max-width:\s*(\d+)px\)/;

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ObserverStub);
vi.stubGlobal("IntersectionObserver", ObserverStub);

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

function renderMeta() {
  const document = stores.documents.get(DOCUMENT_ID);
  if (!document) {
    throw new Error("document missing");
  }
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ActionContextProvider>
            <TitleDocumentMeta document={document} />
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

describe("Document meta line on a phone", () => {
  beforeEach(() => {
    stubViewport(PHONE_WIDTH);
    stores.clear();
    stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
    const author = stores.users.add({
      id: AUTHOR_ID,
      name: AUTHOR_NAME,
      role: UserRole.Member,
    });
    stores.auth.add({ id: TEAM_ID, name: "Test Team" });
    stores.documents.add({
      id: DOCUMENT_ID,
      title: "Test document",
      createdBy: author,
      updatedBy: author,
      updatedAt: "2026-01-02T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      verifiedAt: new Date().toISOString(),
    });
    stores.policies.add({
      id: DOCUMENT_ID,
      abilities: { comment: true, listViews: false },
    });
    runInAction(() => {
      stores.auth.currentUserId = USER_ID;
      stores.auth.currentTeamId = TEAM_ID;
    });
  });

  it("R12 renders avatar, name, time and status in one container", () => {
    renderMeta();

    const container = document.querySelector(META_SELECTOR);
    expect(container).toBeTruthy();

    const parts = [
      screen.getByText(AUTHOR_INITIAL),
      screen.getByText(AUTHOR_NAME),
      container?.querySelector("time"),
      screen.getByText("Verified"),
    ];
    parts.forEach((part) => {
      expect(part).toBeTruthy();
      expect(part?.closest(META_SELECTOR)).toBe(container);
    });
  });

  it("R12 drops the owner and the comment, contributor and viewer buttons", () => {
    renderMeta();

    expect(screen.queryByText("Owned by")).toBeNull();
    expect(screen.queryByText("Comment")).toBeNull();
  });
});
