import env from "../env";

export class UrlHelper {
  public static repository = "https://github.com/dreuse/canon";

  public static bugReport: string | undefined = env.BUG_REPORT_URL;
  public static contact: string | undefined = env.CONTACT_URL;
  public static developers: string | undefined = env.DEVELOPERS_URL;
  public static changelog: string | undefined = env.CHANGELOG_URL;
  public static guide: string | undefined = env.HELP_URL;
  public static translations: string | undefined = env.TRANSLATIONS_URL;

  public static SLUG_URL_REGEX = /^(?:[0-9a-zA-Z-_~]*-)?([a-zA-Z0-9]{10,15})$/;
  public static SHARE_URL_SLUG_REGEX = /^[0-9a-z-]+$/;
}
