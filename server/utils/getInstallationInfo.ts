import { errToString } from "@shared/utils/error";
import { version } from "../../package.json";
import Logger from "@server/logging/Logger";
import fetch from "./fetch";

const releasesUrl =
  "https://api.github.com/repos/dreuse/canon/releases?per_page=100";

/**
 * @param currentVersion the currently installed version.
 * @returns the latest version and the number of versions behind, or -1 if unknown.
 */
export async function getVersionInfo(currentVersion: string): Promise<{
  latestVersion: string;
  versionsBehind: number;
}> {
  try {
    const response = await fetch(releasesUrl);
    const releases = (await response.json()) as {
      tag_name: string;
      draft?: boolean;
    }[];

    const versions = releases
      .filter((release) => !release.draft)
      .map((release) => release.tag_name.replace(/^v/, ""));

    return {
      latestVersion: versions[0] ?? currentVersion,
      versionsBehind: versions.indexOf(currentVersion),
    };
  } catch (error) {
    Logger.warn(
      "Failed to fetch release information from GitHub. This is expected in isolated environments.",
      {
        currentVersion,
        error: errToString(error),
      }
    );

    return {
      latestVersion: currentVersion,
      versionsBehind: -1,
    };
  }
}

/**
 * Returns the current version of the server from the package manifest.
 *
 * @returns the current version.
 */
export function getVersion(): string {
  return version;
}
