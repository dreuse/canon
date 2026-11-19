import { act, render, screen, waitFor, within } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { Suspense } from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { Pagination } from "@shared/constants";
import { light } from "@shared/styles/theme";
import { TeamPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { TemplatesRoutes } from "~/routes/templates";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";

vi.mock("~/scenes/Templates/Template", () => ({
  default: () => <div>Template scene</div>,
}));

vi.mock("~/scenes/Templates/TemplateNew", () => ({
  default: () => <div>New template scene</div>,
}));

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const TEAM_ID = "team-1";
const PERSONAL_ID = "collection-personal";
const ENGINEERING_ID = "collection-engineering";
const PRODUCT_ID = "collection-product";
const ARCHIVED_ID = "collection-archived";
const PAGE_SIZE = Pagination.maxLimit;
const EXTRA_TEMPLATES = PAGE_SIZE + 5;
const LIST_PATH = "/templates.list";
const LAZY_LOAD_TIMEOUT = 5000;
const WARM_UP_TIMEOUT = 30000;

const PERSONAL_TITLE = "Release checklist";
const ENGINEERING_TITLE = "Incident runbook";
const PRODUCT_TITLE = "Lean PRD";
const WORKSPACE_TITLE = "Meeting minutes";
const ARCHIVED_TITLE = "Archived template";
const EMPTY_TITLE = "Blank template";
const LONG_TITLE =
  "A very long template title that keeps going and going so that it needs to wrap";
const FIRST_LINE = "Version, notes and rollback plan.";

const MEMBER_ABILITIES = {
  createDocument: true,
  createTemplate: true,
  readTemplate: true,
};

const TEMPLATE_ABILITIES = {
  update: true,
  duplicate: true,
  move: true,
  delete: true,
};

beforeAll(async () => {
  await import("~/scenes/Templates/Templates");
}, WARM_UP_TIMEOUT);

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function templateData(
  id: string,
  title: string,
  collectionId: string | null,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    title,
    urlId: `url-${id}`,
    path: `/settings/templates/${id}`,
    collectionId,
    data: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: FIRST_LINE }],
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    createdBy: { id: OTHER_USER_ID, name: "Rafael Souza" },
    updatedBy: { id: OTHER_USER_ID, name: "Rafael Souza" },
    ...overrides,
  };
}

function defaultTemplates() {
  return [
    templateData("t-personal", PERSONAL_TITLE, PERSONAL_ID, {
      updatedBy: { id: USER_ID, name: "Marina Lopes" },
    }),
    templateData("t-engineering", ENGINEERING_TITLE, ENGINEERING_ID),
    templateData("t-product", PRODUCT_TITLE, PRODUCT_ID),
    templateData("t-workspace", WORKSPACE_TITLE, null),
  ];
}

function seedStores({
  templates = defaultTemplates(),
  personalCollection = true,
  personalDocs = true,
  abilities = MEMBER_ABILITIES,
}: {
  templates?: ReturnType<typeof templateData>[];
  personalCollection?: boolean;
  personalDocs?: boolean;
  abilities?: Record<string, boolean>;
} = {}) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.mocked(client.post).mockImplementation(
    async (path: string, body?: { offset?: number; limit?: number }) => {
      if (path === LIST_PATH) {
        const offset = body?.offset ?? 0;
        const limit = body?.limit ?? PAGE_SIZE;
        return {
          data: templates.slice(offset, offset + limit),
          policies: templates.map((template) => ({
            id: template.id,
            abilities: TEMPLATE_ABILITIES,
          })),
          pagination: { offset, limit, total: templates.length },
        };
      }
      return { data: [], policies: [], pagination: {} };
    }
  );
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
  stores.policies.add({ id: TEAM_ID, abilities });
  [PERSONAL_ID, ENGINEERING_ID, PRODUCT_ID].forEach((id) => {
    stores.policies.add({
      id,
      abilities: { readDocument: true, createDocument: true },
    });
  });
  stores.collections.add({ id: ENGINEERING_ID, name: "Engineering" });
  stores.collections.add({ id: PRODUCT_ID, name: "Product" });
  stores.collections.add({
    id: ARCHIVED_ID,
    name: "Archived",
    archivedAt: new Date().toISOString(),
  });
  if (personalCollection) {
    stores.collections.add({
      id: PERSONAL_ID,
      name: "Personal",
      ownerId: USER_ID,
    });
  }
}

async function renderAt(path: string) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Provider rootStore={stores}>
        <ThemeProvider theme={light}>
          <MemoryRouter initialEntries={[path]}>
            <ActionContextProvider>
              <Suspense fallback={null}>
                <TemplatesRoutes />
              </Suspense>
            </ActionContextProvider>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
  });
  return result;
}

async function renderPage() {
  const result = await renderAt("/templates");
  await screen.findByRole(
    "heading",
    { level: 1, name: "Templates" },
    { timeout: LAZY_LOAD_TIMEOUT }
  );
  return result;
}

function section(name: RegExp) {
  return screen.getByRole("region", { name });
}

describe("Templates page", () => {
  beforeEach(() => {
    seedStores();
  });

  it("R33 renders Meus modelos, Coleções and Espaço de trabalho sections", async () => {
    await renderPage();
    await screen.findByText(PERSONAL_TITLE);

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual([
      "My templates1",
      "Collections2",
      "Workspace templates1",
    ]);
  });

  it("R33 renders the Modelos header with its lead text", async () => {
    await renderPage();
    expect(
      screen.getByText(
        "Ready-made structures for new documents. Yours stay private until you share them."
      )
    ).toBeTruthy();
  });

  it("R29 lists each template in its own section", async () => {
    await renderPage();
    await screen.findByText(PERSONAL_TITLE);

    expect(
      within(section(/My templates/)).getByText(PERSONAL_TITLE)
    ).toBeTruthy();
    expect(
      within(section(/Collections/)).getByText(ENGINEERING_TITLE)
    ).toBeTruthy();
    expect(
      within(section(/Collections/)).getByText(PRODUCT_TITLE)
    ).toBeTruthy();
    expect(
      within(section(/Workspace templates/)).getByText(WORKSPACE_TITLE)
    ).toBeTruthy();
    expect(
      within(section(/My templates/)).queryByText(WORKSPACE_TITLE)
    ).toBeNull();
  });

  it("R33 groups collection templates by collection with a count", async () => {
    await renderPage();
    await screen.findByText(ENGINEERING_TITLE);

    const groups = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(groups).toEqual(["Engineering · 1", "Product · 1"]);
  });

  it("R33 shows each collection's icon in its group heading", async () => {
    await renderPage();
    await screen.findByText(ENGINEERING_TITLE);

    const headings = screen.getAllByRole("heading", { level: 3 });

    expect(headings.map((heading) => !!heading.querySelector("svg"))).toEqual([
      true,
      true,
    ]);
  });

  it("R33 shows the first line of text and no line for an empty template", async () => {
    seedStores({
      templates: [
        templateData("t-text", PERSONAL_TITLE, PERSONAL_ID),
        templateData("t-empty", EMPTY_TITLE, PERSONAL_ID, {
          data: ProsemirrorDataHelper.getEmpty(),
        }),
      ],
    });
    await renderPage();
    await screen.findByText(EMPTY_TITLE);

    expect(screen.getAllByText(FIRST_LINE)).toHaveLength(1);
  });

  it("R33 shows the last editor and Você for the current user", async () => {
    await renderPage();
    await screen.findByText(PERSONAL_TITLE);

    expect(within(section(/My templates/)).getByText(/^You ·/)).toBeTruthy();
    expect(
      within(section(/Workspace templates/)).getByText(/^Rafael Souza ·/)
    ).toBeTruthy();
  });

  it("R33 offers Use and a menu on every card", async () => {
    await renderPage();
    await screen.findByText(WORKSPACE_TITLE);

    expect(screen.getAllByRole("link", { name: "Use" })).toHaveLength(4);
    expect(
      screen.getAllByRole("button", { name: "Template options" })
    ).toHaveLength(4);
  });

  it("R29 Use opens a new document from the template", async () => {
    await renderPage();
    await screen.findByText(PERSONAL_TITLE);

    const link = within(section(/My templates/)).getByRole("link", {
      name: "Use",
    });

    expect(link.getAttribute("href")).toBe(
      `/collection/${PERSONAL_ID}/new?templateId=t-personal`
    );
  });

  it("R33 links each card title to /templates/:id", async () => {
    await renderPage();
    const title = await screen.findByText(WORKSPACE_TITLE);

    expect(title.closest("a")?.getAttribute("href")).toBe(
      "/templates/url-t-workspace"
    );
  });

  it("R33 keeps a long title on the card", async () => {
    seedStores({
      templates: [templateData("t-long", LONG_TITLE, null)],
    });
    await renderPage();

    expect(await screen.findByText(LONG_TITLE)).toBeTruthy();
  });

  it("R33 fetches every page of templates", async () => {
    const many = Array.from({ length: EXTRA_TEMPLATES }, (_, index) =>
      templateData(`t-${index}`, `Workspace ${index}`, null)
    );
    seedStores({ templates: many });
    await renderPage();

    await waitFor(() => {
      expect(
        vi
          .mocked(client.post)
          .mock.calls.some(
            ([path, body]) =>
              path === LIST_PATH &&
              (body as { offset?: number })?.offset === PAGE_SIZE
          )
      ).toBe(true);
    });
    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: "Use" })).toHaveLength(
        EXTRA_TEMPLATES
      );
    });
  });

  it("R33 hides templates of an archived collection", async () => {
    seedStores({
      templates: [
        ...defaultTemplates(),
        templateData("t-archived", ARCHIVED_TITLE, ARCHIVED_ID),
      ],
    });
    await renderPage();
    await screen.findByText(ENGINEERING_TITLE);

    expect(screen.queryByText(ARCHIVED_TITLE)).toBeNull();
  });
});

describe("Templates page without personal templates", () => {
  beforeEach(() => {
    seedStores({
      templates: [
        templateData("t-engineering", ENGINEERING_TITLE, ENGINEERING_ID),
        templateData("t-workspace", WORKSPACE_TITLE, null),
      ],
    });
  });

  it("R33 shows Você ainda não tem modelos when no template is personal", async () => {
    seedStores({
      templates: [templateData("t-workspace", WORKSPACE_TITLE, null)],
    });
    await renderPage();
    await screen.findByText(WORKSPACE_TITLE);

    expect(screen.getByText("You have no templates yet")).toBeTruthy();
    expect(
      screen.getByText(
        "Create a template to repeat the structure of the documents you always write. You can also duplicate a workspace template."
      )
    ).toBeTruthy();
  });

  it("R33 hides Coleções when no collection has templates", async () => {
    seedStores({
      templates: [templateData("t-workspace", WORKSPACE_TITLE, null)],
    });
    await renderPage();
    await screen.findByText(WORKSPACE_TITLE);

    expect(screen.queryByRole("heading", { name: /^Collections/ })).toBeNull();
    expect(
      screen.getByRole("heading", { name: /^Workspace templates/ })
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^My templates/ })).toBeTruthy();
  });

  it("R33 keeps Coleções when a collection has templates", async () => {
    await renderPage();
    await screen.findByText(ENGINEERING_TITLE);

    expect(screen.getByText("You have no templates yet")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^Collections/ })).toBeTruthy();
  });

  it("R33 keeps the workspace section when it has no templates", async () => {
    seedStores({ templates: [] });
    await renderPage();

    expect(
      await screen.findByRole("heading", { name: /^Workspace templates/ })
    ).toBeTruthy();
  });
});

describe("Templates page routes and creation", () => {
  it("R29 Novo modelo opens /templates/new for the personal collection", async () => {
    seedStores();
    await renderPage();

    const link = screen.getByRole("link", { name: "New template" });

    expect(link.getAttribute("href")).toBe(
      `/templates/new?collectionId=${PERSONAL_ID}`
    );
  });

  it("R29 Novo modelo falls back to personal when the collection is not loaded", async () => {
    seedStores({ personalCollection: false });
    await renderPage();

    const link = screen.getByRole("link", { name: "New template" });

    expect(link.getAttribute("href")).toBe(
      "/templates/new?collectionId=personal"
    );
  });

  it("R29 hides Meus modelos and opens the destinations menu when personal documents are off", async () => {
    seedStores({ personalDocs: false });
    await renderPage();
    await screen.findByText(WORKSPACE_TITLE);

    expect(screen.queryByRole("heading", { name: /^My templates/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "New template" })).toBeNull();
    expect(
      screen
        .getByRole("button", { name: /New template/ })
        .getAttribute("aria-haspopup")
    ).toBe("menu");
  });

  it("R29 hides Novo modelo from users who cannot create templates", async () => {
    seedStores({ abilities: { readTemplate: true, createDocument: true } });
    await renderPage();

    expect(screen.queryByRole("link", { name: "New template" })).toBeNull();
  });

  it("R33 renders the moved template scene at /templates/:id", async () => {
    seedStores();
    await renderAt("/templates/url-t-workspace");

    expect(await screen.findByText("Template scene")).toBeTruthy();
  });

  it("R33 renders the new template scene at /templates/new", async () => {
    seedStores();
    await renderAt(`/templates/new?collectionId=${PERSONAL_ID}`);

    expect(await screen.findByText("New template scene")).toBeTruthy();
    expect(screen.queryByText("Template scene")).toBeNull();
  });
});
