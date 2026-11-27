import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "mobx-react";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import stores from "~/stores";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { DocumentEdit } from "./DocumentEdit";

const DOCUMENT_ID = "doc-1";
const NEW_TITLE = "PRODESP integration";

function renderEdit(onSubmit: () => void) {
  const document = stores.documents.add({
    id: DOCUMENT_ID,
    title: "PRODESP",
    icon: null,
    color: null,
  });

  return render(
    <ThemeProvider theme={light}>
      <Provider rootStore={stores}>
        <ActionContextProvider>
          <DocumentEdit document={document} onSubmit={onSubmit} />
        </ActionContextProvider>
      </Provider>
    </ThemeProvider>
  );
}

describe("DocumentEdit", () => {
  it("saves the new name and closes", async () => {
    const update = vi
      .spyOn(stores.documents, "update")
      .mockResolvedValue(stores.documents.get(DOCUMENT_ID)!);
    const onSubmit = vi.fn();
    renderEdit(onSubmit);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: NEW_TITLE },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: DOCUMENT_ID, title: NEW_TITLE })
    );
  });
});
