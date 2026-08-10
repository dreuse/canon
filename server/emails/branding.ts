import { attachmentRedirectRegex } from "@shared/utils/ProsemirrorHelper";
import { Day } from "@shared/utils/time";
import type { Team } from "@server/models";
import Attachment from "@server/models/Attachment";
import FileStorage from "@server/storage/files";

export type EmailBranding = {
  logoUrl?: string;
};

export const defaultBranding: EmailBranding = {};

const logoExpiry = 4 * Day.seconds;
const avatarRedirectPattern = new RegExp(attachmentRedirectRegex.source, "i");

export async function brandingForTeam(
  team?: Team | null
): Promise<EmailBranding> {
  const url = team?.avatarUrl;
  if (!url) {
    return defaultBranding;
  }

  const match = avatarRedirectPattern.exec(url);
  if (!match?.groups?.id) {
    return url.startsWith("http") ? { logoUrl: url } : defaultBranding;
  }

  const attachment = await Attachment.findOne({
    where: { id: match.groups.id, teamId: team!.id },
  });

  if (!attachment) {
    return defaultBranding;
  }

  return {
    logoUrl: await FileStorage.getSignedUrl(attachment.key, logoExpiry),
  };
}
