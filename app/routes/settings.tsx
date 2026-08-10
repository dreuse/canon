import { Redirect, Switch } from "react-router-dom";
import styled from "styled-components";
import Error404 from "~/scenes/Errors/Error404";
import { createLazyComponent as lazy } from "~/components/LazyLoad";
import Route from "~/components/ProfiledRoute";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import { settingsPath } from "~/utils/routeHelpers";
import { observer } from "mobx-react";

const SETTINGS_MEASURE = "760px";

const TOUCH_TARGET = 44;

const Application = lazy(() => import("~/scenes/Settings/Application"));
const GroupMembers = lazy(() => import("~/scenes/Settings/GroupMembers"), {
  exportName: "GroupMembersScene",
});
const Template = lazy(() => import("~/scenes/Settings/Template"));
const TemplateNew = lazy(() => import("~/scenes/Settings/TemplateNew"));

function SettingsRoutes() {
  const configs = useSettingsConfig();

  return (
    <Measure>
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

const Measure = styled.div`
  display: contents;
  --content-measure: ${SETTINGS_MEASURE};

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
