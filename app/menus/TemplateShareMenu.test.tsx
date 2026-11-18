import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { ThemeProvider } from "styled-components";
import { PersonalCollectionId } from "@shared/constants";
import { light } from "@shared/styles/theme";
import { TeamPreference } from "@shared/types";
import TemplateMenu from "~/menus/TemplateMenu";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const TEAM_ID = "team-1";
const PERSONAL_ID = "collection-personal";
const ENGINEERING_ID = "collection-engineering";
const PRODUCT_ID = "collection-product";
const PEOPLE_ID = "collection-people";
const TEMPLATE_ID = "template-1";

const SHARE_LABEL = "Share…";
const ONLY_YOU = "Only you";
const WORKSPACE = "Workspace";
const NO_PERMISSION = "No permission in this collection";
const MOVED_TOAST = "Template moved";
const MOVE_FAILED_TOAST = "Couldn’t move the template. Try again?";
const MENU_TRIGGER = "Template options";

const MEMBER_TEAM_ABILITIES = { createTemplate: true };
const OPEN_COLLECTION_ABILITIES = { readDocument: true, createTemplate: true };
const TEMPLATE_ABILITIES = {
  update: true,
  duplicate: true,
  move: true,
  delete: true,
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function seed({
  collectionId = PERSONAL_ID as string | null,
  createdById = USER_ID,
  personalDocs = true,
  teamAbilities = MEMBER_TEAM_ABILITIES as Record<string, boolean>,
} = {}) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Object.assign(client, { batch: <T,>(operations: () => T) => operations() });
  vi.mocked(client.post).mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  stores.clear();
  stores.users.add({ id: USER_ID, name: "Marina Lopes" });
  stores.users.add({ id: OTHER_USER_ID, name: "Rafael Souza" });
  stores.auth.add({
    id: TEAM_ID,
    name: "Omni",
    preferences: { [TeamPreference.PersonalDocs]: personalDocs },
  });
  runInAction(() => {
    stores.auth.currentUserId = USER_ID;
    stores.auth.currentTeamId = TEAM_ID;
  });
  stores.policies.add({ id: TEAM_ID, abilities: teamAbilities });
  stores.collections.add({
    id: PERSONAL_ID,
    name: "Personal",
    ownerId: USER_ID,
  });
  stores.collections.add({ id: ENGINEERING_ID, name: "Engineering" });
  stores.collections.add({ id: PRODUCT_ID, name: "Product" });
  stores.collections.add({ id: PEOPLE_ID, name: "People" });
  [PERSONAL_ID, ENGINEERING_ID, PRODUCT_ID].forEach((id) =>
    stores.policies.add({ id, abilities: OPEN_COLLECTION_ABILITIES })
  );
  stores.policies.add({
    id: PEOPLE_ID,
    abilities: { readDocument: true, createTemplate: false },
  });
  stores.policies.add({ id: TEMPLATE_ID, abilities: TEMPLATE_ABILITIES });
  stores.templates.add({
    id: TEMPLATE_ID,
    title: "Release checklist",
    urlId: "url-template-1",
    path: "/templates/url-template-1",
    collectionId,
    createdBy: stores.users.get(createdById),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  });
  return stores.templates.get(TEMPLATE_ID)!;
}

async function openMenu(template: ReturnType<typeof seed>) {
  await act(async () => {
    render(
      <Provider rootStore={stores}>
        <ThemeProvider theme={light}>
          <MemoryRouter>
            <TemplateMenu template={template} onEdit={() => {}} />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
  });
  fireEvent.keyDown(screen.getByRole("button", { name: MENU_TRIGGER }), {
    key: "Enter",
  });
}

async function openShareSubmenu(template: ReturnType<typeof seed>) {
  await openMenu(template);
  const trigger = await screen.findByRole("menuitem", { name: SHARE_LABEL });
  fireEvent.keyDown(trigger, { key: "ArrowRight" });
  await screen.findByRole("menuitemradio", { name: ONLY_YOU });
}

function option(name: RegExp | string) {
  return screen.getByRole("menuitemradio", { name });
}

describe("TemplateShareMenu", () => {
  it("R30 lists Só você, each non-personal collection and Espaço de trabalho with the current scope checked", async () => {
    const template = seed({ collectionId: ENGINEERING_ID });
    await openShareSubmenu(template);

    const names = screen
      .getAllByRole("menuitemradio")
      .map((item) => item.textContent);

    expect(names).toEqual([
      ONLY_YOU,
      "Engineering",
      "Product",
      `People${NO_PERMISSION}`,
      WORKSPACE,
    ]);
    expect(option("Engineering").getAttribute("aria-checked")).toBe("true");
    expect(option(ONLY_YOU).getAttribute("aria-checked")).toBe("false");
    expect(option(WORKSPACE).getAttribute("aria-checked")).toBe("false");
  });

  it("R30 checks Só você for a template in the personal collection and Espaço de trabalho for a workspace template", async () => {
    const personal = seed({ collectionId: PERSONAL_ID });
    await openShareSubmenu(personal);
    expect(option(ONLY_YOU).getAttribute("aria-checked")).toBe("true");
    expect(option(WORKSPACE).getAttribute("aria-checked")).toBe("false");
  });

  it("R30 checks Espaço de trabalho when the template has no collection", async () => {
    const workspace = seed({ collectionId: null });
    await openShareSubmenu(workspace);
    expect(option(WORKSPACE).getAttribute("aria-checked")).toBe("true");
    expect(option(ONLY_YOU).getAttribute("aria-checked")).toBe("false");
  });

  it("R30 disables a collection without createTemplate and explains why", async () => {
    const template = seed({ collectionId: null });
    await openShareSubmenu(template);

    const people = screen.getByRole("menuitemradio", {
      name: new RegExp(NO_PERMISSION),
    });

    expect(people.getAttribute("aria-disabled")).toBe("true");
    expect(option("Engineering").getAttribute("aria-disabled")).toBeNull();
  });

  it("R30 disables Espaço de trabalho without the team createTemplate ability", async () => {
    const template = seed({
      collectionId: ENGINEERING_ID,
      teamAbilities: { createTemplate: false },
    });
    await openShareSubmenu(template);

    expect(option(new RegExp(WORKSPACE)).getAttribute("aria-disabled")).toBe(
      "true"
    );
    expect(screen.getAllByText(NO_PERMISSION)).toHaveLength(2);
  });

  it("R29 hides Só você when personal documents are off", async () => {
    const template = seed({
      collectionId: ENGINEERING_ID,
      personalDocs: false,
    });
    await openMenu(template);
    const trigger = await screen.findByRole("menuitem", { name: SHARE_LABEL });
    fireEvent.keyDown(trigger, { key: "ArrowRight" });
    await screen.findByRole("menuitemradio", { name: "Engineering" });

    expect(screen.queryByRole("menuitemradio", { name: ONLY_YOU })).toBeNull();
  });

  it("R32 disables Só você for a template the user did not author", async () => {
    const template = seed({
      collectionId: ENGINEERING_ID,
      createdById: OTHER_USER_ID,
    });
    await openShareSubmenu(template);

    expect(option(ONLY_YOU).getAttribute("aria-disabled")).toBe("true");
  });

  it("R32 enables Só você for the author", async () => {
    const template = seed({
      collectionId: ENGINEERING_ID,
      createdById: USER_ID,
    });
    await openShareSubmenu(template);

    expect(option(ONLY_YOU).getAttribute("aria-disabled")).toBeNull();
  });

  it("R30 moves the template to Espaço de trabalho with collectionId null", async () => {
    const template = seed({ collectionId: ENGINEERING_ID });
    vi.mocked(client.post).mockResolvedValue({
      data: { id: TEMPLATE_ID, collectionId: null },
      policies: [],
    });
    await openShareSubmenu(template);

    fireEvent.click(option(WORKSPACE));

    await waitFor(() => expect(template.collectionId).toBeNull());
    expect(client.post).toHaveBeenCalledWith("/templates.update", {
      id: TEMPLATE_ID,
      collectionId: null,
    });
    expect(toast.success).toHaveBeenCalledWith(MOVED_TOAST);
  });

  it("R30 moves the template to Só você through the personal collection", async () => {
    const template = seed({ collectionId: ENGINEERING_ID });
    vi.mocked(client.post).mockResolvedValue({
      data: { id: TEMPLATE_ID, collectionId: PERSONAL_ID },
      policies: [],
    });
    await openShareSubmenu(template);

    fireEvent.click(option(ONLY_YOU));

    await waitFor(() => expect(template.collectionId).toBe(PERSONAL_ID));
    expect(client.post).toHaveBeenCalledWith("/templates.update", {
      id: TEMPLATE_ID,
      collectionId: PERSONAL_ID,
    });
  });

  it("R31 keeps the old collectionId and shows the error toast when the move is rejected", async () => {
    const template = seed({ collectionId: ENGINEERING_ID });
    vi.mocked(client.post).mockRejectedValue(new Error("Forbidden"));
    await openShareSubmenu(template);

    fireEvent.click(option(WORKSPACE));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(MOVE_FAILED_TOAST)
    );
    expect(template.collectionId).toBe(ENGINEERING_ID);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("R30 does nothing when the checked option is chosen", async () => {
    const template = seed({ collectionId: ENGINEERING_ID });
    await openShareSubmenu(template);

    fireEvent.click(option("Engineering"));

    expect(client.post).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("R30 does not move the template to a disabled collection", async () => {
    const template = seed({ collectionId: ENGINEERING_ID });
    await openShareSubmenu(template);

    fireEvent.click(
      screen.getByRole("menuitemradio", { name: new RegExp(NO_PERMISSION) })
    );

    expect(client.post).not.toHaveBeenCalled();
  });

  it("R31 Duplicar sends templates.duplicate with collectionId personal", async () => {
    const template = seed({ collectionId: null });
    vi.mocked(client.post).mockResolvedValue({
      data: {
        id: "template-2",
        title: "Release checklist",
        urlId: "url-template-2",
        path: "/templates/url-template-2",
        collectionId: PERSONAL_ID,
      },
      policies: [],
    });
    await openMenu(template);

    fireEvent.click(await screen.findByRole("menuitem", { name: "Duplicate" }));

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith(
        "/templates.duplicate",
        expect.objectContaining({
          id: TEMPLATE_ID,
          collectionId: PersonalCollectionId,
        })
      )
    );
  });

  it("R30 moves between options with the arrow keys", async () => {
    const template = seed({ collectionId: ENGINEERING_ID });
    await openShareSubmenu(template);

    const only = option(ONLY_YOU);
    only.focus();
    fireEvent.keyDown(only, { key: "ArrowDown" });

    await waitFor(() =>
      expect(document.activeElement).toBe(option("Engineering"))
    );
  });

  it("R30 closes the submenu with Escape and returns focus to the menu trigger", async () => {
    const template = seed({ collectionId: ENGINEERING_ID });
    await openShareSubmenu(template);

    fireEvent.keyDown(option("Engineering"), { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("menuitemradio", { name: ONLY_YOU })).toBeNull()
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: MENU_TRIGGER })
      )
    );
  });
});
