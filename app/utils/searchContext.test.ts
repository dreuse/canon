import { describe, expect, it } from "vitest";
import { queryIsInTitle, trimSearchContext } from "./searchContext";

describe("queryIsInTitle", () => {
  it("matches regardless of case", () => {
    expect(queryIsInTitle("Onboarding Técnico", "onboarding")).toBe(true);
  });

  it("is false without a query", () => {
    expect(queryIsInTitle("Onboarding Técnico")).toBe(false);
  });

  it("is false when the query only appears in the body", () => {
    expect(queryIsInTitle("Início Rápido", "onboarding")).toBe(false);
  });
});

describe("trimSearchContext", () => {
  it("starts at the sentence that holds the match", () => {
    expect(
      trimSearchContext(
        ". Tour guiado Clique em Tour no rodapé. O sistema navega até o <b>onboarding</b> interativo"
      )
    ).toBe("O sistema navega até o <b>onboarding</b> interativo");
  });

  it("keeps sentences that end after the match", () => {
    expect(
      trimSearchContext(
        "Guia de implantação, <b>onboarding</b> técnico. E mais"
      )
    ).toBe("Guia de implantação, <b>onboarding</b> técnico. E mais");
  });

  it("drops a leading partial word when no sentence break precedes the match", () => {
    expect(trimSearchContext("gem numerava até <b>7</b> itens")).toBe(
      "numerava até <b>7</b> itens"
    );
  });

  it("strips leading punctuation before a capitalised start", () => {
    expect(trimSearchContext("… Analistas em <b>onboarding</b>")).toBe(
      "Analistas em <b>onboarding</b>"
    );
  });

  it("starts at the line that holds the match", () => {
    expect(
      trimSearchContext(
        " estão na Documentação Técnica.\nPré-requisitos\n<b>Onboarding</b> cultural concluído"
      )
    ).toBe("<b>Onboarding</b> cultural concluído");
  });

  it("keeps a fragment that opens on the match itself", () => {
    expect(trimSearchContext("<b>onboarding</b> do time")).toBe(
      "<b>onboarding</b> do time"
    );
  });

  it("keeps the whole fragment when nothing is marked", () => {
    expect(
      trimSearchContext("Guia de implantação.\nRequisitos mínimos\nUma máquina")
    ).toBe("Guia de implantação.\nRequisitos mínimos\nUma máquina");
  });
});
