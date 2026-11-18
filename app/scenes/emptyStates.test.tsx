import { render, screen, waitFor } from "@testing-library/react";
import { subDays } from "date-fns";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import { ActionContextProvider } from "~/hooks/useActionContext";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import Archive from "./Archive";
import Error404 from "./Errors/Error404";
import Shares from "./Settings/Shares";
import Trash from "./Trash";

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const TEAM_ID = "team-1";
const DOCUMENT_ID = "document-1";
const DELETED_DAYS_AGO = 12;
const DAYS_LEFT = 18;
const WARNING_DAYS_AGO = 26;
const WARNING_DAYS_LEFT = 4;

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock("~/components/SortableTable", () => ({
  SortableTable: () => <div data-testid="shares-table" />,
}));

vi.stubGlobal("ResizeObserver", ObserverStub);
vi.stubGlobal("IntersectionObserver", ObserverStub);

function seedStores() {
  stores.users.clear();
  stores.documents.clear();
  stores.collections.clear();
  stores.shares.clear();
  stores.policies.clear();
  stores.users.add({ id: USER_ID, name: "Marina Lopes" });
  stores.users.add({ id: OTHER_USER_ID, name: "Beatriz Nunes" });
  stores.auth.add({ id: TEAM_ID, name: "Omni Tous", sharing: true });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  stores.policies.add({ id: TEAM_ID, abilities: { update: true } });
}

function addDeletedDocument(id: string, title: string, daysAgo: number) {
  stores.documents.add({
    id,
    title,
    data: { type: "doc", content: [] },
    deletedAt: subDays(new Date(), daysAgo).toISOString(),
    updatedAt: subDays(new Date(), daysAgo).toISOString(),
    createdAt: subDays(new Date(), daysAgo + 1).toISOString(),
    updatedBy: stores.users.get(USER_ID),
    deletedBy: stores.users.get(USER_ID),
  });
}

function mockApi(documents: Record<string, unknown>[] = []) {
  vi.mocked(client.post).mockImplementation(async () => ({
    data: documents,
    policies: [],
    pagination: {},
  }));
}

function renderScene(element: React.ReactElement, route = "/") {
  return render(
    <Provider rootStore={stores}>
      <ThemeProvider theme={light}>
        <MemoryRouter initialEntries={[route]}>
          <ActionContextProvider>{element}</ActionContextProvider>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe("empty states", () => {
  beforeEach(() => {
    vi.mocked(client.post).mockClear();
    seedStores();
    mockApi();
  });

  it("R22 shows the days left for a document deleted 12 days ago", async () => {
    addDeletedDocument(DOCUMENT_ID, "Old retro notes", DELETED_DAYS_AGO);
    mockApi([stores.documents.get(DOCUMENT_ID) as never]);
    renderScene(<Trash />);

    expect(
      await screen.findByText(`Permanently deleted in ${DAYS_LEFT} days`)
    ).toBeTruthy();
  });

  it("R22 marks a document close to permanent deletion", async () => {
    addDeletedDocument(DOCUMENT_ID, "Old checklist", WARNING_DAYS_AGO);
    renderScene(<Trash />);

    const countdown = await screen.findByText(
      `Permanently deleted in ${WARNING_DAYS_LEFT} days`
    );
    expect(countdown.getAttribute("data-urgent")).toBe("true");
  });

  it("R22 states the retention rule in the Trash header", async () => {
    renderScene(<Trash />);

    expect(
      await screen.findByText(
        "Deleted items stay here for 30 days. After that, they are permanently deleted."
      )
    ).toBeTruthy();
  });

  it("R22 says the user deleted nothing in the default Trash view", async () => {
    renderScene(<Trash />);

    expect(
      await screen.findByText("You haven’t deleted any documents")
    ).toBeTruthy();
    expect(screen.queryByText("Trash is empty")).toBeNull();
  });

  it("R22 renders the empty Trash copy for every deleter", async () => {
    renderScene(<Trash />, "/trash?userId=");

    expect(await screen.findByText("Trash is empty")).toBeTruthy();
    expect(
      screen.getByText(
        "When you delete a document, it stays here for 30 days. In that time, you can restore it in one click."
      )
    ).toBeTruthy();
  });

  it("R22 renders the empty Archive copy", async () => {
    renderScene(<Archive />);

    expect(await screen.findByText("Nothing archived")).toBeTruthy();
    expect(
      screen.getByText(
        "Archive what you no longer use to clear the sidebar. You can restore it at any time."
      )
    ).toBeTruthy();
  });

  it("R22 hides the empty Shares copy until the list has loaded", async () => {
    let release: () => void = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(client.post).mockImplementation(async (url: string) => {
      if (url === "/shares.list") {
        await released;
      }
      return { data: [], policies: [], pagination: {} };
    });
    renderScene(<Shares />);

    expect(await screen.findByTestId("shares-table")).toBeTruthy();
    expect(screen.queryByText("No public links")).toBeNull();

    release();
    expect(await screen.findByText("No public links")).toBeTruthy();
    expect(screen.queryByTestId("shares-table")).toBeNull();
  });

  it("R22 renders the empty Shares copy without a table header", async () => {
    renderScene(<Shares />);

    expect(await screen.findByText("No public links")).toBeTruthy();
    expect(
      screen.getByText(
        "When someone publishes a document to the web, the link appears here. You can revoke access at any time."
      )
    ).toBeTruthy();
    expect(screen.queryByTestId("shares-table")).toBeNull();
  });

  it("R22 offers Home and search on the 404 page", async () => {
    renderScene(<Error404 />);

    expect(screen.getByText("Error 404")).toBeTruthy();
    expect(screen.getByText("We couldn’t find this page")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Go to home/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Search documents/ })).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Trash" })).toBeTruthy()
    );
  });
});
