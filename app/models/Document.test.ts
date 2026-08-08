import Document from "./Document";
import stores from "~/stores";

describe("Document model", () => {
  describe("isStale", () => {
    test("should be false when the collection has no reviewIntervalDays", () => {
      const collection = stores.collections.add({
        id: "collection-no-interval",
        name: "Engineering",
        reviewIntervalDays: null,
      });
      const document = new Document(
        {
          id: "document-no-interval",
          collectionId: collection.id,
          publishedAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 365
          ).toISOString(),
        },
        stores.documents
      );

      expect(document.isStale).toBe(false);
    });

    test("should be false when the reference date is within the interval", () => {
      const collection = stores.collections.add({
        id: "collection-recent",
        name: "Engineering",
        reviewIntervalDays: 30,
      });
      const document = new Document(
        {
          id: "document-recent",
          collectionId: collection.id,
          publishedAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 10
          ).toISOString(),
        },
        stores.documents
      );

      expect(document.isStale).toBe(false);
    });

    test("should be true when publishedAt is older than the interval and verifiedAt is unset", () => {
      const collection = stores.collections.add({
        id: "collection-published-old",
        name: "Engineering",
        reviewIntervalDays: 30,
      });
      const document = new Document(
        {
          id: "document-published-old",
          collectionId: collection.id,
          publishedAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 45
          ).toISOString(),
        },
        stores.documents
      );

      expect(document.isStale).toBe(true);
    });

    test("should prefer verifiedAt over publishedAt as the reference date", () => {
      const collection = stores.collections.add({
        id: "collection-verified",
        name: "Engineering",
        reviewIntervalDays: 30,
      });
      const document = new Document(
        {
          id: "document-verified",
          collectionId: collection.id,
          publishedAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 365
          ).toISOString(),
          verifiedAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 5
          ).toISOString(),
        },
        stores.documents
      );

      expect(document.isStale).toBe(false);
    });

    test("should be false when there is no reference date at all", () => {
      const collection = stores.collections.add({
        id: "collection-no-dates",
        name: "Engineering",
        reviewIntervalDays: 30,
      });
      const document = new Document(
        {
          id: "document-no-dates",
          collectionId: collection.id,
        },
        stores.documents
      );

      expect(document.isStale).toBe(false);
    });
  });
});
