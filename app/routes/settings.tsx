import { Redirect, Switch } from "react-router-dom";
import { breakpoint } from "@shared/styles/breakpoint";
import { useLocationSelector } from "~/hooks/useLocationSelector";
import styled from "styled-components";
import Error404 from "~/scenes/Errors/Error404";
import { createLazyComponent as lazy } from "~/components/LazyLoad";
import Route from "~/components/ProfiledRoute";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import { settingsPath } from "~/utils/routeHelpers";
import { observer } from "mobx-react";

const FORM_COLUMN = "816px";
const LIST_COLUMN = "1064px";
const COLUMN_PADDING = 56;
const CONTAINER_PADDING = 44;
const GROUPS_PREFIX = `${settingsPath("groups")}/`;
const MEMBERS_SUFFIX = "/members";

function isGroupMembersPath(pathname: string) {
  const path = pathname.replace(/\/$/, "");
  if (!path.startsWith(GROUPS_PREFIX) || !path.endsWith(MEMBERS_SUFFIX)) {
    return false;
  }
  const id = path.slice(GROUPS_PREFIX.length, -MEMBERS_SUFFIX.length);
  return id.length > 0 && !id.includes("/");
}

const LIST_ROUTES = [
  "users",
  "groups",
  "templates",
  "emojis",
  "shares",
  "api-keys",
  "webhooks",
].map((route) => settingsPath(route));

/**
 * Returns the column width for a settings route.
 *
 * @param pathname the current location pathname.
 * @returns the CSS width of the column, wider for list routes.
 */
export function settingsColumnWidth(pathname: string) {
  const isList =
    LIST_ROUTES.includes(pathname.replace(/\/$/, "")) ||
    isGroupMembersPath(pathname);
  return isList ? LIST_COLUMN : FORM_COLUMN;
}

const TOUCH_TARGET = 44;

const Application = lazy(() => import("~/scenes/Settings/Application"));
const GroupMembers = lazy(() => import("~/scenes/Settings/GroupMembers"), {
  exportName: "GroupMembersScene",
});
const Template = lazy(() => import("~/scenes/Templates/Template"));
const TemplateNew = lazy(() => import("~/scenes/Templates/TemplateNew"));

function SettingsRoutes() {
  const configs = useSettingsConfig();
  const pathname = useLocationSelector((location) => location.pathname);

  return (
    <Measure $width={settingsColumnWidth(pathname)}>
      <Switch>
        {configs.map((config) => (
          <Route
            exact
            key={config.path}
            path={config.path}
            component={config.component}
          />
        ))}
        {/* Members was renamed to Users, redirect for backwards compatibility */}
        <Redirect
          exact
          from={settingsPath("members")}
          to={settingsPath("users")}
        />
        <Redirect
          exact
          from={settingsPath("features")}
          to={settingsPath("ai")}
        />
        {/* TODO: Refactor these exceptions into config? */}
        <Route
          exact
          path={settingsPath("groups", ":id", "members")}
          component={GroupMembers.Component}
        />
        <Route
          exact
          path={settingsPath("applications", ":id")}
          component={Application.Component}
        />
        <Route
          exact
          path={settingsPath("templates", "new")}
          component={TemplateNew.Component}
        />
        <Route
          exact
          path={settingsPath("templates", ":id")}
          component={Template.Component}
        />
        <Route component={Error404} />
      </Switch>
    </Measure>
  );
}

const Measure = styled.div<{ $width: string }>`
  display: contents;
  --content-measure: ${(props) => props.$width};
  --content-margin: 0;

  ${breakpoint("tablet")`
    --content-measure: calc(${(props: { $width: string }) => props.$width} - ${2 * COLUMN_PADDING}px);
    --content-margin: 0 0 0 ${COLUMN_PADDING - CONTAINER_PADDING}px;
  `}

  @media (max-width: 768px) and (hover: none), (max-width: 768px) {
    button,
    input:not([type="checkbox"]),
    select,
    a[role="tab"],
    [role="button"] {
      min-height: ${TOUCH_TARGET}px;
      min-width: ${TOUCH_TARGET}px;
    }
  }
`;

export default observer(SettingsRoutes);
