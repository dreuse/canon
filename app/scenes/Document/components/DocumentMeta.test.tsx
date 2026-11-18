import { render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { light } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import DocumentMeta from "./DocumentMeta";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "document-1";
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ObserverStub);
vi.stubGlobal("IntersectionObserver", ObserverStub);

const emptyData = { type: "doc", content: [] };

function addComment(id: string, parentCommentId?: string) {
  stores.comments.add({
    id,
    documentId: DOCUMENT_ID,
    createdById: USER_ID,
    parentCommentId,
    data: emptyData,
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
            <DocumentMeta document={document} />
          </ActionContextProvider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

describe("Document meta line conversations", () => {
  beforeEach(() => {
    stores.clear();
    const user = stores.users.add({
      id: USER_ID,
      name: "Test User",
      role: UserRole.Admin,
    });
    stores.auth.add({ id: TEAM_ID, name: "Test Team" });
    stores.documents.add({
      id: DOCUMENT_ID,
      title: "Test document",
      updatedBy: user,
      updatedAt: "2026-01-01T00:00:00.000Z",
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

  it("R08 shows the open thread count, not the comment count", () => {
    addComment("thread-1");
    addComment("reply-1", "thread-1");
    addComment("reply-2", "thread-1");
    addComment("thread-2");
    renderMeta();

    expect(screen.getByText(/^2 conversation/)).toBeTruthy();
    expect(stores.comments.unresolvedThreadsInDocumentCount(DOCUMENT_ID)).toBe(
      2
    );
  });

  it("R08 uses the singular for one thread", () => {
    addComment("thread-1");
    addComment("reply-1", "thread-1");
    renderMeta();

    expect(screen.getByText("1 conversation")).toBeTruthy();
  });

  it("R08 shows no number without open threads", () => {
    renderMeta();

    expect(screen.getByText("Comment")).toBeTruthy();
    expect(screen.queryByText(/conversation/)).toBeNull();
  });
});
