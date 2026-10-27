import { card, NewNode, packageUrl, tag, type Node } from "@cards/core";
import {
  Drop,
  tags as shapes,
  type Container,
  type Shape,
} from "@cards/shapes";

export const url = packageUrl(import.meta.url);

export const tags = {
  deck: tag(url, "deck"),
};

export type Deck = Shape &
  Container & {
    selected?: Node; // put
  };

export const cards = [
  card({
    id: "deck",
    title: "Deck",
    description:
      "Holds cards. Drop cards onto it; the cards on a deck stay active.",
    matches: tags.deck,
    accepts: [Drop],
    behavior: () => import("./deck.js"),
    example: ({ request }) =>
      request(NewNode, {
        "@tags": { [shapes.shape]: true, [tags.deck]: true },
        x: 0,
        y: 0,
        children: {},
      } satisfies Deck),
  }),
];
