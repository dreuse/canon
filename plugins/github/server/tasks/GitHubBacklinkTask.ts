import { RequestError } from "octokit";
import { MARKDOWN_LABEL_UNSAFE_REGEX } from "@shared/editor/nodes/Mention";
import { UnfurlResourceType } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Document, IntegrationAuthentication, Team } from "@server/models";
import { BaseTask } from "@server/queues/tasks/base/BaseTask";
import { GitHub } from "../github";

type Props = {
  documentId: string;
  url: string;
};

const WRITE_SCOPES = {
  [UnfurlResourceType.Issue]: "issues:write",
  [UnfurlResourceType.PR]: "pull_requests:write",
};
const SKIPPED_STATUSES = [403, 404];
const MARKER_PREFIX = "canon-document";

export default class GitHubBacklinkTask extends BaseTask<Props> {
  public async perform({ documentId, url }: Props): Promise<void> {
    const resource = GitHub.parseIssueOrPR(url);
    const document = await Document.findByPk(documentId);
    if (!resource || !document?.publishedAt) {
      return;
    }

    const integration = await GitHub.integrationForOwner(
      document.teamId,
      resource.owner
    );
    const installationId = integration?.settings.github?.installation.id;
    const authentication =
      integration &&
      (await IntegrationAuthentication.findByPk(integration.authenticationId));
    if (
      !installationId ||
      !authentication?.scopes.includes(WRITE_SCOPES[resource.type])
    ) {
      return;
    }

    try {
      const client = await GitHub.authenticateAsInstallation(installationId);
      const { data: repo } = await client.requestRepo(resource);
      if (!repo.private) {
        return;
      }

      const marker = `<!-- ${MARKER_PREFIX}:${document.id} -->`;
      for await (const { data: comments } of client.requestIssueComments(
        resource
      )) {
        if (
          comments.some((comment: { body?: string }) =>
            comment.body?.includes(marker)
          )
        ) {
          return;
        }
      }

      const team = await Team.findByPk(document.teamId, {
        rejectOnEmpty: true,
      });
      const title = document.displayTitle.replace(
        MARKDOWN_LABEL_UNSAFE_REGEX,
        "\\$&"
      );
      await client.createIssueComment(
        resource,
        `Mentioned in [${title}](${team.url}${document.url})\n\n${marker}`
      );
    } catch (err) {
      if (
        err instanceof RequestError &&
        SKIPPED_STATUSES.includes(err.status)
      ) {
        Logger.info("task", "Skipped GitHub back-link", {
          documentId,
          url,
          status: err.status,
        });
        return;
      }
      throw err;
    }
  }

  protected jobId({ documentId, url }: Props) {
    const resource = GitHub.parseIssueOrPR(url);
    return resource
      ? `github-backlink:${documentId}:${resource.owner}/${resource.repo}#${resource.id}`
      : undefined;
  }
}
