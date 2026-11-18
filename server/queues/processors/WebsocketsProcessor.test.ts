import type { Server } from "socket.io";
import { TeamPreference } from "@shared/types";
import type { Template } from "@server/models";
import {
  buildPersonalCollection,
  buildTeam,
  buildTemplate,
  buildUser,
} from "@server/test/factories";
import WebsocketsProcessor from "./WebsocketsProcessor";

const ip = "127.0.0.1";

type TemplateEventName =
  | "templates.create"
  | "templates.update"
  | "templates.delete"
  | "templates.restore";

async function channelsFor(
  name: TemplateEventName,
  template: Template,
  actorId: string
) {
  const channels: string[] = [];
  const socketio = {
    to(room: string | string[]) {
      channels.push(...[room].flat());
      return { emit: () => true };
    },
  } as unknown as Server;

  await new WebsocketsProcessor().perform(
    {
      name,
      modelId: template.id,
      teamId: template.teamId,
      actorId,
      ip,
    },
    socketio
  );
  return channels;
}

async function setup() {
  const team = await buildTeam();
  team.setPreference(TeamPreference.PersonalDocs, true);
  await team.save();
  const owner = await buildUser({ teamId: team.id });
  const personal = await buildPersonalCollection(owner);
  return { team, owner, personal };
}

describe("WebsocketsProcessor template events", () => {
  it("R32 sends personal template updates only to the actor and the personal collection", async () => {
    const { team, owner, personal } = await setup();
    const personalTemplate = await buildTemplate({
      userId: owner.id,
      teamId: team.id,
      collectionId: personal.id,
    });
    const workspaceTemplate = await buildTemplate({
      userId: owner.id,
      teamId: team.id,
      collectionId: null,
    });

    const personalChannels = await channelsFor(
      "templates.update",
      personalTemplate,
      owner.id
    );
    const workspaceChannels = await channelsFor(
      "templates.update",
      workspaceTemplate,
      owner.id
    );

    expect(personalChannels.sort()).toEqual(
      [`user-${owner.id}`, `collection-${personal.id}`].sort()
    );
    expect(workspaceChannels).toContain(`team-${team.id}`);
  });

  it("R29 sends personal template deletes only to the actor and the personal collection", async () => {
    const { team, owner, personal } = await setup();
    const personalTemplate = await buildTemplate({
      userId: owner.id,
      teamId: team.id,
      collectionId: personal.id,
    });
    const workspaceTemplate = await buildTemplate({
      userId: owner.id,
      teamId: team.id,
      collectionId: null,
    });
    await personalTemplate.destroy();
    await workspaceTemplate.destroy();

    const personalChannels = await channelsFor(
      "templates.delete",
      personalTemplate,
      owner.id
    );
    const workspaceChannels = await channelsFor(
      "templates.delete",
      workspaceTemplate,
      owner.id
    );

    expect(personalChannels.sort()).toEqual(
      [`user-${owner.id}`, `collection-${personal.id}`].sort()
    );
    expect(workspaceChannels).toContain(`team-${team.id}`);
  });

  it("R29 sends personal template restores only to the actor and the personal collection", async () => {
    const { team, owner, personal } = await setup();
    const template = await buildTemplate({
      userId: owner.id,
      teamId: team.id,
      collectionId: personal.id,
    });

    const channels = await channelsFor("templates.restore", template, owner.id);

    expect(channels.sort()).toEqual(
      [`user-${owner.id}`, `collection-${personal.id}`].sort()
    );
  });
});
