import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { UrlHelper } from "@shared/utils/UrlHelper";
import env from "~/env";
import { settingsPath } from "~/utils/routeHelpers";
import { version } from "../../../../package.json";

/**
 * Footer of the settings sidebar showing the app name, version and an optional changelog link.
 *
 * @returns the footer element.
 */
export function SettingsFooter() {
  const { t } = useTranslation();

  return (
    <Footer>
      <Link to={settingsPath("about")}>
        {env.APP_NAME} {version}
      </Link>
      {UrlHelper.changelog && (
        <>
          {" · "}
          <ChangelogLink
            href={UrlHelper.changelog}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("What’s new")}
          </ChangelogLink>
        </>
      )}
    </Footer>
  );
}

const Footer = styled.p`
  margin: 0;
  margin-top: auto;
  padding: 12px 20px 4px;
  font-size: 12px;
  line-height: 16px;
  color: ${s("textTertiary")};

  a {
    color: inherit;
  }
`;

const ChangelogLink = styled.a`
  && {
    color: ${s("textSecondary")};
  }
`;
