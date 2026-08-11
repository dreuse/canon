import "./bootstrap";
import { UserPreference } from "@shared/types";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildTeam,
} from "@server/test/factories";

const ALLOW_FLAG = "ALLOW_E2E_SEED";

const MERMAID_TEXT = [
  "A diagram to measure contrast against.",
  "",
  "```mermaid",
  "graph TD;",
  "  Start-->Middle;",
  "  Middle-->Finish;",
  "```",
  "",
].join("\n");

/**
 * Creates the team, admin user and collection that the end-to-end suite signs
 * in as, then prints them as JSON on stdout for the Playwright global setup.
 *
 * @throws if ALLOW_E2E_SEED is not set to "true", since the script writes test
 * data into whichever database DATABASE_URL points at.
 */
export default async function main() {
  if (process.env[ALLOW_FLAG] !== "true") {
    throw new Error(
      `e2e-seed writes test data into DATABASE_URL and refuses to run unless ${ALLOW_FLAG}=true`
    );
  }

  const team = await buildTeam();
  const user = await buildAdmin({
    teamId: team.id,
    preferences: { [UserPreference.SeamlessEdit]: false },
  });
  const collection = await buildCollection({
    teamId: team.id,
    userId: user.id,
  });
  const document = await buildDocument({
    teamId: team.id,
    userId: user.id,
    collectionId: collection.id,
    title: "Seeded document",
  });
  const diagramDocument = await buildDocument({
    teamId: team.id,
    userId: user.id,
    collectionId: collection.id,
    title: "Seeded diagram",
    text: MERMAID_TEXT,
  });

  console.log(
    JSON.stringify({
      accessToken: user.getSessionToken(),
      teamId: team.id,
      userId: user.id,
      userName: user.name,
      collectionId: collection.id,
      collectionName: collection.name,
      documentId: document.id,
      documentUrl: document.url,
      documentTitle: document.title,
      diagramDocumentUrl: diagramDocument.url,
    })
  );
  process.exit(0);
}

void main();
