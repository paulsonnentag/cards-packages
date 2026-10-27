import { card, NewNode, packageUrl, tag } from "@cards/core";
import { tags as shapes, type Shape } from "@cards/shapes";

export const url = packageUrl(import.meta.url);

export const tags = {
  sheep: tag(url, "sheep"),
};

export const cards = [
  card({
    id: "sheep",
    title: "Sheep",
    description:
      "Sheepy. Wanders about wherever you put it, on a canvas or a map.",
    matches: tags.sheep,
    accepts: [],
    behavior: () => import("./sheep.js"),
    example: ({ request }) =>
      request(NewNode, {
        "@tags": { [shapes.shape]: true, [tags.sheep]: true },
        x: 0,
        y: 0,
      } satisfies Shape),
  }),
];
