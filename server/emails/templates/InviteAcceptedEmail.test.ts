import mailer from "@server/emails/mailer";
import { buildUser } from "@server/test/factories";
import { UserPreference } from "@shared/types";
import InviteAcceptedEmail from "./InviteAcceptedEmail";

const teamUrl = "https://example.outline.dev";

describe("InviteAcceptedEmail", () => {
  beforeEach(() => {
    vi.spyOn(mailer, "sendMail").mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sendTo = async (inviterEmailNotifications: boolean) => {
    const inviter = await buildUser();
    inviter.setPreference(
      UserPreference.EmailNotifications,
      inviterEmailNotifications
    );
    await inviter.save();

    await new InviteAcceptedEmail({
      to: inviter.email,
      inviterId: inviter.id,
      invitedName: "Marina Lopes",
      teamUrl,
      teamId: inviter.teamId,
    }).send();
  };

  it("should email the inviter by default", async () => {
    await sendTo(true);

    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
  });

  it("should not email the inviter when they turned email notifications off", async () => {
    await sendTo(false);

    expect(mailer.sendMail).not.toHaveBeenCalled();
  });
});
