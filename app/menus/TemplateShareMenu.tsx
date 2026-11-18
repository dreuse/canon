import type { TFunction } from "i18next";
import { observer } from "mobx-react";
import { ExportIcon, GlobeIcon, PadlockIcon } from "outline-icons";
import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { PersonalCollectionId } from "@shared/constants";
import { s } from "@shared/styles";
import { TeamPreference } from "@shared/types";
import {
  ActionSeparator,
  createAction,
  createActionGroup,
  createActionWithChildren,
} from "~/actions";
import { ActiveTemplateSection } from "~/actions/sections";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { MouseSafeArea } from "~/components/MouseSafeArea";
import {
  MenuButton,
  MenuSeparator,
  SubMenu,
  SubMenuContent,
  SubMenuTrigger,
} from "~/components/primitives/Menu";
import * as Components from "~/components/primitives/components/Menu";
import useStores from "~/hooks/useStores";
import type Template from "~/models/Template";
import type RootStore from "~/stores/RootStore";
import type { ActionContext, ActionVariant } from "~/types";

const SUBMENU_WIDTH = "264px";
const COLLECTION_LIST_MAX_HEIGHT = "240px";

interface ShareOption {
  key: string;
  label: string;
  note?: string;
  icon: ReactNode;
  collectionId: string | null;
  checked: boolean;
  enabled: boolean;
}

interface ShareOptions {
  personal?: ShareOption;
  collections: ShareOption[];
  workspace: ShareOption;
}

interface Props {
  template: Template;
}

/**
 * Creates the menu action that shares a template by moving it to the user, a
 * collection or the workspace. Desktop menus get a submenu of radio options and
 * mobile menus get a list of actions.
 *
 * @param template the template to share.
 * @param t the translation function.
 * @param isMobile whether the menu renders as a mobile drawer.
 * @returns the action to add to the template menu.
 */
export function createTemplateShareAction(
  template: Template,
  t: TFunction,
  isMobile: boolean
): ActionVariant {
  const definition = {
    name: `${t("Share")}…`,
    analyticsName: "Share template",
    section: ActiveTemplateSection,
    visible: ({ stores }: ActionContext) =>
      !!stores.policies.abilities(template.id).move,
  };

  if (!isMobile) {
    return createAction({
      ...definition,
      render: () => <TemplateShareMenu template={template} />,
    });
  }

  return createActionWithChildren({
    ...definition,
    icon: <ExportIcon />,
    children: ({ stores }) => {
      const { personal, collections, workspace } = getShareOptions(
        template,
        stores,
        t
      );
      const toAction = (option: ShareOption) =>
        createAction({
          name: option.note ? `${option.label} · ${option.note}` : option.label,
          section: ActiveTemplateSection,
          icon: option.icon,
          selected: option.checked,
          disabled: !option.enabled,
          perform: () => moveTemplateTo(template, option, t),
        });

      return [
        ...(personal
          ? [
              createActionGroup({
                name: t("Who can use"),
                actions: [toAction(personal)],
              }),
            ]
          : []),
        createActionGroup({
          name: t("Collection"),
          actions: collections.map(toAction),
        }),
        ActionSeparator,
        toAction(workspace),
      ];
    },
  });
}

/**
 * A submenu with the places a template can move to, with the current one
 * checked. Places the user may not use are disabled.
 *
 * @param props the template to share.
 * @returns the submenu.
 */
export const TemplateShareMenu = observer(function TemplateShareMenu({
  template,
}: Props) {
  const { t } = useTranslation();
  const stores = useStores();
  const contentRef = useRef<HTMLDivElement>(null);
  const { personal, collections, workspace } = getShareOptions(
    template,
    stores,
    t
  );

  const handleSelect = (option: ShareOption) =>
    moveTemplateTo(template, option, t);

  return (
    <SubMenu>
      <SubMenuTrigger
        label={`${t("Share")}…`}
        icon={
          <Components.MenuIconWrapper aria-hidden>
            <ExportIcon />
          </Components.MenuIconWrapper>
        }
      />
      <SubMenuContent ref={contentRef} style={{ width: SUBMENU_WIDTH }}>
        <MouseSafeArea parentRef={contentRef} />
        {personal && (
          <>
            <OptionGroup label={t("Who can use")}>
              <ShareOptionItem option={personal} onSelect={handleSelect} />
            </OptionGroup>
            <MenuSeparator />
          </>
        )}
        {collections.length > 0 && (
          <>
            <OptionGroup label={t("Collection")} scrollable>
              {collections.map((option) => (
                <ShareOptionItem
                  key={option.key}
                  option={option}
                  onSelect={handleSelect}
                />
              ))}
            </OptionGroup>
            <MenuSeparator />
          </>
        )}
        <OptionGroup>
          <ShareOptionItem option={workspace} onSelect={handleSelect} />
        </OptionGroup>
        <MenuSeparator />
        <Footnote>
          {t(
            "Anyone with access to the destination can see and use this template."
          )}
        </Footnote>
      </SubMenuContent>
    </SubMenu>
  );
});

function OptionGroup({
  label,
  scrollable,
  children,
}: {
  label?: string;
  scrollable?: boolean;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <Group role="group" aria-labelledby={label ? headingId : undefined}>
      {label && <Heading id={headingId}>{label}</Heading>}
      {scrollable ? <Scroll>{children}</Scroll> : children}
    </Group>
  );
}

function ShareOptionItem({
  option,
  onSelect,
}: {
  option: ShareOption;
  onSelect: (option: ShareOption) => void;
}) {
  return (
    <MenuButton
      role="menuitemradio"
      aria-checked={option.checked}
      label={
        <OptionLabel>
          <span>{option.label}</span>
          {option.note && <Note>{option.note}</Note>}
        </OptionLabel>
      }
      icon={
        <Components.MenuIconWrapper aria-hidden>
          {option.icon}
        </Components.MenuIconWrapper>
      }
      selected={option.checked}
      disabled={!option.enabled}
      onClick={() => onSelect(option)}
    />
  );
}

async function moveTemplateTo(
  template: Template,
  option: ShareOption,
  t: TFunction
) {
  if (option.checked) {
    return;
  }

  try {
    await template.save({ collectionId: option.collectionId });
    toast.success(t("Template moved"));
  } catch (_err) {
    toast.error(t("Couldn’t move the template. Try again?"));
  }
}

function getShareOptions(
  template: Template,
  { auth, collections, policies }: RootStore,
  t: TFunction
): ShareOptions {
  const denied = t("No permission in this collection");
  const personalCollection = collections.personal;
  const showPersonal = !!auth.team?.getPreference(TeamPreference.PersonalDocs);
  const workspaceEnabled =
    !!auth.team && !!policies.abilities(auth.team.id).createTemplate;

  return {
    personal: showPersonal
      ? {
          key: "personal",
          label: t("Only you"),
          icon: <PadlockIcon />,
          collectionId: personalCollection?.id ?? PersonalCollectionId,
          checked:
            !!personalCollection &&
            template.collectionId === personalCollection.id,
          enabled: !!auth.user && template.createdBy?.id === auth.user.id,
        }
      : undefined,
    collections: collections.allActive.map((collection) => {
      const enabled = !!policies.abilities(collection.id).createTemplate;
      return {
        key: collection.id,
        label: collection.displayName,
        note: enabled ? undefined : denied,
        icon: <CollectionIcon collection={collection} />,
        collectionId: collection.id,
        checked: template.collectionId === collection.id,
        enabled,
      };
    }),
    workspace: {
      key: "workspace",
      label: t("Workspace"),
      note: workspaceEnabled ? undefined : denied,
      icon: <GlobeIcon />,
      collectionId: null,
      checked: !template.collectionId,
      enabled: workspaceEnabled,
    },
  };
}

const Group = styled.div`
  [aria-checked="true"] ${Components.SelectedIconWrapper} {
    color: ${s("accent")};
  }
`;

const Scroll = styled.div`
  max-height: ${COLLECTION_LIST_MAX_HEIGHT};
  overflow-y: auto;
`;

const Heading = styled.div`
  padding: 6px 12px 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  color: ${s("textSecondary")};
  user-select: none;
`;

const OptionLabel = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Note = styled.span`
  font-size: 12px;
  line-height: 16px;
  color: ${s("textSecondary")};
`;

const Footnote = styled.p`
  margin: 0;
  padding: 6px 12px 8px;
  font-size: 12px;
  line-height: 16px;
  color: ${s("textSecondary")};
`;
