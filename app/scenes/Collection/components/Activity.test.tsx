import { render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import { Activity } from "./Activity";

const COLLECTION_ID = "collection-1";
const COLLECTION_NAME = "Developers";
const DOCUMENT_ID = "doc-1";
const DOCUMENT_TITLE = "Logs MCP guide";

function renderActivity() {
  vi.mocked(client.post).mockResolvedValue({ data: [], pagination: {} });
  stores.collections.clear();
  stores.documents.clear();
  stores.events.clear();
  const collection = stores.collections.add({
    id: COLLECTION_ID,
    name: COLLECTION_NAME,
  });
  stores.documents.add({
    id: DOCUMENT_ID,
    title: DOCUMENT_TITLE,
    collectionId: COLLECTION_ID,
    path: "/doc/logs-1",
  });
  stores.events.add({
    id: "event-1",
    name: "documents.publish",
    documentId: DOCUMENT_ID,
    collectionId: COLLECTION_ID,
    createdAt: new Date().toISOString(),
  });

  return render(
    <Provider rootStore={stores}>
      <ThemeProvider theme={light}>
        <MemoryRouter>
          <Activity collection={collection} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe("Collection activity", () => {
  it("labels the activity with a level 2 heading", () => {
    renderActivity();
    expect(
      screen.getByRole("heading", { level: 2, name: "Activity in this collection" })
    ).toBeTruthy();
  });

  it("groups the activity under a day heading", () => {
    renderActivity();
    expect(screen.getByRole("heading", { name: "Today" })).toBeTruthy();
    expect(screen.getByText(DOCUMENT_TITLE).closest("a")).not.toBeNull();
  });

  it("leaves out the collection chip on each row", () => {
    renderActivity();
    expect(screen.getByText(DOCUMENT_TITLE)).toBeTruthy();
    expect(screen.queryByText(COLLECTION_NAME)).toBeNull();
  });
});
