import { render, screen, within } from "@testing-library/react";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import { Index } from "./Index";
import { CollectionOrder } from "./Navigation";

const COLLECTION_ID = "collection-1";
const DOCUMENT_COUNT = "3";
const NODES = [
  { id: "doc-1", title: "Logs MCP guide", url: "/doc/logs-1", children: [] },
  {
    id: "doc-2",
    title: "Runbooks",
    url: "/doc/runbooks-2",
    children: [
      { id: "doc-3", title: "Restart", url: "/doc/restart-3", children: [] },
    ],
  },
];

function renderIndex() {
  vi.mocked(client.post).mockResolvedValue({ data: [], pagination: {} });
  stores.collections.clear();
  const collection = stores.collections.add({
    id: COLLECTION_ID,
    name: "Developers",
    sort: { field: "index", direction: "asc" },
    documents: NODES,
  });

  return render(
    <Provider rootStore={stores}>
      <ThemeProvider theme={light}>
        <MemoryRouter>
          <Index collection={collection} order={CollectionOrder.Structure} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe("Collection contents", () => {
  it("labels the contents with a level 2 heading and a count pill", () => {
    renderIndex();
    const heading = screen.getByRole("heading", { level: 2, name: /Contents/ });

    expect(within(heading).getByText(DOCUMENT_COUNT)).toBeTruthy();
    expect(screen.queryByText(/documents/)).toBeNull();
  });

  it("renders a card for each top-level document", () => {
    renderIndex();
    expect(screen.getByText("Logs MCP guide").closest("a")).not.toBeNull();
    expect(screen.getByText("Runbooks").closest("a")).not.toBeNull();
  });
});
