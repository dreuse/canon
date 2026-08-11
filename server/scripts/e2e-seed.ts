import "./bootstrap";
import { buildAdmin, buildCollection, buildTeam } from "@server/test/factories";

const ALLOW_FLAG = "ALLOW_E2E_SEED";

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
  const user = await buildAdmin({ teamId: team.id });
  const collection = await buildCollection({
    teamId: team.id,
    userId: user.id,
  });

  console.log(
    JSON.stringify({
      accessToken: user.getSessionToken(),
      teamId: team.id,
      userId: user.id,
      userName: user.name,
      collectionId: collection.id,
      collectionName: collection.name,
    })
  );
  process.exit(0);
}

void main();
