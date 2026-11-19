import { RequestError } from "octokit";
import { IntegrationService, IntegrationType } from "@shared/types";
import { IntegrationAuthentication, Team } from "@server/models";
import {
  buildDocument,
  buildIntegration,
  buildTeam,
} from "@server/test/factories";
import { GitHub } from "../github";
import GitHubBacklinkTask from "./GitHubBacklinkTask";

type InstallationClient = Awaited<
  ReturnType<typeof GitHub.authenticateAsInstallation>
>;

const ISSUE_URL = "https://github.com/acme/api/issues/1";
const PR_URL = "https://github.com/acme/api/pull/2";
const WRITE_SCOPES = ["issues:write", "pull_requests:write"];

async function buildConnectedDocument(scopes = WRITE_SCOPES) {
  const team = await buildTeam();
  const integration = await buildIntegration({
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
  await IntegrationAuthentication.update(
    { scopes },
    { where: { id: integration.authenticationId } }
  );
  return buildDocument({ teamId: team.id, title: "Release [plan]" });
}

function stubClient({
  isPrivate = true,
  comments = [] as { body: string }[],
  requestRepo = async () => ({ data: { private: isPrivate } }),
} = {}) {
  const createIssueComment = vi.fn().mockResolvedValue({});
  vi.spyOn(GitHub, "authenticateAsInstallation").mockResolvedValue({
    requestRepo,
    requestIssueComments: () => [{ data: comments }],
    createIssueComment,
  } as unknown as InstallationClient);
  return createIssueComment;
}

const githubError = (status: number) => async () => {
  throw new RequestError("error", status, {
    request: { method: "GET", url: "https://api.github.com", headers: {} },
  });
};

const marker = (documentId: string) => `<!-- canon-document:${documentId} -->`;

describe("GitHubBacklinkTask", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should comment once with the escaped title and document link", async () => {
    const document = await buildConnectedDocument();
    const team = await Team.findByPk(document.teamId, { rejectOnEmpty: true });
    const createIssueComment = stubClient({
      comments: [{ body: "unrelated" }],
    });

    await new GitHubBacklinkTask().perform({
      documentId: document.id,
      url: ISSUE_URL,
    });

    expect(createIssueComment).toHaveBeenCalledTimes(1);
    expect(createIssueComment).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "acme", repo: "api", id: 1 }),
      `Mentioned in [Release \\[plan\\]](${team.url}${document.url})\n\n${marker(document.id)}`
    );
  });

  it("should skip public repositories", async () => {
    const document = await buildConnectedDocument();
    const createIssueComment = stubClient({ isPrivate: false });

    await new GitHubBacklinkTask().perform({
      documentId: document.id,
      url: ISSUE_URL,
    });

    expect(createIssueComment).not.toHaveBeenCalled();
  });

  it("should skip when the installation cannot write to pull requests", async () => {
    const document = await buildConnectedDocument(["issues:write"]);
    const createIssueComment = stubClient();

    await new GitHubBacklinkTask().perform({
      documentId: document.id,
      url: PR_URL,
    });

    expect(createIssueComment).not.toHaveBeenCalled();
  });

  it("should skip when a back-link already exists", async () => {
    const document = await buildConnectedDocument();
    const createIssueComment = stubClient({
      comments: [{ body: `Mentioned\n\n${marker(document.id)}` }],
    });

    await new GitHubBacklinkTask().perform({
      documentId: document.id,
      url: ISSUE_URL,
    });

    expect(createIssueComment).not.toHaveBeenCalled();
  });

  it("should resolve when GitHub cannot find the repository", async () => {
    const document = await buildConnectedDocument();
    stubClient({ requestRepo: githubError(404) });

    await expect(
      new GitHubBacklinkTask().perform({
        documentId: document.id,
        url: ISSUE_URL,
      })
    ).resolves.toBeUndefined();
  });

  it("should throw on other GitHub errors", async () => {
    const document = await buildConnectedDocument();
    stubClient({ requestRepo: githubError(500) });

    await expect(
      new GitHubBacklinkTask().perform({
        documentId: document.id,
        url: ISSUE_URL,
      })
    ).rejects.toThrow(RequestError);
  });
});
