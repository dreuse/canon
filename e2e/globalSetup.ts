import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const AUTH_DIR = path.resolve("e2e/.auth");
const STATE_PATH = path.join(AUTH_DIR, "state.json");
const SEED_PATH = path.join(AUTH_DIR, "seed.json");
const SEED_SCRIPT = "build/server/scripts/e2e-seed.js";
const SESSION_COOKIE = "accessToken";

export interface Seed {
  accessToken: string;
  teamId: string;
  userId: string;
  userName: string;
  collectionId: string;
  collectionName: string;
  documentId: string;
  documentUrl: string;
  documentTitle: string;
  diagramDocumentUrl: string;
}

function runSeed(): Seed {
  const output = execFileSync("node", [SEED_SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, ALLOW_E2E_SEED: "true" },
  });

  const lastLine = output.trim().split("\n").pop();
  if (!lastLine) {
    throw new Error(`${SEED_SCRIPT} produced no output`);
  }

  return JSON.parse(lastLine) as Seed;
}

/**
 * Seeds a workspace for the end-to-end run and writes the Playwright storage
 * state that signs the browser in, so the specs start already authenticated.
 */
export default function globalSetup() {
  const seed = runSeed();

  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2));
  writeFileSync(
    STATE_PATH,
    JSON.stringify({
      cookies: [
        {
          name: SESSION_COOKIE,
          value: seed.accessToken,
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: (process.env.E2E_SCHEME ?? "http") === "https",
          sameSite: "Lax",
        },
      ],
      origins: [],
    })
  );
}
