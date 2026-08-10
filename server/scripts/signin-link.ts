import "./bootstrap";
import type { Context } from "koa";
import { Client } from "@shared/types";
import env from "@server/env";
import { User } from "@server/models";

const LOOPBACK_IP = "::ffff:127.0.0.1";

export default async function main() {
  if (!env.isDevelopment) {
    throw new Error("signin-link is only available in development");
  }

  const email = process.argv[2];
  if (!email) {
    throw new Error("Usage: node build/server/scripts/signin-link.js <email>");
  }

  const user = await User.scope("withTeam").findOne({
    where: { email: email.toLowerCase() },
    rejectOnEmpty: true,
  });

  const ctx = { request: { ip: LOOPBACK_IP } } as unknown as Context;
  const token = user.getEmailSigninToken(ctx);

  console.log(
    `${user.team.url}/auth/email.callback?token=${token}&client=${Client.Web}`
  );
  process.exit(0);
}

if (process.env.NODE_ENV !== "test") {
  void main();
}
