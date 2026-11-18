import { act, fireEvent, render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { useLayoutEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import { ShareContext } from "@shared/hooks/useShare";
import { light } from "@shared/styles/theme";
import { UserRole } from "@shared/types";
import {
  DocumentContextProvider,
  useDocumentContext,
} from "~/components/DocumentContext";
import stores from "~/stores";
import { EmptyStarters } from "./EmptyStarters";

const USER_ID = "user-1";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "document-1";
const COLLECTION_ID = "collection-1";
const PUBLISHED_AT = "2026-01-01T00:00:00.000Z";
const MAX_COLLECTION_TEMPLATES = 3;
const TEMPLATE_TITLES = ["Alpha", "Bravo", "Charlie", "Delta"];

interface FakeDoc {
  textContent: string;
  childCount: number;
  firstChild: { isTextblock: boolean; content: { size: number } };
}

let setBody: (text: string) => void = () => undefined;
let setImageOnlyBody: () => void = () => undefined;
let detachEditor: () => void = () => undefined;

function ContextProbe() {
  const context = useDocumentContext();
  useLayoutEffect(() => {
    const attachDoc = (doc: FakeDoc) => {
      act(() => {
        context.setEditor({
          view: { state: { doc } },
          getHeadings: () => [],
          getTasks: () => [],
        } as never);
      });
    };
    setBody = (text: string) =>
      attachDoc({
        textContent: text,
        childCount: 1,
        firstChild: { isTextblock: true, content: { size: text.length } },
      });
    setImageOnlyBody = () =>
      attachDoc({
        textContent: "",
        childCount: 1,
        firstChild: { isTextblock: false, content: { size: 0 } },
      });
    detachEditor = () => act(() => context.setEditor(null as never));
    setBody("");
  }, [context]);
  return null;
}

function renderStarters({
  readOnly = false,
  shareId,
  onSelectTemplate = vi.fn(),
}: {
  readOnly?: boolean;
  shareId?: string;
  onSelectTemplate?: () => void;
} = {}) {
  const document = stores.documents.get(DOCUMENT_ID);
  if (!document) {
    throw new Error("document missing");
  }
  render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter>
          <ShareContext.Provider value={{ shareId }}>
            <DocumentContextProvider>
              <ContextProbe />
              <EmptyStarters
                document={document}
                readOnly={readOnly}
                onSelectTemplate={onSelectTemplate}
              />
            </DocumentContextProvider>
          </ShareContext.Provider>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
  return onSelectTemplate;
}

describe("Empty document starters", () => {
  beforeEach(() => {
    stores.clear();
    stores.users.add({ id: USER_ID, name: "Test User", role: UserRole.Admin });
    stores.auth.add({ id: TEAM_ID, name: "Test Team" });
    stores.collections.add({ id: COLLECTION_ID, name: "Test collection" });
    stores.documents.add({
      id: DOCUMENT_ID,
      title: "",
      collectionId: COLLECTION_ID,
    });
    stores.policies.add({
      id: COLLECTION_ID,
      abilities: { createDocument: true },
    });
    stores.policies.add({ id: DOCUMENT_ID, abilities: { update: true } });
    TEMPLATE_TITLES.forEach((title) =>
      stores.templates.add({
        id: `template-${title}`,
        title,
        collectionId: COLLECTION_ID,
        publishedAt: PUBLISHED_AT,
      })
    );
    stores.templates.add({
      id: "template-workspace",
      title: "Workspace wide",
      publishedAt: PUBLISHED_AT,
    });
    vi.spyOn(stores.templates, "fetchAllIfNeeded").mockResolvedValue(
      undefined as never
    );
    runInAction(() => {
      stores.auth.currentUserId = USER_ID;
      stores.auth.currentTeamId = TEAM_ID;
    });
  });

  it("R11 renders the starters for an empty draft", () => {
    renderStarters();
    expect(screen.getByText("Or start with")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Or start with" })).toBeTruthy();
    expect(screen.getAllByTestId("collection-template-starter")).toHaveLength(
      MAX_COLLECTION_TEMPLATES
    );
    expect(screen.queryByText("Workspace wide")).toBeNull();
    expect(screen.getByText("Structure with sections")).toBeTruthy();
    expect(screen.getByText("Import a file")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "See all templates" })
    ).toBeTruthy();
  });

  it("R11 applies the chosen template", () => {
    const onSelectTemplate = renderStarters();
    fireEvent.click(screen.getByText("Alpha"));
    expect(onSelectTemplate).toHaveBeenCalledWith(
      stores.templates.get("template-Alpha")
    );
  });

  it("R11 hides the list once the document has content", () => {
    renderStarters();
    setBody("Hello");
    expect(screen.queryByText("Or start with")).toBeNull();
  });

  it("R11 hides the list when the body holds only non-text content", () => {
    renderStarters();
    setImageOnlyBody();
    expect(screen.queryByText("Or start with")).toBeNull();
  });

  it("R11 keeps the starters while the editor ref is momentarily detached", () => {
    renderStarters();
    detachEditor();
    expect(screen.getByText("Or start with")).toBeTruthy();
  });

  it("R11 renders nothing for read-only users", () => {
    renderStarters({ readOnly: true });
    expect(screen.queryByText("Or start with")).toBeNull();
  });

  it("R11 renders nothing in a shared view", () => {
    renderStarters({ shareId: "share-1" });
    expect(screen.queryByText("Or start with")).toBeNull();
  });

  it("R11 keeps the other starters when the collection has no templates", () => {
    TEMPLATE_TITLES.forEach((title) =>
      stores.templates.remove(`template-${title}`)
    );
    renderStarters();
    expect(screen.queryAllByTestId("collection-template-starter")).toHaveLength(
      0
    );
    expect(screen.getByText("Structure with sections")).toBeTruthy();
    expect(screen.getByText("Import a file")).toBeTruthy();
    expect(screen.getByText("See all templates")).toBeTruthy();
  });
});
