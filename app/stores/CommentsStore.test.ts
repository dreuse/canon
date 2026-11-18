import stores from "~/stores";

const DOCUMENT_ID = "document-1";
const OTHER_DOCUMENT_ID = "document-2";
const USER_ID = "user-1";
const OPEN_THREADS = 2;
const RESOLVED_THREADS = 3;
const RESOLVED_AT = "2026-01-01T00:00:00.000Z";
const emptyData = { type: "doc", content: [] };

function addComment(id: string, fields: Record<string, unknown> = {}) {
  return stores.comments.add({
    id,
    documentId: DOCUMENT_ID,
    createdById: USER_ID,
    data: emptyData,
    ...fields,
  });
}

describe("CommentsStore thread counts", () => {
  beforeEach(() => {
    stores.comments.clear();
    addComment("open-1");
    addComment("open-1-reply-1", { parentCommentId: "open-1" });
    addComment("open-1-reply-2", { parentCommentId: "open-1" });
    addComment("open-2");
    addComment("open-2-reply-1", { parentCommentId: "open-2" });
    addComment("resolved-1", { resolvedAt: RESOLVED_AT });
    addComment("resolved-2", { resolvedAt: RESOLVED_AT });
    addComment("resolved-3", { resolvedAt: RESOLVED_AT });
    addComment("resolved-3-reply", { parentCommentId: "resolved-3" });
  });

  it("R08 counts open threads, not replies", () => {
    expect(stores.comments.inDocument(DOCUMENT_ID).length).toBeGreaterThan(
      OPEN_THREADS
    );
    expect(stores.comments.unresolvedThreadsInDocumentCount(DOCUMENT_ID)).toBe(
      OPEN_THREADS
    );
  });

  it("R08 counts resolved threads", () => {
    expect(stores.comments.resolvedThreadsInDocumentCount(DOCUMENT_ID)).toBe(
      RESOLVED_THREADS
    );
  });

  it("R08 ignores replies whose root is missing", () => {
    addComment("orphan-reply", { parentCommentId: "deleted-root" });

    expect(stores.comments.unresolvedThreadsInDocumentCount(DOCUMENT_ID)).toBe(
      OPEN_THREADS
    );
    expect(stores.comments.resolvedThreadsInDocumentCount(DOCUMENT_ID)).toBe(
      RESOLVED_THREADS
    );
  });

  it("R08 scopes counts to the document", () => {
    addComment("other-open", { documentId: OTHER_DOCUMENT_ID });

    expect(stores.comments.unresolvedThreadsInDocumentCount(DOCUMENT_ID)).toBe(
      OPEN_THREADS
    );
    expect(
      stores.comments.unresolvedThreadsInDocumentCount(OTHER_DOCUMENT_ID)
    ).toBe(1);
    expect(
      stores.comments.resolvedThreadsInDocumentCount(OTHER_DOCUMENT_ID)
    ).toBe(0);
  });
});
