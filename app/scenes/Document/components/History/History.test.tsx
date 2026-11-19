import { act, render, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { Route, Router } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import Storage from "@shared/utils/Storage";
import { ActionContextProvider } from "~/hooks/useActionContext";
import type Revision from "~/models/Revision";
import stores from "~/stores";
import { documentHistoryPath, matchDocumentSlug } from "~/utils/routeHelpers";
import History from "./History";

const USER_ID = "8d3c3c47-4bd9-4c5f-9a4f-0d6f2b1c1a01";
const SHOW_CHANGES_KEY = "history-show-changes";
const TITLE = "Release checklist";
const CREATED_AT = "2026-11-19T10:49:17.470Z";
const BODY = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Alpha" }] }],
};

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ObserverStub);
vi.stubGlobal("IntersectionObserver", ObserverStub);

interface Fixture {
  documentId: string;
  urlId: string;
  revisionId: string;
  documentTitle?: string;
}

function renderHistory({
  documentId,
  urlId,
  revisionId,
  documentTitle = TITLE,
}: Fixture) {
  const document = runInAction(() =>
    stores.documents.add({
      id: documentId,
      urlId,
      path: `/doc/release-checklist-${urlId}`,
      title: documentTitle,
      data: BODY,
      updatedAt: CREATED_AT,
      createdAt: CREATED_AT,
    })
  );
  const fetchPage = vi
    .spyOn(stores.revisions, "fetchPage")
    .mockImplementation(async (params) => {
      if (params?.offset) {
        return [];
      }
      const revision = runInAction(() =>
        stores.revisions.add({
          id: revisionId,
          documentId,
          title: TITLE,
          data: BODY,
          createdAt: CREATED_AT,
          createdById: USER_ID,
          collaboratorIds: [USER_ID],
        })
      );
      return [revision] as Revision[];
    });
  vi.spyOn(stores.events, "fetchPage").mockResolvedValue([]);

  const history = createMemoryHistory({
    initialEntries: [document.path, documentHistoryPath(document)],
    initialIndex: 1,
  });
  render(
    <Provider rootStore={stores}>
      <ThemeProvider theme={light}>
        <Router history={history}>
          <ActionContextProvider>
            <Route path={`/doc/${matchDocumentSlug}`}>
              <History />
            </Route>
          </ActionContextProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  );
  return { document, history, fetchPage };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("History", () => {
  it("opens the latest revision when changes are highlighted and none is selected", async () => {
    Storage.set(SHOW_CHANGES_KEY, true);
    const revisionId = "0b6d1f4e-6a3f-4b7e-9c1a-2f5e8d7c6b01";
    const { document, history } = renderHistory({
      documentId: "5f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e01",
      urlId: "histlatest",
      revisionId,
    });

    await waitFor(() =>
      expect(history.location.pathname).toBe(
        documentHistoryPath(document, revisionId)
      )
    );
  });

  it("opens the current version when the document changed after its last revision", async () => {
    Storage.set(SHOW_CHANGES_KEY, true);
    const { document, history } = renderHistory({
      documentId: "5f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e02",
      urlId: "histcurrnt",
      revisionId: "0b6d1f4e-6a3f-4b7e-9c1a-2f5e8d7c6b02",
      documentTitle: `${TITLE} v2`,
    });

    await waitFor(() =>
      expect(history.location.pathname).toBe(
        documentHistoryPath(document, "latest")
      )
    );
  });

  it("stays on the document when changes are not highlighted", async () => {
    Storage.set(SHOW_CHANGES_KEY, false);
    const { document, history, fetchPage } = renderHistory({
      documentId: "5f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e03",
      urlId: "histnochng",
      revisionId: "0b6d1f4e-6a3f-4b7e-9c1a-2f5e8d7c6b03",
    });

    await waitFor(() => expect(fetchPage).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });

    expect(history.location.pathname).toBe(documentHistoryPath(document));
  });

  it("returns to the document on Back after opening the latest revision", async () => {
    Storage.set(SHOW_CHANGES_KEY, true);
    const revisionId = "0b6d1f4e-6a3f-4b7e-9c1a-2f5e8d7c6b04";
    const { document, history } = renderHistory({
      documentId: "5f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e04",
      urlId: "histgoback",
      revisionId,
    });
    await waitFor(() =>
      expect(history.location.pathname).toBe(
        documentHistoryPath(document, revisionId)
      )
    );

    act(() => history.goBack());

    expect(history.location.pathname).toBe(document.path);
  });
});
