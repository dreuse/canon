import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildEvent,
  buildGuestUser,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#events.list", () => {
  it("should only return activity events", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: admin.id,
    });
    const res = await server.post("/api/events.list", user, {
      body: {
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should return audit events", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    const auditEvent = await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: admin.id,
    });
    const res = await server.post("/api/events.list", admin, {
      body: {
        auditLog: true,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].id).toEqual(event.id);
    expect(body.data[1].id).toEqual(auditEvent.id);
  });

  it("should allow filtering by actorId", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    const auditEvent = await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", admin, {
      body: {
        auditLog: true,
        actorId: admin.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(auditEvent.id);
  });

  it("should allow members to filter by actorId in activity mode", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event, never visible in the activity stream
    await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // activity event by the admin, the one the filter should return
    const adminEvent = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: admin.id,
    });
    // activity event by someone else, which the filter should exclude
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", user, {
      body: {
        actorId: admin.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(adminEvent.id);
  });

  it("should not allow members to filter by actorId in audit mode", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    const res = await server.post("/api/events.list", user, {
      body: {
        auditLog: true,
        actorId: admin.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should not allow filtering by an actorId in another team", async () => {
    const user = await buildUser();
    const other = await buildUser();
    const res = await server.post("/api/events.list", user, {
      body: {
        actorId: other.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should not allow filtering by a nonexistent actorId", async () => {
    const user = await buildUser();
    const res = await server.post("/api/events.list", user, {
      body: {
        actorId: "8d1b0a1c-2c1f-4a5e-9c3d-6f7a8b9c0d1e",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow filtering by actorId when it's the current user", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // event by admin
    await buildEvent({
      name: "documents.create",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: admin.id,
    });
    // event by user
    const userEvent = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", user, {
      body: {
        actorId: user.id,
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(userEvent.id);
  });

  it("should allow filtering by documentId", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", admin, {
      body: {
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should not return events for documentId without authorization", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    const actor = await buildUser();
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", actor, {
      body: {
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should allow filtering by event name", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", user, {
      body: {
        name: "documents.publish",
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should allow filtering by events param", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // audit event
    await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });
    // event viewable in activity stream
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    const res = await server.post("/api/events.list", user, {
      body: {
        events: ["documents.publish"],
        collectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should return events with deleted actors", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    // event viewable in activity stream
    const event = await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    await user.destroy({ hooks: false });
    const res = await server.post("/api/events.list", admin);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it("should require authorization for audit events", async () => {
    const user = await buildUser();
    const res = await server.post("/api/events.list", user, {
      body: {
        auditLog: true,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/events.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should not return events for private drafts created by other users", async () => {
    const user1 = await buildUser();
    const user2 = await buildUser({ teamId: user1.teamId });

    // user1 creates a private draft (no collection, not published)
    const privateDraft = await buildDocument({
      userId: user1.id,
      teamId: user1.teamId,
      collectionId: null,
      publishedAt: null,
    });

    // Verify the draft has no collection
    expect(privateDraft.collectionId).toBeNull();
    expect(privateDraft.publishedAt).toBeNull();

    // Event for the private draft (using an ACTIVITY event)
    const draftEvent = await buildEvent({
      name: "documents.delete",
      documentId: privateDraft.id,
      collectionId: null,
      teamId: user1.teamId,
      actorId: user1.id,
    });

    const res = await server.post("/api/events.list", user2);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.map((event: { id: string }) => event.id)).not.toContain(
      draftEvent.id
    );

    // Also verify user2 cannot see the draft when filtering by documentId
    const res2 = await server.post("/api/events.list", user2, {
      body: {
        documentId: privateDraft.id,
      },
    });
    expect(res2.status).toEqual(403);
  });

  it("should not return events for unpublished documents to admins", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });

    // user creates a private draft (no collection, not published)
    const privateDraft = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: null,
      publishedAt: null,
    });

    // Event for the private draft
    const draftEvent = await buildEvent({
      name: "documents.delete",
      documentId: privateDraft.id,
      collectionId: null,
      teamId: user.teamId,
      actorId: user.id,
    });

    // admin lists events
    const res = await server.post("/api/events.list", admin);

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.map((event: { id: string }) => event.id)).not.toContain(
      draftEvent.id
    );
  });

  it("should return events that have no document", async () => {
    const admin = await buildAdmin();
    const member = await buildUser({ teamId: admin.teamId });

    const event = await buildEvent({
      name: "users.demote",
      teamId: admin.teamId,
      actorId: admin.id,
      userId: member.id,
    });

    const res = await server.post("/api/events.list", admin);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.map((item: { id: string }) => item.id)).toContain(
      event.id
    );
  });

  it("should return events for deleted documents", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    const event = await buildEvent({
      name: "documents.delete",
      documentId: document.id,
      collectionId: collection.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    await document.destroy();

    const res = await server.post("/api/events.list", user);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.map((item: { id: string }) => item.id)).toContain(
      event.id
    );
  });

  it("should return an empty list for a user with no collections", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });
    const privateCollection = await buildCollection({
      userId: other.id,
      teamId: user.teamId,
      permission: null,
    });
    const privateDocument = await buildDocument({
      userId: other.id,
      collectionId: privateCollection.id,
      teamId: user.teamId,
    });
    await buildEvent({
      name: "revisions.create",
      documentId: privateDocument.id,
      collectionId: null,
      teamId: user.teamId,
      actorId: other.id,
    });

    const res = await server.post("/api/events.list", user);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data).toEqual([]);
  });

  it("should scope events to the collections a non-admin can access", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });

    const readableCollection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const readableDocument = await buildDocument({
      userId: user.id,
      collectionId: readableCollection.id,
      teamId: user.teamId,
    });
    const readableEvent = await buildEvent({
      name: "revisions.create",
      documentId: readableDocument.id,
      collectionId: null,
      teamId: user.teamId,
      actorId: user.id,
    });

    const privateCollection = await buildCollection({
      userId: other.id,
      teamId: user.teamId,
      permission: null,
    });
    const privateDocument = await buildDocument({
      userId: other.id,
      collectionId: privateCollection.id,
      teamId: user.teamId,
    });
    const privateEvent = await buildEvent({
      name: "revisions.create",
      documentId: privateDocument.id,
      collectionId: null,
      teamId: user.teamId,
      actorId: other.id,
    });

    const res = await server.post("/api/events.list", user);
    const body = await res.json();
    const eventIds = body.data.map((event: { id: string }) => event.id);

    expect(res.status).toEqual(200);
    expect(eventIds).toContain(readableEvent.id);
    expect(eventIds).not.toContain(privateEvent.id);
  });

  it("should return events across the workspace for admins", async () => {
    const admin = await buildAdmin();
    const other = await buildUser({ teamId: admin.teamId });

    const privateCollection = await buildCollection({
      userId: other.id,
      teamId: admin.teamId,
      permission: null,
    });
    const privateDocument = await buildDocument({
      userId: other.id,
      collectionId: privateCollection.id,
      teamId: admin.teamId,
    });
    const privateEvent = await buildEvent({
      name: "revisions.create",
      documentId: privateDocument.id,
      collectionId: null,
      teamId: admin.teamId,
      actorId: other.id,
    });

    const res = await server.post("/api/events.list", admin);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.map((event: { id: string }) => event.id)).toContain(
      privateEvent.id
    );
  });

  it("should allow non-admins to list events when collectionId is specified", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });

    const event = await buildEvent({
      name: "documents.publish",
      documentId: document.id,
      collectionId: collection.id,
      teamId: user.teamId,
      actorId: user.id,
    });

    // user lists events for their collection
    const res = await server.post("/api/events.list", user, {
      body: {
        collectionId: collection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });
});

describe("#events.counts", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/events.counts");
    expect(res.status).toEqual(401);
  });

  it("should allow a member to count a teammate's activity", async () => {
    const user = await buildUser();
    const actor = await buildUser({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: actor.id,
    });

    const res = await server.post("/api/events.counts", user, {
      body: { actorId: actor.id, timezone: "UTC" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.total).toEqual(1);
    expect(body.data.stats.documentsPublished).toEqual(1);
  });

  it("should reject an actor in another team", async () => {
    const user = await buildUser();
    const other = await buildUser();
    const res = await server.post("/api/events.counts", user, {
      body: { actorId: other.id, timezone: "UTC" },
    });
    expect(res.status).toEqual(403);
  });

  it("should reject a nonexistent actor without revealing it", async () => {
    const user = await buildUser();
    const res = await server.post("/api/events.counts", user, {
      body: {
        actorId: "8d1b0a1c-2c1f-4a5e-9c3d-6f7a8b9c0d1e",
        timezone: "UTC",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should reject a guest", async () => {
    const guest = await buildGuestUser();
    const actor = await buildUser({ teamId: guest.teamId });
    const res = await server.post("/api/events.counts", guest, {
      body: { actorId: actor.id, timezone: "UTC" },
    });
    expect(res.status).toEqual(403);
  });

  it("should not count events in collections the requester cannot see", async () => {
    const user = await buildUser();
    const actor = await buildUser({ teamId: user.teamId });
    const collection = await buildCollection({
      userId: actor.id,
      teamId: user.teamId,
      permission: null,
    });
    const document = await buildDocument({
      userId: actor.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: actor.id,
    });

    const res = await server.post("/api/events.counts", user, {
      body: { actorId: actor.id, timezone: "UTC" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.total).toEqual(0);
  });

  it("should not count events on unpublished documents", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const draft = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
      publishedAt: null,
    });
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: draft.id,
      teamId: user.teamId,
      actorId: user.id,
    });

    const res = await server.post("/api/events.counts", user, {
      body: { actorId: user.id, timezone: "UTC" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.total).toEqual(0);
  });

  it("should never count audit-only events", async () => {
    const user = await buildUser();
    const admin = await buildAdmin({ teamId: user.teamId });
    await buildEvent({
      name: "users.promote",
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });

    const res = await server.post("/api/events.counts", user, {
      body: { actorId: admin.id, timezone: "UTC" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.total).toEqual(0);
  });

  it("buckets an event into the requester's timezone, not UTC", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
      createdAt: new Date("2026-01-01T02:00:00Z"),
    });

    const inSaoPaulo = await server.post("/api/events.counts", user, {
      body: {
        actorId: user.id,
        timezone: "America/Sao_Paulo",
        days: 366,
      },
    });
    const saoPaulo = await inSaoPaulo.json();
    const saoPauloDay = saoPaulo.data.days.find(
      (day: { date: string; count: number }) => day.count > 0
    );

    const inUtc = await server.post("/api/events.counts", user, {
      body: { actorId: user.id, timezone: "UTC", days: 366 },
    });
    const utc = await inUtc.json();
    const utcDay = utc.data.days.find(
      (day: { date: string; count: number }) => day.count > 0
    );

    expect(saoPauloDay.date).toEqual("2025-12-31");
    expect(utcDay.date).toEqual("2026-01-01");
  });

  it("returns a zero-filled, ascending, gapless window", async () => {
    const user = await buildUser();
    const res = await server.post("/api/events.counts", user, {
      body: { actorId: user.id, timezone: "UTC", days: 30 },
    });
    const body = await res.json();
    const days: { date: string; count: number }[] = body.data.days;

    expect(res.status).toEqual(200);
    expect(days.length).toEqual(30);
    expect(days.every((day) => day.count === 0)).toBe(true);

    days.forEach((day, index) => {
      if (index === 0) {
        return;
      }
      const previous = Date.parse(`${days[index - 1].date}T00:00:00Z`);
      const expected = new Date(previous + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      expect(day.date).toEqual(expected);
    });
  });

  it("keeps the totals consistent with the daily counts", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: user.teamId,
    });
    await buildEvent({
      name: "revisions.create",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });
    await buildEvent({
      name: "documents.publish",
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });

    const res = await server.post("/api/events.counts", user, {
      body: { actorId: user.id, timezone: "UTC" },
    });
    const body = await res.json();
    const summed = body.data.days.reduce(
      (total: number, day: { count: number }) => total + day.count,
      0
    );

    expect(body.data.stats.total).toEqual(summed);
    expect(body.data.stats.edits).toEqual(1);
    expect(body.data.stats.documentsPublished).toEqual(1);
  });

  it("rejects a malformed timezone", async () => {
    const user = await buildUser();

    for (const timezone of [
      "Not/AZone",
      "'; DROP TABLE events; --",
      "+05:00",
    ]) {
      const res = await server.post("/api/events.counts", user, {
        body: { actorId: user.id, timezone },
      });
      expect(res.status).toEqual(400);
    }

    const after = await server.post("/api/events.counts", user, {
      body: { actorId: user.id, timezone: "UTC" },
    });
    expect(after.status).toEqual(200);
  });

  it("rejects an out of range window", async () => {
    const user = await buildUser();

    for (const days of [0, 400]) {
      const res = await server.post("/api/events.counts", user, {
        body: { actorId: user.id, timezone: "UTC", days },
      });
      expect(res.status).toEqual(400);
    }
  });
});
