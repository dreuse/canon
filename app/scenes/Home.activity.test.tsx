import { render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import type Document from "~/models/Document";
import Event from "~/models/Event";
import stores from "~/stores";
import { ActivityEventRow } from "~/components/ActivityFeed";

const DOCUMENT_ID = "doc-1";
const COLLECTION_ID = "collection-1";
const STORED_TITLE = "Stored runbook title";
const LOADED_TITLE = "Loaded runbook title";
const COLLECTION_NAME = "Engineering";
const ACTOR_NAME = "Rafael Souza";
const DOC_PATH = "/doc/runbook-abc";

function makeEvent(fields: Record<string, unknown> = {}) {
  return new Event<Document>(
    {
      id: "event-1",
      name: "documents.update",
      documentId: DOCUMENT_ID,
      collectionId: COLLECTION_ID,
      createdAt: new Date().toISOString(),
      documentTitle: STORED_TITLE,
      documentUrl: DOC_PATH,
      ...fields,
    },
    stores.events
  );
}

function renderRow(event: Event<Document>) {
  return render(
    <Provider rootStore={stores}>
      <ThemeProvider theme={light}>
        <MemoryRouter>
          <ActivityEventRow event={event} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe("Home activity row", () => {
  beforeEach(() => {
    stores.documents.clear();
    stores.collections.clear();
    stores.collections.add({
      id: COLLECTION_ID,
      name: COLLECTION_NAME,
      color: "#4f6ef7",
    });
  });

  it("R03 renders a created verb for documents.create", () => {
    renderRow(makeEvent({ name: "documents.create" }));
    expect(screen.getByText(/created/)).toBeTruthy();
    expect(screen.queryByText(/edited/)).toBeNull();
  });

  it("R03 renders a commented verb for comments.create", () => {
    renderRow(makeEvent({ name: "comments.create" }));
    expect(screen.getByText(/commented on/)).toBeTruthy();
  });

  it("R03 renders the stored document title", () => {
    renderRow(makeEvent());
    expect(screen.getByText(STORED_TITLE)).toBeTruthy();
    expect(screen.queryByText(/a document/i)).toBeNull();
  });

  it("R03 prefers the loaded document title", () => {
    stores.documents.add({ id: DOCUMENT_ID, title: LOADED_TITLE });
    renderRow(makeEvent());
    expect(screen.getByText(LOADED_TITLE)).toBeTruthy();
    expect(screen.queryByText(STORED_TITLE)).toBeNull();
  });

  it("R03 renders the collection name", () => {
    renderRow(makeEvent());
    expect(screen.getByText(COLLECTION_NAME)).toBeTruthy();
  });

  it("R03 renders the collection icon beside the collection name", () => {
    renderRow(makeEvent());
    expect(
      screen.getByText(COLLECTION_NAME).querySelector("svg")
    ).not.toBeNull();
  });

  it("R03 renders the title without a link when no path exists", () => {
    renderRow(makeEvent({ documentUrl: undefined }));
    expect(screen.getByText(STORED_TITLE).closest("a")).toBeNull();
  });

  it("R03 links the title when a path exists", () => {
    renderRow(makeEvent());
    expect(
      screen.getByText(STORED_TITLE).closest("a")?.getAttribute("href")
    ).toBe(DOC_PATH);
  });

  it("R03 renders the actor name in its own element", () => {
    renderRow(makeEvent({ actor: { id: "user-1", name: ACTOR_NAME } }));
    expect(screen.getByText(ACTOR_NAME).tagName).toBe("B");
  });

  it("R03 renders the collection of the loaded document when the event has none", () => {
    stores.documents.add({
      id: DOCUMENT_ID,
      title: LOADED_TITLE,
      collectionId: COLLECTION_ID,
    });
    renderRow(makeEvent({ collectionId: undefined }));
    expect(screen.getByText(COLLECTION_NAME)).toBeTruthy();
  });

  it("R03 renders Untitled for a loaded document with an empty title", () => {
    stores.documents.add({ id: DOCUMENT_ID, title: "" });
    renderRow(makeEvent());
    expect(
      screen.getByText("Untitled").closest("a")?.getAttribute("href")
    ).toBe(DOC_PATH);
    expect(screen.queryByText(STORED_TITLE)).toBeNull();
  });

  it("R03 renders a deleted loaded document without a link", () => {
    stores.documents.add({
      id: DOCUMENT_ID,
      title: LOADED_TITLE,
      path: DOC_PATH,
      deletedAt: new Date().toISOString(),
    });
    renderRow(makeEvent({ documentUrl: undefined }));
    expect(screen.getByText(LOADED_TITLE).closest("a")).toBeNull();
  });
});
