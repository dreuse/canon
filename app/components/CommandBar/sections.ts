import { sectionPriorityOffset } from "~/actions";
import { RecentSection, SearchResultsSection } from "~/actions/sections";

export const searchActionId = "search";

export const paletteDivider = "palette-divider";

const searchResultPriority =
  sectionPriorityOffset + SearchResultsSection.priority;

const recentPriority = sectionPriorityOffset + RecentSection.priority;

const documentKeySeparator = ":";

interface PaletteRow {
  id: string;
  parent?: string;
  section?: string | { name: string; priority: number };
}

interface PaletteOptions {
  labels: { documents: string; commands: string };
  documentParentIds: string[];
  rootActionId?: string | null;
}

/**
 * Regroups command bar matches into the palette layout: documents, commands,
 * then a divider and the row that opens the full search page. Results for an
 * empty query, or inside a sub-menu, keep their original layout.
 *
 * @param results the matches from the command bar, headers included.
 * @param query the current search query.
 * @param options the translated group headers, the ids of actions whose
 * children are documents, and the sub-menu the command bar is in, if any.
 * @returns the rows to render, with group headers and the divider as strings.
 */
export function groupPaletteResults<T extends PaletteRow>(
  results: (string | T)[],
  query: string,
  { labels, documentParentIds, rootActionId }: PaletteOptions
): (string | T)[] {
  if (rootActionId || !query.trim()) {
    return results;
  }

  const rows = results.filter(
    (result): result is T => typeof result !== "string"
  );
  const searchAction = rows.find((row) => row.id === searchActionId);
  const others = rows.filter((row) => row !== searchAction);
  const isDocument = (row: T) =>
    [searchResultPriority, recentPriority].includes(sectionPriority(row)) ||
    documentParentIds.includes(row.parent ?? "");
  const isSearchResult = (row: T) =>
    sectionPriority(row) === searchResultPriority;
  const documentRows = others.filter(isDocument);
  const seen = new Set<string>();
  const documents = [
    ...documentRows.filter(isSearchResult),
    ...documentRows.filter((row) => !isSearchResult(row)),
  ].filter((row) => {
    const key = documentKey(row.id);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  const commands = others.filter((row) => !isDocument(row));
  const groups = [
    ...(documents.length ? [labels.documents, ...documents] : []),
    ...(commands.length ? [labels.commands, ...commands] : []),
  ];

  if (!searchAction) {
    return groups;
  }

  return [...groups, ...(groups.length ? [paletteDivider] : []), searchAction];
}

function sectionPriority(row: PaletteRow) {
  return typeof row.section === "object" ? row.section.priority : NaN;
}

function documentKey(id: string) {
  return id.slice(id.indexOf(documentKeySeparator) + 1);
}
