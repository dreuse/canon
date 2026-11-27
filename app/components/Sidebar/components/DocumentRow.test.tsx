import { render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import stores from "~/stores";
import DocumentRow from "./DocumentRow";
import { childDepthFor, indentForDepth } from "./SidebarLink";

const USER_ID = "user-1";
const NOOP = () => undefined;
const CHILD_DEPTH = 2;
const COLLECTION_DISCLOSURE_END = 34;
const DISCLOSURE_OFFSET = 22;

beforeAll(() => {
  runInAction(() => {
    stores.users.add({ id: USER_ID, name: "Tester" });
    stores.auth.currentUserId = USER_ID;
  });
});

function renderRow(title: string, hasChildren: boolean, path: string) {
  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <MemoryRouter initialEntries={["/home"]}>
          <DocumentRow
            documentId={title}
            to={path}
            depth={CHILD_DEPTH}
            label={title}
            expanded={hasChildren}
            hasChildren={hasChildren}
            onDisclosureClick={NOOP}
          />
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

function weightOf(title: string) {
  return screen.getByText(title).closest("a")?.style.fontWeight;
}

describe("DocumentRow", () => {
  it("gives a parent document the same weight as a leaf document", () => {
    renderRow("PRODESP", true, "/doc/prodesp");
    renderRow("Board", false, "/doc/board");

    expect(weightOf("PRODESP")).toBe(weightOf("Board"));
  });

  it("starts a first-level document's arrow past the collection arrow", () => {
    const arrowStart = indentForDepth(childDepthFor(0)) - DISCLOSURE_OFFSET;

    expect(arrowStart).toBeGreaterThanOrEqual(COLLECTION_DISCLOSURE_END);
  });
});
