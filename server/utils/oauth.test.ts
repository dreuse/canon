import JWT from "jsonwebtoken";
import Koa from "koa";
import { http, HttpResponse } from "msw";
import { server } from "@server/test/msw";
import TestServer from "@server/test/TestServer";
import OAuthClient, { verifyOAuthStateNonce } from "./oauth";

class MinimalOAuthClient extends OAuthClient {
  endpoints = {
    authorize: "http://example.com/authorize",
    token: "http://example.com/token",
    userinfo: "http://example.com/userinfo",
  };
}

describe("userInfo", () => {
  it("should work with empty-body 401 Unauthorized responses", async () => {
    server.use(
      http.get(
        "http://example.com/userinfo",
        () =>
          new HttpResponse(null, { status: 401, statusText: "unauthorized" })
      )
    );

    const client = new MinimalOAuthClient("clientid", "clientsecret");
    try {
      expect.assertions(1);
      await client.userInfo("token");
    } catch (e) {
      expect(e instanceof Error && "id" in e ? e.id : undefined).toBe(
        "authentication_required"
      );
    }
  });

  it("should parse claims from an application/json response", async () => {
    server.use(
      http.get("http://example.com/userinfo", () =>
        HttpResponse.json({ sub: "1234", email: "test@example.com" })
      )
    );

    const client = new MinimalOAuthClient("clientid", "clientsecret");
    const data = await client.userInfo("token");
    expect(data.sub).toBe("1234");
    expect(data.email).toBe("test@example.com");
  });

  it("should parse claims from a signed application/jwt response", async () => {
    const token = JWT.sign(
      { sub: "1234", email: "test@example.com" },
      "secret"
    );
    server.use(
      http.get(
        "http://example.com/userinfo",
        () =>
          new HttpResponse(token, {
            status: 200,
            headers: { "Content-Type": "application/jwt" },
          })
      )
    );

    const client = new MinimalOAuthClient("clientid", "clientsecret");
    const data = await client.userInfo("token");
    expect(data.sub).toBe("1234");
    expect(data.email).toBe("test@example.com");
  });

  it("should throw for an undecodable application/jwt response", async () => {
    server.use(
      http.get(
        "http://example.com/userinfo",
        () =>
          new HttpResponse("not-a-jwt", {
            status: 200,
            headers: { "Content-Type": "application/jwt" },
          })
      )
    );

    const client = new MinimalOAuthClient("clientid", "clientsecret");
    try {
      expect.assertions(1);
      await client.userInfo("token");
    } catch (e) {
      expect(e instanceof Error && "id" in e ? e.id : undefined).toBe(
        "invalid_request"
      );
    }
  });
});

describe("verifyOAuthStateNonce", () => {
  const cookieName = "oauthState";
  const nonce = "client-nonce";

  async function verifyAndGetSetCookies() {
    const app = new Koa();
    app.use((ctx) => {
      verifyOAuthStateNonce(ctx, cookieName, nonce);
      ctx.body = "ok";
    });

    const testServer = new TestServer(app);
    try {
      const res = await testServer.get("/", {
        headers: { Cookie: `${cookieName}=${nonce}` },
      });
      return res.headers.raw()["set-cookie"] ?? [];
    } finally {
      testServer.close();
    }
  }

  it("should clear a nonce cookie the client set without a domain", async () => {
    const cleared = (await verifyAndGetSetCookies()).filter((header) =>
      header.startsWith(`${cookieName}=;`)
    );

    expect(cleared.some((header) => !/domain=/i.test(header))).toBe(true);
  });

  it("should clear a nonce cookie the server set with a domain", async () => {
    const cleared = (await verifyAndGetSetCookies()).filter((header) =>
      header.startsWith(`${cookieName}=;`)
    );

    expect(cleared.some((header) => /domain=/i.test(header))).toBe(true);
  });
});
