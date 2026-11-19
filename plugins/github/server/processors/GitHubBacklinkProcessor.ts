import { IntegrationService } from "@shared/types";
import { Collection, Document, Integration, Revision } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import type { DocumentEvent, Event, RevisionEvent } from "@server/types";
import { GitHub } from "../github";
import GitHubBacklinkTask from "../tasks/GitHubBacklinkTask";

const backlinkUrls = (model: Document | Revision) =>
  new Set(
    DocumentHelper.parseMentions(model).flatMap(({ href }) =>
      href && GitHub.parseIssueOrPR(href) ? [href] : []
    )
  );

export default class GitHubBacklinkProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
  ];

  async perform(event: DocumentEvent | RevisionEvent) {
    if (event.name === "documents.publish" && event.data?.source === "import") {
      return;
    }

    const connected = await Integration.count({
      where: { teamId: event.teamId, service: IntegrationService.GitHub },
    });
    if (!connected) {
      return;
    }

    const document = await Document.findByPk(event.documentId, {
      include: [{ model: Collection, as: "collection" }],
    });
    const collection = document?.collection;
    if (
      !document?.publishedAt ||
      document.archivedAt ||
      !collection ||
      collection.isPrivate ||
      collection.isPersonal
    ) {
      return;
    }

    const urls =
      event.name === "revisions.create"
        ? await this.addedUrls(event.modelId)
        : backlinkUrls(document);

    await Promise.all(
      [...urls].map((url) =>
        new GitHubBacklinkTask().schedule({ documentId: document.id, url })
      )
    );
  }

  private async addedUrls(revisionId: string) {
    const revision = await Revision.findByPk(revisionId);
    if (!revision) {
      return [];
    }

    const previous = await revision.before();
    const before = previous ? backlinkUrls(previous) : new Set<string>();
    return [...backlinkUrls(revision)].filter((url) => !before.has(url));
  }
}
