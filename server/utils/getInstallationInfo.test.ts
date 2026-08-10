import { http, HttpResponse } from "msw";
import { server } from "@server/test/msw";
import { getVersionInfo, getVersion } from "./getInstallationInfo";

const releasesUrl = "https://api.github.com/repos/dreuse/canon/releases";

describe("getVersion", () => {
  it("should return the current version", () => {
    const version = getVersion();
    expect(version).toBeDefined();
    expect(typeof version).toBe("string");
  });
});

describe("getVersionInfo", () => {
  const currentVersion = "1.9.1";

  it("should count how many releases are newer than the current version", async () => {
    server.use(
      http.get(releasesUrl, () =>
        HttpResponse.json([
          { tag_name: "v1.9.3" },
          { tag_name: "v1.9.2" },
          { tag_name: "v1.9.1" },
        ])
      )
    );

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: "1.9.3",
      versionsBehind: 2,
    });
  });

  it("should ignore draft releases", async () => {
    server.use(
      http.get(releasesUrl, () =>
        HttpResponse.json([
          { tag_name: "v1.9.9", draft: true },
          { tag_name: "v1.9.2" },
          { tag_name: "v1.9.1" },
        ])
      )
    );

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: "1.9.2",
      versionsBehind: 1,
    });
  });

  it("should report -1 when the current version is not a published release", async () => {
    server.use(
      http.get(releasesUrl, () =>
        HttpResponse.json([{ tag_name: "v1.9.2" }])
      )
    );

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: "1.9.2",
      versionsBehind: -1,
    });
  });

  it("should return fallback values when there are no releases", async () => {
    server.use(http.get(releasesUrl, () => HttpResponse.json([])));

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });

  it("should return fallback values when GitHub is unreachable", async () => {
    server.use(http.get(releasesUrl, () => HttpResponse.error()));

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });

  it("should return fallback values when the response is not JSON", async () => {
    server.use(
      http.get(releasesUrl, () => new HttpResponse("Not JSON", { status: 200 }))
    );

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });
});
