import { render, screen } from "@testing-library/react";
import { runInAction } from "mobx";
import { Provider } from "mobx-react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import stores from "~/stores";
import { PersonalDocs } from "./PersonalDocs";

const USER_ID = "user-1";
const TEAM_ID = "team-1";

beforeAll(() => {
  runInAction(() => {
    stores.users.add({ id: USER_ID, name: "Tester" });
    stores.auth.add({ id: TEAM_ID, name: "Team" });
    stores.policies.add({
      id: TEAM_ID,
      abilities: { createPersonalCollection: true },
    });
    stores.auth.currentTeamId = TEAM_ID;
    stores.auth.currentUserId = USER_ID;
  });
});

describe("PersonalDocs", () => {
  it("R10 renders a dot and a lock on the personal collection row", () => {
    render(
      <ThemeProvider theme={light}>
        <Provider rootStore={stores}>
          <MemoryRouter>
            <PersonalDocs />
          </MemoryRouter>
        </Provider>
      </ThemeProvider>
    );

    expect(screen.getByTestId("collection-dot")).not.toBeNull();
    expect(
      screen.getByRole("img", { name: "Private collection" })
    ).not.toBeNull();
  });
});
