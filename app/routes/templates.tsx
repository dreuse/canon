import { Switch } from "react-router-dom";
import { createLazyComponent as lazy } from "~/components/LazyLoad";
import Route from "~/components/ProfiledRoute";
import { templatesPath } from "~/utils/routeHelpers";

const Templates = lazy(() => import("~/scenes/Templates/Templates"), {
  exportName: "Templates",
});
const Template = lazy(() => import("~/scenes/Templates/Template"));
const TemplateNew = lazy(() => import("~/scenes/Templates/TemplateNew"));

/**
 * The routes of the templates page, the new template screen and the template
 * editor.
 *
 * @returns the templates route switch.
 */
export function TemplatesRoutes() {
  return (
    <Switch>
      <Route exact path={templatesPath()} component={Templates.Component} />
      <Route
        exact
        path={`${templatesPath()}/new`}
        component={TemplateNew.Component}
      />
      <Route
        exact
        path={`${templatesPath()}/:id`}
        component={Template.Component}
      />
    </Switch>
  );
}
