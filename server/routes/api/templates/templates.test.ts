import { CollectionPermission, TeamPreference, UserRole } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { Collection, Template, UserMembership } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildGuestUser,
  buildPersonalCollection,
  buildTeam,
  buildTemplate,
  buildUser,
  buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#templates.list", () => {
  it("should list templates", async () => {
    const user = await buildUser();
    await buildTemplate(); // create a template that shouldn't be included

    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.list", user);

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(template.id);
  });

  it("should list the user's own drafts", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      publishedAt: null,
    });

    const res = await server.post("/api/templates.list", user);

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(template.id);
  });

  it("should not list drafts created by another user", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });
    await buildTemplate({
      userId: other.id,
      teamId: user.teamId,
      collectionId: null,
      publishedAt: null,
    });

    const res = await server.post("/api/templates.list", user);

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it("should return an empty document for templates without content", async () => {
    const user = await buildUser();
    await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      content: null,
    });

    const res = await server.post("/api/templates.list", user);

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data[0].data).toEqual(ProsemirrorDataHelper.getEmpty());
  });

  it("should list templates in collection", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });

    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
    });

    const res = await server.post("/api/templates.list", user, {
      body: {
        collectionId: collection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(template.id);
  });

  it("should filter templates by query", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      title: "Meeting notes",
    });
    await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      title: "Project plan",
    });

    const res = await server.post("/api/templates.list", user, {
      body: {
        query: "meeting",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(template.id);
    expect(body.pagination.total).toEqual(1);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.list");
    expect(res.status).toEqual(401);
  });
});

describe("#templates.create", () => {
  it("should publish by default", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/templates.create", admin, {
      body: {
        title: "My template",
        data: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "hello" }],
            },
          ],
        },
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.publishedAt).toBeTruthy();
  });

  it("should not publish a template without content", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/templates.create", admin, {
      body: {
        title: "My template",
        data: ProsemirrorDataHelper.getEmpty(),
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should create an empty draft when publish is false", async () => {
    const admin = await buildAdmin();

    const res = await server.post("/api/templates.create", admin, {
      body: {
        title: "",
        publish: false,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toEqual("");
    expect(body.data.publishedAt).toEqual(null);
  });
});

describe("#templates.info", () => {
  it("should return template data", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.info", user, {
      body: {
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(template.id);
    expect(body.data.title).toEqual(template.title);
  });

  it("should return a draft to the user that created it", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      publishedAt: null,
    });

    const res = await server.post("/api/templates.info", user, {
      body: {
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(template.id);
  });

  it("should not return a draft created by another user", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });
    const template = await buildTemplate({
      userId: other.id,
      teamId: user.teamId,
      collectionId: null,
      publishedAt: null,
    });

    const res = await server.post("/api/templates.info", user, {
      body: {
        id: template.id,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.info");
    expect(res.status).toEqual(401);
  });

  it("should fail for invalid template id", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.info", user, {
      body: {
        id: "invalid",
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#templates.update", () => {
  it("should accept an empty document while drafting", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      publishedAt: null,
    });

    const res = await server.post("/api/templates.update", user, {
      body: {
        id: template.id,
        title: "Still writing",
        data: ProsemirrorDataHelper.getEmpty(),
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toEqual("Still writing");
  });

  it("should not publish a draft without content", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      content: ProsemirrorDataHelper.getEmpty(),
      publishedAt: null,
    });

    const res = await server.post("/api/templates.update", user, {
      body: {
        id: template.id,
        publish: true,
      },
    });

    expect(res.status).toEqual(400);
  });

  it("should publish a draft when publish is true", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      publishedAt: null,
    });

    const res = await server.post("/api/templates.update", user, {
      body: {
        id: template.id,
        publish: true,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.publishedAt).toBeTruthy();
  });

  it("should update template title", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      title: "Original title",
    });

    const res = await server.post("/api/templates.update", user, {
      body: {
        id: template.id,
        title: "New title",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toEqual("New title");
  });

  it("should update template content", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      text: "Original content",
    });

    const data = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "hello",
            },
          ],
        },
      ],
    };

    const res = await server.post("/api/templates.update", user, {
      body: {
        id: template.id,
        data,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.data).toEqual(data);
  });

  it("should allow admin to move template to another accessible collection", async () => {
    const admin = await buildAdmin();
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const targetCollection = await buildCollection({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/templates.update", admin, {
      body: {
        id: template.id,
        collectionId: targetCollection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.collectionId).toEqual(targetCollection.id);
  });

  it("should not allow moving template to a collection user has no access to", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    // Collection created by another user with no default permission
    const inaccessibleCollection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });

    const res = await server.post("/api/templates.update", user, {
      body: {
        id: template.id,
        collectionId: inaccessibleCollection.id,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should not allow non-admin to move template to workspace scope", async () => {
    const admin = await buildAdmin();
    // Create template as admin so the non-admin user's team has it
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    // Create a non-admin member on the same team who has collection access
    // but is not a team admin
    const user = await buildUser({ teamId: admin.teamId });

    const res = await server.post("/api/templates.update", user, {
      body: {
        id: template.id,
        collectionId: null,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should allow admin to move template to workspace scope", async () => {
    const admin = await buildAdmin();
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/templates.update", admin, {
      body: {
        id: template.id,
        collectionId: null,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.collectionId).toBeNull();
  });

  it("should fail with status 400 bad request when id is missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.update", user, {
      body: {
        title: "New title",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Must be a valid UUID or slug");
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.update");
    expect(res.status).toEqual(401);
  });
});

describe("#templates.duplicate", () => {
  it("should duplicate template", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      title: "test",
    });

    const res = await server.post("/api/templates.duplicate", user, {
      body: {
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(template.id);
    expect(body.data.title).toEqual(template.title);
    expect(body.data.data).toEqual(template.content);
  });

  it("should duplicate template with new title", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.duplicate", user, {
      body: {
        id: template.id,
        title: "New title",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(template.id);
    expect(body.data.title).toEqual("New title");
    expect(body.data.data).toEqual(template.content);
  });

  it("should allow admin to duplicate to another accessible collection", async () => {
    const admin = await buildAdmin();
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const targetCollection = await buildCollection({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/templates.duplicate", admin, {
      body: {
        id: template.id,
        collectionId: targetCollection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.collectionId).toEqual(targetCollection.id);
  });

  it("should not allow duplicating to a collection user has no access to", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    // Collection created by another user with no default permission
    const inaccessibleCollection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });

    const res = await server.post("/api/templates.duplicate", user, {
      body: {
        id: template.id,
        collectionId: inaccessibleCollection.id,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should allow a member to duplicate to workspace scope", async () => {
    const admin = await buildAdmin();
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const user = await buildUser({ teamId: admin.teamId });

    const res = await server.post("/api/templates.duplicate", user, {
      body: {
        id: template.id,
        collectionId: null,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.collectionId).toBeNull();
  });

  it("should allow admin to duplicate to workspace scope", async () => {
    const admin = await buildAdmin();
    const template = await buildTemplate({
      userId: admin.id,
      teamId: admin.teamId,
    });

    const res = await server.post("/api/templates.duplicate", admin, {
      body: {
        id: template.id,
        collectionId: null,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.collectionId).toBeNull();
  });

  it("should set publishedAt on duplicated template", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.duplicate", user, {
      body: {
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.publishedAt).toBeTruthy();
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.duplicate");
    expect(res.status).toEqual(401);
  });

  it("should fail for invalid template id", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.duplicate", user, {
      body: {
        id: "invalid",
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#templates.delete", () => {
  it("should delete template", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.delete", user, {
      body: {
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it("should fail with status 400 bad request when id is missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.delete", user);
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Must be a valid UUID or slug");
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.delete");
    expect(res.status).toEqual(401);
  });
});

describe("templateManagement", () => {
  describe("#templates.create", () => {
    it("should allow member to create template when memberTemplateManagement is enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });

      const res = await server.post("/api/templates.create", member, {
        body: {
          collectionId: collection.id,
          title: "Member template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.title).toEqual("Member template");
      expect(body.data.collectionId).toEqual(collection.id);
    });

    it("should not allow member to create template when memberTemplateManagement is disabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });

      const member = await buildUser({ teamId: admin.teamId });

      const res = await server.post("/api/templates.create", member, {
        body: {
          collectionId: collection.id,
          title: "Member template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      expect(res.status).toEqual(403);
    });

    it("should allow member with explicit read_write membership to create template when enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        permission: null,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      await UserMembership.create({
        createdById: admin.id,
        collectionId: collection.id,
        userId: member.id,
        permission: CollectionPermission.ReadWrite,
      });

      const res = await server.post("/api/templates.create", member, {
        body: {
          collectionId: collection.id,
          title: "Member template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.title).toEqual("Member template");
    });

    it("should not allow read-only member to create template even when enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        permission: null,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      await UserMembership.create({
        createdById: admin.id,
        collectionId: collection.id,
        userId: member.id,
        permission: CollectionPermission.Read,
      });

      const res = await server.post("/api/templates.create", member, {
        body: {
          collectionId: collection.id,
          title: "Member template",
          data: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });

      expect(res.status).toEqual(403);
    });
  });

  describe("#templates.update", () => {
    it("should allow member to update template when memberTemplateManagement is enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.update", member, {
        body: {
          id: template.id,
          title: "Updated by member",
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.title).toEqual("Updated by member");
    });

    it("should not allow member to update template when memberTemplateManagement is disabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.update", member, {
        body: {
          id: template.id,
          title: "Updated by member",
        },
      });

      expect(res.status).toEqual(403);
    });
  });

  describe("#templates.duplicate", () => {
    it("should allow member to duplicate template when memberTemplateManagement is enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.duplicate", member, {
        body: {
          id: template.id,
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.collectionId).toEqual(collection.id);
    });

    it("should not allow member to duplicate template when memberTemplateManagement is disabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.duplicate", member, {
        body: {
          id: template.id,
        },
      });

      expect(res.status).toEqual(403);
    });
  });

  describe("#templates.restore", () => {
    it("should allow member to restore template when memberTemplateManagement is enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });
      await template.destroy();

      const res = await server.post("/api/templates.restore", member, {
        body: {
          id: template.id,
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.id).toEqual(template.id);
    });

    it("should not allow member to restore template when memberTemplateManagement is disabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });
      await template.destroy();

      const res = await server.post("/api/templates.restore", member, {
        body: {
          id: template.id,
        },
      });

      expect(res.status).toEqual(403);
    });
  });

  describe("#templates.delete", () => {
    it("should allow member to delete template when memberTemplateManagement is enabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.ReadWrite,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.delete", member, {
        body: {
          id: template.id,
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.success).toEqual(true);
    });

    it("should not allow member to delete template when memberTemplateManagement is disabled", async () => {
      const admin = await buildAdmin();
      const collection = await buildCollection({
        userId: admin.id,
        teamId: admin.teamId,
        templateManagement: CollectionPermission.Admin,
      });

      const member = await buildUser({ teamId: admin.teamId });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: admin.teamId,
        collectionId: collection.id,
      });

      const res = await server.post("/api/templates.delete", member, {
        body: {
          id: template.id,
        },
      });

      expect(res.status).toEqual(403);
    });
  });
});

const templateData = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
};

async function buildPersonalDocsTeam() {
  const team = await buildTeam();
  team.setPreference(TeamPreference.PersonalDocs, true);
  await team.save();
  return team;
}

describe("personal templates", () => {
  describe("#templates.create", () => {
    it("R29 lets the owner create in their personal collection while another member and an admin get 403", async () => {
      const team = await buildPersonalDocsTeam();
      const owner = await buildUser({ teamId: team.id });
      const other = await buildUser({ teamId: team.id });
      const admin = await buildAdmin({ teamId: team.id });
      const personal = await buildPersonalCollection(owner);
      const body = {
        collectionId: personal.id,
        title: "Mine",
        data: templateData,
      };

      const ownerRes = await server.post("/api/templates.create", owner, {
        body,
      });
      const otherRes = await server.post("/api/templates.create", other, {
        body,
      });
      const adminRes = await server.post("/api/templates.create", admin, {
        body,
      });

      expect(ownerRes.status).toEqual(200);
      expect((await ownerRes.json()).data.collectionId).toEqual(personal.id);
      expect(otherRes.status).toEqual(403);
      expect(adminRes.status).toEqual(403);
    });

    it("R29 creates the personal collection for collectionId personal before it exists", async () => {
      const team = await buildPersonalDocsTeam();
      const owner = await buildUser({ teamId: team.id });
      expect(await Collection.count({ where: { ownerId: owner.id } })).toEqual(
        0
      );

      const res = await server.post("/api/templates.create", owner, {
        body: { collectionId: "personal", title: "First", data: templateData },
      });
      const body = await res.json();

      expect(res.status).toEqual(200);
      const personal = await Collection.findOne({
        where: { ownerId: owner.id },
        rejectOnEmpty: true,
      });
      expect(body.data.collectionId).toEqual(personal.id);
    });

    it("R29 refuses the owner after demotion to viewer", async () => {
      const team = await buildPersonalDocsTeam();
      const owner = await buildUser({ teamId: team.id });
      const personal = await buildPersonalCollection(owner);
      const body = {
        collectionId: personal.id,
        title: "Mine",
        data: templateData,
      };

      const before = await server.post("/api/templates.create", owner, {
        body,
      });
      await owner.update({ role: UserRole.Viewer });
      const after = await server.post("/api/templates.create", owner, {
        body,
      });

      expect(before.status).toEqual(200);
      expect(after.status).toEqual(403);
    });

    it("R29 refuses the owner when personal documents are off", async () => {
      const team = await buildPersonalDocsTeam();
      const owner = await buildUser({ teamId: team.id });
      const personal = await buildPersonalCollection(owner);
      const body = {
        collectionId: personal.id,
        title: "Mine",
        data: templateData,
      };

      const before = await server.post("/api/templates.create", owner, {
        body,
      });
      team.setPreference(TeamPreference.PersonalDocs, false);
      await team.save();
      const after = await server.post("/api/templates.create", owner, {
        body,
      });

      expect(before.status).toEqual(200);
      expect(after.status).toEqual(403);
    });
  });

  describe("visibility", () => {
    it("R29 lists and returns a personal template for its owner only", async () => {
      const team = await buildPersonalDocsTeam();
      const owner = await buildUser({ teamId: team.id });
      const other = await buildUser({ teamId: team.id });
      const admin = await buildAdmin({ teamId: team.id });
      const personal = await buildPersonalCollection(owner);
      const template = await buildTemplate({
        userId: owner.id,
        teamId: team.id,
        collectionId: personal.id,
      });

      const lists = await Promise.all(
        [owner, other, admin].map(async (user) =>
          (await server.post("/api/templates.list", user)).json()
        )
      );
      const infos = await Promise.all(
        [owner, other, admin].map((user) =>
          server.post("/api/templates.info", user, {
            body: { id: template.id },
          })
        )
      );

      expect(lists[0].data.map((t: { id: string }) => t.id)).toEqual([
        template.id,
      ]);
      expect(lists[1].data).toEqual([]);
      expect(lists[2].data).toEqual([]);
      expect(infos[0].status).toEqual(200);
      expect(infos[1].status).toEqual(403);
      expect(infos[2].status).toEqual(403);
    });

    it("R32 keeps a draft personal template visible only to its author", async () => {
      const team = await buildPersonalDocsTeam();
      const owner = await buildUser({ teamId: team.id });
      const admin = await buildAdmin({ teamId: team.id });
      const personal = await buildPersonalCollection(owner);
      const template = await buildTemplate({
        userId: owner.id,
        teamId: team.id,
        collectionId: personal.id,
        publishedAt: null,
      });

      const ownerList = await (
        await server.post("/api/templates.list", owner)
      ).json();
      const adminList = await (
        await server.post("/api/templates.list", admin)
      ).json();
      const adminInfo = await server.post("/api/templates.info", admin, {
        body: { id: template.id },
      });

      expect(ownerList.data.map((t: { id: string }) => t.id)).toEqual([
        template.id,
      ]);
      expect(adminList.data).toEqual([]);
      expect(adminInfo.status).toEqual(403);
    });

    it("R29 stops an admin from updating or deleting another user's personal template", async () => {
      const team = await buildPersonalDocsTeam();
      const owner = await buildUser({ teamId: team.id });
      const admin = await buildAdmin({ teamId: team.id });
      const personal = await buildPersonalCollection(owner);
      const template = await buildTemplate({
        userId: owner.id,
        teamId: team.id,
        collectionId: personal.id,
      });

      const ownerUpdate = await server.post("/api/templates.update", owner, {
        body: { id: template.id, title: "Renamed" },
      });
      const adminUpdate = await server.post("/api/templates.update", admin, {
        body: { id: template.id, title: "Hijacked" },
      });
      const adminDelete = await server.post("/api/templates.delete", admin, {
        body: { id: template.id },
      });

      expect(ownerUpdate.status).toEqual(200);
      expect(adminUpdate.status).toEqual(403);
      expect(adminDelete.status).toEqual(403);
    });
  });

  describe("workspace templates", () => {
    it("R31 lets a member create a workspace template while a viewer and a guest get 403", async () => {
      const team = await buildPersonalDocsTeam();
      const member = await buildUser({ teamId: team.id });
      const viewer = await buildViewer({ teamId: team.id });
      const guest = await buildGuestUser({ teamId: team.id });
      const body = { title: "Shared", data: templateData };

      const memberRes = await server.post("/api/templates.create", member, {
        body,
      });
      const viewerRes = await server.post("/api/templates.create", viewer, {
        body,
      });
      const guestRes = await server.post("/api/templates.create", guest, {
        body,
      });

      expect(memberRes.status).toEqual(200);
      expect((await memberRes.json()).data.collectionId).toBeNull();
      expect(viewerRes.status).toEqual(403);
      expect(guestRes.status).toEqual(403);
    });

    it("R31 lets a member templatize a document into the workspace while a viewer gets 403", async () => {
      const team = await buildPersonalDocsTeam();
      const member = await buildUser({ teamId: team.id });
      const viewer = await buildViewer({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: member.id,
      });
      const document = await buildDocument({
        teamId: team.id,
        userId: member.id,
        collectionId: collection.id,
      });

      const memberRes = await server.post("/api/documents.templatize", member, {
        body: { id: document.id, publish: true },
      });
      const viewerRes = await server.post("/api/documents.templatize", viewer, {
        body: { id: document.id, publish: true },
      });

      expect(memberRes.status).toEqual(200);
      expect((await memberRes.json()).data.collectionId).toBeNull();
      expect(viewerRes.status).toEqual(403);
    });

    it("R30 lets a member move their personal template to the workspace", async () => {
      const team = await buildPersonalDocsTeam();
      const member = await buildUser({ teamId: team.id });
      const personal = await buildPersonalCollection(member);
      const template = await buildTemplate({
        userId: member.id,
        teamId: team.id,
        collectionId: personal.id,
      });

      const res = await server.post("/api/templates.update", member, {
        body: { id: template.id, collectionId: null },
      });
      const body = await res.json();

      expect(res.status).toEqual(200);
      expect(body.data.collectionId).toBeNull();
    });

    it("R30 refuses a viewer who owns a personal template moving it to the workspace", async () => {
      const team = await buildPersonalDocsTeam();
      const owner = await buildUser({ teamId: team.id });
      const personal = await buildPersonalCollection(owner);
      const template = await buildTemplate({
        userId: owner.id,
        teamId: team.id,
        collectionId: personal.id,
      });

      const before = await server.post("/api/templates.update", owner, {
        body: { id: template.id, title: "Renamed" },
      });
      await owner.update({ role: UserRole.Viewer });
      const after = await server.post("/api/templates.update", owner, {
        body: { id: template.id, collectionId: null },
      });

      expect(before.status).toEqual(200);
      expect(after.status).toEqual(403);
    });

    it("R31 lets the member author and an admin update and delete a workspace template", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const admin = await buildAdmin({ teamId: team.id });
      const [authored, administered] = await Promise.all(
        [0, 1].map(() =>
          buildTemplate({
            userId: author.id,
            teamId: team.id,
            collectionId: null,
          })
        )
      );

      const authorUpdate = await server.post("/api/templates.update", author, {
        body: { id: authored.id, title: "By author" },
      });
      const authorDelete = await server.post("/api/templates.delete", author, {
        body: { id: authored.id },
      });
      const adminUpdate = await server.post("/api/templates.update", admin, {
        body: { id: administered.id, title: "By admin" },
      });
      const adminDelete = await server.post("/api/templates.delete", admin, {
        body: { id: administered.id },
      });

      expect(authorUpdate.status).toEqual(200);
      expect(authorDelete.status).toEqual(200);
      expect(adminUpdate.status).toEqual(200);
      expect(adminDelete.status).toEqual(200);
    });

    it("R31 refuses another member updating, deleting and moving a workspace template", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const other = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: other.id,
      });
      const template = await buildTemplate({
        userId: author.id,
        teamId: team.id,
        collectionId: null,
      });

      const authorUpdate = await server.post("/api/templates.update", author, {
        body: { id: template.id, title: "Mine" },
      });
      const update = await server.post("/api/templates.update", other, {
        body: { id: template.id, title: "Theirs" },
      });
      const move = await server.post("/api/templates.update", other, {
        body: { id: template.id, collectionId: collection.id },
      });
      const remove = await server.post("/api/templates.delete", other, {
        body: { id: template.id },
      });

      expect(authorUpdate.status).toEqual(200);
      expect(update.status).toEqual(403);
      expect(move.status).toEqual(403);
      expect(remove.status).toEqual(403);
    });

    it("R31 refuses a demoted author editing their workspace template while an admin keeps access", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const admin = await buildAdmin({ teamId: team.id });
      const template = await buildTemplate({
        userId: author.id,
        teamId: team.id,
        collectionId: null,
      });

      const before = await server.post("/api/templates.update", author, {
        body: { id: template.id, title: "Before" },
      });
      await author.update({ role: UserRole.Viewer });
      const after = await server.post("/api/templates.update", author, {
        body: { id: template.id, title: "After" },
      });
      const adminRes = await server.post("/api/templates.update", admin, {
        body: { id: template.id, title: "Admin" },
      });

      expect(before.status).toEqual(200);
      expect(after.status).toEqual(403);
      expect(adminRes.status).toEqual(200);
    });

    it("R31 lets only the member author restore a deleted workspace template", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const other = await buildUser({ teamId: team.id });
      const template = await buildTemplate({
        userId: author.id,
        teamId: team.id,
        collectionId: null,
      });
      await template.destroy();

      const otherRes = await server.post("/api/templates.restore", other, {
        body: { id: template.id },
      });
      const authorRes = await server.post("/api/templates.restore", author, {
        body: { id: template.id },
      });

      expect(otherRes.status).toEqual(403);
      expect(authorRes.status).toEqual(200);
    });
  });

  describe("#templates.duplicate", () => {
    it("R31 lets another member duplicate a workspace template into their personal collection", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const other = await buildUser({ teamId: team.id });
      const template = await buildTemplate({
        userId: author.id,
        teamId: team.id,
        collectionId: null,
      });

      const res = await server.post("/api/templates.duplicate", other, {
        body: { id: template.id, collectionId: "personal" },
      });
      const body = await res.json();

      expect(res.status).toEqual(200);
      const personal = await Collection.findOne({
        where: { ownerId: other.id },
        rejectOnEmpty: true,
      });
      expect(body.data.collectionId).toEqual(personal.id);
      expect(body.data.createdBy.id).toEqual(other.id);
    });

    it("R31 refuses duplicating into another user's personal collection", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const other = await buildUser({ teamId: team.id });
      const otherPersonal = await buildPersonalCollection(other);
      const template = await buildTemplate({
        userId: author.id,
        teamId: team.id,
        collectionId: null,
      });

      const own = await server.post("/api/templates.duplicate", other, {
        body: { id: template.id, collectionId: otherPersonal.id },
      });
      const foreign = await server.post("/api/templates.duplicate", author, {
        body: { id: template.id, collectionId: otherPersonal.id },
      });

      expect(own.status).toEqual(200);
      expect(foreign.status).toEqual(403);
    });

    it("R31 refuses a member duplicating into a collection without template rights", async () => {
      const team = await buildPersonalDocsTeam();
      const admin = await buildAdmin({ teamId: team.id });
      const member = await buildUser({ teamId: team.id });
      const locked = await buildCollection({
        teamId: team.id,
        userId: admin.id,
        templateManagement: CollectionPermission.Admin,
      });
      const template = await buildTemplate({
        userId: admin.id,
        teamId: team.id,
        collectionId: null,
      });

      const res = await server.post("/api/templates.duplicate", member, {
        body: { id: template.id, collectionId: locked.id },
      });
      const workspace = await server.post("/api/templates.duplicate", member, {
        body: { id: template.id, collectionId: null },
      });

      expect(res.status).toEqual(403);
      expect(workspace.status).toEqual(200);
    });

    it("R31 refuses a viewer duplicating a workspace template", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const viewer = await buildViewer({ teamId: team.id });
      const template = await buildTemplate({
        userId: author.id,
        teamId: team.id,
        collectionId: null,
      });

      const memberRes = await server.post("/api/templates.duplicate", author, {
        body: { id: template.id, collectionId: null },
      });
      const viewerRes = await server.post("/api/templates.duplicate", viewer, {
        body: { id: template.id, collectionId: null },
      });
      const [memberInfo, viewerInfo] = await Promise.all(
        [author, viewer].map((actor) =>
          server
            .post("/api/templates.info", actor, { body: { id: template.id } })
            .then((res) => res.json())
        )
      );

      expect(memberRes.status).toEqual(200);
      expect(viewerRes.status).toEqual(403);
      expect(memberInfo.policies[0].abilities.duplicate).toEqual(true);
      expect(viewerInfo.policies[0].abilities.duplicate).toEqual(false);
    });
  });

  describe("moving into a personal collection", () => {
    it("R32 lets the author move their template into their own personal collection with collectionId personal", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const template = await buildTemplate({
        userId: author.id,
        teamId: team.id,
        collectionId: null,
      });

      const res = await server.post("/api/templates.update", author, {
        body: { id: template.id, collectionId: "personal" },
      });
      const body = await res.json();

      expect(res.status).toEqual(200);
      const personal = await Collection.findOne({
        where: { ownerId: author.id },
        rejectOnEmpty: true,
      });
      expect(body.data.collectionId).toEqual(personal.id);
    });

    it("R32 refuses an admin moving another user's workspace template into the admin's personal collection", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const admin = await buildAdmin({ teamId: team.id });
      const adminPersonal = await buildPersonalCollection(admin);
      const [authored, foreign] = await Promise.all(
        [author, author].map((user) =>
          buildTemplate({
            userId: user.id,
            teamId: team.id,
            collectionId: null,
          })
        )
      );
      const ownTemplate = await buildTemplate({
        userId: admin.id,
        teamId: team.id,
        collectionId: null,
      });

      const own = await server.post("/api/templates.update", admin, {
        body: { id: ownTemplate.id, collectionId: adminPersonal.id },
      });
      const byId = await server.post("/api/templates.update", admin, {
        body: { id: foreign.id, collectionId: adminPersonal.id },
      });
      const byAlias = await server.post("/api/templates.update", admin, {
        body: { id: authored.id, collectionId: "personal" },
      });

      expect(own.status).toEqual(200);
      expect(byId.status).toEqual(403);
      expect(byAlias.status).toEqual(403);
      expect((await Template.findByPk(foreign.id))?.collectionId).toBeNull();
    });

    it("R32 refuses a collection manager who is not the author moving the template into their personal collection", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const manager = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        teamId: team.id,
        userId: author.id,
      });
      await UserMembership.create({
        createdById: author.id,
        collectionId: collection.id,
        userId: manager.id,
        permission: CollectionPermission.Admin,
      });
      const managerPersonal = await buildPersonalCollection(manager);
      const template = await buildTemplate({
        userId: author.id,
        teamId: team.id,
        collectionId: collection.id,
      });

      const rename = await server.post("/api/templates.update", manager, {
        body: { id: template.id, title: "Managed" },
      });
      const move = await server.post("/api/templates.update", manager, {
        body: { id: template.id, collectionId: managerPersonal.id },
      });

      expect(rename.status).toEqual(200);
      expect(move.status).toEqual(403);
      expect((await Template.findByPk(template.id))?.collectionId).toEqual(
        collection.id
      );
    });

    it("R32 refuses the author moving their template into another user's personal collection", async () => {
      const team = await buildPersonalDocsTeam();
      const author = await buildUser({ teamId: team.id });
      const other = await buildUser({ teamId: team.id });
      const otherPersonal = await buildPersonalCollection(other);
      const authorPersonal = await buildPersonalCollection(author);
      const template = await buildTemplate({
        userId: author.id,
        teamId: team.id,
        collectionId: null,
      });

      const foreign = await server.post("/api/templates.update", author, {
        body: { id: template.id, collectionId: otherPersonal.id },
      });
      const own = await server.post("/api/templates.update", author, {
        body: { id: template.id, collectionId: authorPersonal.id },
      });

      expect(foreign.status).toEqual(403);
      expect(own.status).toEqual(200);
    });
  });
});
