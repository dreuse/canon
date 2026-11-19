import { randomUUID } from "node:crypto";
import type { ProsemirrorData } from "@shared/types";
import {
  IntegrationService,
  IntegrationType,
  MentionType,
} from "@shared/types";
import { createContext } from "@server/context";
import { Revision } from "@server/models";
import type { Document } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildIntegration,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import GitHubBacklinkTask from "../tasks/GitHubBacklinkTask";
import GitHubBacklinkProcessor from "./GitHubBacklinkProcessor";

const ip = "127.0.0.1";
const ISSUE_URL = "https://github.com/acme/api/issues/1";
const PR_URL = "https://github.com/acme/api/pull/2";
const COMMIT_URL = "https://github.com/acme/api/commit/abc1234";

const mention = (href: string, type: MentionType): ProsemirrorData => ({
  type: "mention",
  attrs: { id: randomUUID(), type, modelId: randomUUID(), href, label: href },
});

const paragraphs = (nodes: ProsemirrorData[]): ProsemirrorData => ({
  type: "doc",
  content: nodes.map((node) => ({ type: "paragraph", content: [node] })),
});

const issueMention = () => mention(ISSUE_URL, MentionType.Issue);
const prMention = () => mention(PR_URL, MentionType.PullRequest);

async function buildConnectedTeam() {
  const team = await buildTeam();
  await buildIntegration({
    teamId: team.id,
    service: IntegrationService.GitHub,
    type: IntegrationType.Embed,
    settings: {
      github: {
        installation: {
          id: 1,
          account: { id: 1, name: "acme", avatarUrl: "" },
        },
      },
    },
  });
  return team;
}

const publish = (document: Document, source?: "import") =>
  new GitHubBacklinkProcessor().perform({
    name: "documents.publish",
    documentId: document.id,
    collectionId: document.collectionId!,
    teamId: document.teamId,
    actorId: document.createdById,
    ip,
    data: source ? { source } : undefined,
  });

describe("GitHubBacklinkProcessor", () => {
  let schedule: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    schedule = vi
      .spyOn(GitHubBacklinkTask.prototype, "schedule")
      .mockResolvedValue(
        {} as Awaited<ReturnType<GitHubBacklinkTask["schedule"]>>
      );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should schedule a back-link for each GitHub issue and PR on publish", async () => {
    const team = await buildConnectedTeam();
    const document = await buildDocument({
      teamId: team.id,
      content: paragraphs([
        issueMention(),
        prMention(),
        mention(COMMIT_URL, MentionType.URL),
      ]),
    });

    await publish(document);

    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledWith({
      documentId: document.id,
      url: ISSUE_URL,
    });
    expect(schedule).toHaveBeenCalledWith({
      documentId: document.id,
      url: PR_URL,
    });
  });

  it("should schedule only mentions added since the previous revision", async () => {
    const team = await buildConnectedTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      content: paragraphs([issueMention()]),
    });
    await Revision.createFromDocument(createContext({ user }), document);
    document.content = paragraphs([issueMention(), prMention()]);
    await document.save();
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

    await new GitHubBacklinkProcessor().perform({
      name: "revisions.create",
      documentId: document.id,
      modelId: revision.id,
      teamId: document.teamId,
      actorId: user.id,
      ip,
    });

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith({
      documentId: document.id,
      url: PR_URL,
    });
  });

  it("should skip imports", async () => {
    const team = await buildConnectedTeam();
    const document = await buildDocument({
      teamId: team.id,
      content: paragraphs([issueMention()]),
    });

    await publish(document, "import");

    expect(schedule).not.toHaveBeenCalled();
  });

  it("should skip drafts", async () => {
    const team = await buildConnectedTeam();
    const document = await buildDocument({
      teamId: team.id,
      publishedAt: null,
      content: paragraphs([issueMention()]),
    });

    await publish(document);

    expect(schedule).not.toHaveBeenCalled();
  });

  it("should skip private collections", async () => {
    const team = await buildConnectedTeam();
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      content: paragraphs([issueMention()]),
    });

    await publish(document);

    expect(schedule).not.toHaveBeenCalled();
  });

  it("should skip teams without a GitHub integration", async () => {
    const document = await buildDocument({
      content: paragraphs([issueMention()]),
    });

    await publish(document);

    expect(schedule).not.toHaveBeenCalled();
  });
});
