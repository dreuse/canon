import { renderHook } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import type * as React from "react";
import stores from "~/stores";
import { useDocumentMenuAction } from "./useDocumentMenuAction";

const DOCUMENT_ID = "doc-1";
const EDIT_LABEL = "Edit…";
const USER_ID = "user-1";

beforeAll(() => {
  runInAction(() => {
    stores.users.add({ id: USER_ID, name: "Tester" });
    stores.auth.currentUserId = USER_ID;
  });
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <Provider rootStore={stores}>{children}</Provider>;
}

function childNames(onEdit?: () => void) {
  const { result } = renderHook(
    () => useDocumentMenuAction({ documentId: DOCUMENT_ID, onEdit }),
    { wrapper }
  );

  const { children } = result.current();
  const items = Array.isArray(children) ? children : [];

  return items.map((child) => ("name" in child ? child.name : undefined));
}

describe("useDocumentMenuAction", () => {
  it("offers Edit… when the caller edits the entry", () => {
    expect(childNames(vi.fn())).toContain(EDIT_LABEL);
  });

  it("does not offer Edit… otherwise", () => {
    expect(childNames()).not.toContain(EDIT_LABEL);
  });
});
