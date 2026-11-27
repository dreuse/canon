import type { Node, Schema } from "prosemirror-model";
import type { EmbedDescriptor } from "../embeds";
import { isList } from "../queries/isList";

export function getMatchingEmbed(
  embeds: EmbedDescriptor[],
  href: string
): { embed: EmbedDescriptor; matches: RegExpMatchArray } | undefined {
  for (const e of embeds) {
    const matches = e.matcher(href);
    if (matches) {
      return { embed: e, matches };
    }
  }

  return undefined;
}

const GENERIC_EMBED_ID = "embed";

/**
 * Finds an enabled embed made for the link, ignoring the generic iframe embed.
 *
 * @param embeds the available embeds.
 * @param href the link to embed.
 * @returns the matching embed, or undefined when only the generic one matches.
 */
export function getSpecificEmbed(
  embeds: EmbedDescriptor[],
  href: string
): EmbedDescriptor | undefined {
  const embed = getMatchingEmbed(embeds, href)?.embed;
  return embed && !embed.disabled && embed.id !== GENERIC_EMBED_ID
    ? embed
    : undefined;
}

export function transformListToEmbeds(listNode: Node, schema: Schema): Node[] {
  const nodes: Node[] = [];

  listNode.forEach((node) => {
    nodes.push(...transformListItemToEmbeds(node, schema));
  });

  return nodes;
}

function transformListItemToEmbeds(listItemNode: Node, schema: Schema): Node[] {
  const nodes: Node[] = [];

  listItemNode.forEach((node) => {
    if (node.type.name === "paragraph") {
      const url = node.textContent;
      nodes.push(schema.nodes.embed.create({ href: url }));
    } else if (isList(node, schema)) {
      nodes.push(...transformListToEmbeds(node, schema));
    }
  });

  return nodes;
}
