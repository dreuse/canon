import { observer } from "mobx-react";
import styled from "styled-components";
import { s } from "@shared/styles";
import { VoBellIcon } from "~/components/Icons/VobysIcons";
import useStores from "~/hooks/useStores";
import Relative from "../Sidebar/components/Relative";

const NotificationIcon = () => {
  const { notifications } = useStores();
  const count = notifications.approximateUnreadCount;

  return (
    <Relative style={{ height: 16 }}>
      <VoBellIcon />
      {count > 0 && <Badge />}
    </Relative>
  );
};

const Badge = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${s("accent")};
  top: 0;
  right: 0;
`;

export default observer(NotificationIcon);
