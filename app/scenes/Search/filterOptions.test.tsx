import { render, renderHook } from "@testing-library/react";
import { Provider } from "mobx-react";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import stores from "~/stores";
import { useCollectionOptions } from "./filterOptions";

const COLLECTION_ID = "collection-filter-1";
const COLLECTION_NAME = "Engineering";

describe("useCollectionOptions", () => {
  it("gives each collection option its collection icon and no dot", () => {
    stores.collections.add({
      id: COLLECTION_ID,
      name: COLLECTION_NAME,
      color: "#4f6ef7",
    });
    const { result } = renderHook(() => useCollectionOptions(), {
      wrapper: ({ children }) => (
        <Provider rootStore={stores}>{children}</Provider>
      ),
    });
    const option = result.current.options.find(
      (item) => item.key === COLLECTION_ID
    );

    const { container } = render(
      <Provider rootStore={stores}>
        <ThemeProvider theme={light}>{option?.icon}</ThemeProvider>
      </Provider>
    );

    expect(option?.label).toBe(COLLECTION_NAME);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(
      container.querySelector('[data-testid="collection-dot"]')
    ).toBeNull();
  });
});
