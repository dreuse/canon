import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { UserPreference } from "@shared/types";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import useCurrentUser from "~/hooks/useCurrentUser";
import { CommentSortType } from "~/types";

const CommentSortMenu = () => {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const preferredSortType = user.getPreference(
    UserPreference.SortCommentsByOrderInDocument
  )
    ? CommentSortType.OrderInDocument
    : CommentSortType.MostRecent;

  const handleChange = React.useCallback(
    (val: CommentSortType) => {
      if (val !== preferredSortType) {
        user.setPreference(
          UserPreference.SortCommentsByOrderInDocument,
          val === CommentSortType.OrderInDocument
        );
        void user.save();
      }
    },
    [user, preferredSortType]
  );

  const options: Option[] = React.useMemo(
    () =>
      [
        {
          type: "item",
          label: t("Recent"),
          value: CommentSortType.MostRecent,
        },
        {
          type: "item",
          label: t("Order in doc"),
          value: CommentSortType.OrderInDocument,
        },
      ] satisfies Option[],
    [t]
  );

  return (
    <Select
      options={options}
      value={preferredSortType}
      onChange={handleChange}
      label={t("Sort comments")}
      labelHidden
      borderOnHover
    />
  );
};

const Select = styled(InputSelect)`
  min-width: 0;
  color: ${s("textSecondary")};
`;

export default CommentSortMenu;
