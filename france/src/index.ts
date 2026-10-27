import { card, NewNode, packageUrl, tag } from "@cards/core";
import { tags as shapes, type Shape } from "@cards/shapes";

export const url = packageUrl(import.meta.url);

export const tags = {
  french: tag(url, "french"),
};

export const cards = [
  card({
    id: "french",
    title: "French",
    description:
      "Anything French wears a beret, as long as it's on a map, in France. Give a sheep the french tag and walk it there.",
    matches: tags.french,
    accepts: [],
    behavior: () => import("./french.js"),
    example: ({ request }) =>
      request(NewNode, {
        "@tags": { [shapes.shape]: true, [tags.french]: true },
        x: 0,
        y: 0,
      } satisfies Shape),
  }),
];
