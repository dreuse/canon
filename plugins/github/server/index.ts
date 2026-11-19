import { IntegrationService } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { GitHubUtils } from "../shared/GitHubUtils";
import { GitHubIssueProvider } from "./GitHubIssueProvider";
import router from "./api/github";
import { GitHub } from "./github";
import GitHubBacklinkProcessor from "./processors/GitHubBacklinkProcessor";
import GitHubBacklinkTask from "./tasks/GitHubBacklinkTask";
import GitHubWebhookTask from "./tasks/GitHubWebhookTask";
import { uninstall } from "./uninstall";

PluginManager.add({
  type: Hook.IntegrationSettings,
  value: { service: IntegrationService.GitHub, keys: ["github"] },
});

PluginManager.add([
  {
    ...config,
    type: Hook.API,
    value: router,
  },
  {
    type: Hook.Task,
    value: GitHubWebhookTask,
  },
  {
    type: Hook.Task,
    value: GitHubBacklinkTask,
  },
  {
    type: Hook.Processor,
    value: GitHubBacklinkProcessor,
  },
  {
    type: Hook.IssueProvider,
    value: new GitHubIssueProvider(),
  },
  {
    type: Hook.UnfurlProvider,
    name: "GitHub",
    value: { unfurl: GitHub.unfurl, cacheExpiry: Minute.seconds },
  },
  {
    type: Hook.MentionProvider,
    value: (url: URL) => GitHubUtils.mentionType(url),
  },
  {
    type: Hook.Uninstall,
    value: uninstall,
  },
]);
