import { sectionPriorityOffset } from "~/actions";
import { RecentSection, SearchResultsSection } from "~/actions/sections";
import {
  groupPaletteResults,
  paletteDivider,
  searchActionId,
} from "./sections";

const labels = { documents: "Documents", commands: "Commands" };
const openDocumentId = "open-document";
const options = { labels, documentParentIds: [openDocumentId] };

interface Row {
  id: string;
  parent?: string;
  section?: { name: string; priority: number };
}

const row = (id: string, section?: Row["section"], parent?: string): Row => ({
  id,
  section,
  parent,
});
const item = (id: string) => row(id, { name: "Navigation", priority: 10 });
const searchResult = (key: string) =>
  row(`search-result:${key}`, {
    name: "Search results",
    priority: sectionPriorityOffset + SearchResultsSection.priority,
  });
const recentDocument = (key: string) =>
  row(`recent-doc:${key}`, {
    name: "Recently viewed",
    priority: sectionPriorityOffset + RecentSection.priority,
  });
const openDocumentChild = (path: string) =>
  row(path, { name: "Document", priority: 10 }, openDocumentId);
const ids = (results: (string | { id: string })[]) =>
  results.map((result) => (typeof result === "string" ? result : result.id));

describe("groupPaletteResults", () => {
  const mixed = [
    "Navigation",
    item("nav-home"),
    "Search results",
    searchResult("/doc/a"),
    searchResult("/doc/b"),
    item(searchActionId),
    "Recently viewed",
    recentDocument("/doc/c"),
    item("new-document"),
  ];

  it("R06 puts documents first, then commands, then a divider and the full search row", () => {
    expect(ids(groupPaletteResults(mixed, "webhook", options))).toEqual([
      "Documents",
      "search-result:/doc/a",
      "search-result:/doc/b",
      "recent-doc:/doc/c",
      "Commands",
      "nav-home",
      "new-document",
      paletteDivider,
      searchActionId,
    ]);
  });

  it("R06 ends with the full search row and no divider when nothing else matches", () => {
    expect(
      ids(groupPaletteResults([item(searchActionId)], "webhook", options))
    ).toEqual([searchActionId]);
  });

  it("R06 omits a group header when the group is empty", () => {
    expect(
      ids(
        groupPaletteResults(
          [searchResult("/doc/a"), item(searchActionId)],
          "webhook",
          options
        )
      )
    ).toEqual([
      "Documents",
      "search-result:/doc/a",
      paletteDivider,
      searchActionId,
    ]);
  });

  it("R06 adds no divider when there is no full search row", () => {
    expect(
      ids(groupPaletteResults([searchResult("/doc/a")], "webhook", options))
    ).toEqual(["Documents", "search-result:/doc/a"]);
  });

  it("R06 keeps shared search and shared recent documents in the documents group", () => {
    expect(
      ids(
        groupPaletteResults(
          [
            item("nav-home"),
            row("shared-search:a", {
              name: "Search results",
              priority: sectionPriorityOffset + SearchResultsSection.priority,
            }),
            row("shared-recent-doc:b", {
              name: "Recently viewed",
              priority: sectionPriorityOffset + RecentSection.priority,
            }),
          ],
          "webhook",
          options
        )
      )
    ).toEqual([
      "Documents",
      "shared-search:a",
      "shared-recent-doc:b",
      "Commands",
      "nav-home",
    ]);
  });

  it("R06 groups flattened open document children under documents", () => {
    expect(
      ids(
        groupPaletteResults(
          [item("nav-home"), openDocumentChild("/doc/a")],
          "webhook",
          options
        )
      )
    ).toEqual(["Documents", "/doc/a", "Commands", "nav-home"]);
  });

  it("R06 keeps children of other parents under commands", () => {
    expect(
      ids(
        groupPaletteResults(
          [row("/collection/a", item("x").section, "open-collection")],
          "webhook",
          options
        )
      )
    ).toEqual(["Commands", "/collection/a"]);
  });

  it("R06 shows a document once and prefers the search result row", () => {
    expect(
      ids(
        groupPaletteResults(
          [
            recentDocument("/doc/a"),
            openDocumentChild("/doc/a"),
            searchResult("/doc/a"),
            openDocumentChild("/doc/b"),
          ],
          "webhook",
          options
        )
      )
    ).toEqual(["Documents", "search-result:/doc/a", "/doc/b"]);
  });

  it("R06 keeps recent and open document rows for different documents", () => {
    expect(
      ids(
        groupPaletteResults(
          [recentDocument("/doc/a"), openDocumentChild("/doc/b")],
          "webhook",
          options
        )
      )
    ).toEqual(["Documents", "recent-doc:/doc/a", "/doc/b"]);
  });

  it("R06 does not cap the commands group", () => {
    const commands = Array.from({ length: 12 }, (_, i) => item(`command-${i}`));

    expect(groupPaletteResults(commands, "c", options)).toHaveLength(13);
  });

  it("R06 leaves results untouched inside a sub-menu", () => {
    const children = [item("light"), item("dark")];

    expect(
      groupPaletteResults(children, "webhook", {
        ...options,
        rootActionId: "set-theme",
      })
    ).toBe(children);
  });

  it("R06 leaves results untouched for an empty query", () => {
    expect(groupPaletteResults(mixed, "", options)).toBe(mixed);
    expect(groupPaletteResults(mixed, "   ", options)).toBe(mixed);
  });

  it("R06 returns no rows when nothing matches", () => {
    expect(groupPaletteResults([], "webhook", options)).toEqual([]);
  });
});
