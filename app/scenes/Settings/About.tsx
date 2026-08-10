import { InfoIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { UrlHelper } from "@shared/utils/UrlHelper";
import Scene from "~/components/Scene";
import env from "~/env";
import { license, version } from "../../../package.json";
import { SettingsTitle } from "./components/SettingsTitle";

export function About() {
  const { t } = useTranslation();

  return (
    <Scene title={t("About")} icon={<InfoIcon />}>
      <SettingsTitle title={t("About")}>
        {t("The build of {{ appName }} this workspace runs on.", {
          appName: env.APP_NAME,
        })}
      </SettingsTitle>
      <Rows>
        <Term>{t("Version")}</Term>
        <Value>{version}</Value>
        {env.VERSION ? (
          <>
            <Term>{t("Commit")}</Term>
            <Value>{env.VERSION}</Value>
          </>
        ) : null}
        <Term>{t("Source code")}</Term>
        <Value>
          <a href={UrlHelper.repository} target="_blank" rel="noreferrer">
            {UrlHelper.repository}
          </a>
        </Value>
        <Term>{t("License")}</Term>
        <Value>{license}</Value>
      </Rows>
    </Scene>
  );
}

const Rows = styled.dl`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 8px 32px;
  align-items: baseline;
  margin: 16px 0 0;
`;

const Term = styled.dt`
  color: ${s("text")};
  font-weight: 500;
`;

const Value = styled.dd`
  margin: 0;
  color: ${s("textSecondary")};
  overflow-wrap: anywhere;
`;
