import type Integration from "~/models/Integration";
import { Hook, PluginManager } from "~/utils/PluginManager";

/**
 * Returns the provider that can fetch the lines of code a URL points at.
 *
 * @param url the pasted URL.
 * @param integrations the integrations connected to the team.
 * @returns the provider, or undefined when no connected integration handles
 * the URL.
 */
export const getCodeSnippetProvider = (url: URL, integrations: Integration[]) =>
  PluginManager.getHooks(Hook.CodeSnippetProvider).find(
    (hook) =>
      hook.value.matches(url) &&
      integrations.some(
        (integration) => integration.service === hook.value.service
      )
  )?.value;
