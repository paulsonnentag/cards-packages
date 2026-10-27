import { card, NewNode, packageUrl, tag } from "@cards/core";
import { tags as shapes, type Shape } from "@cards/shapes";

export const url = packageUrl(import.meta.url);

export const tags = {
  beret: tag(url, "beret"), // wears a beret
  hat: tag(url, "hat"), // is one
};

export const cards = [
  card({
    id: "beret",
    title: "Beret",
    description:
      "Puts a beret on any shape tagged beret. The beret isn't stored: it's computed from the shape and goes wherever it goes. Drag it off to take a copy.",
    matches: tags.beret,
    accepts: [],
    behavior: () => import("./beret.js"),
    example: ({ request }) =>
      request(NewNode, {
        "@tags": { [shapes.shape]: true, [tags.beret]: true },
        x: 0,
        y: 0,
      } satisfies Shape),
  }),
  card({
    id: "hat",
    title: "Hat",
    description: "Draws a beret, on its own or on someone's head.",
    matches: tags.hat,
    accepts: [],
    behavior: () => import("./hat.js"),
    example: ({ request }) =>
      request(NewNode, {
        "@tags": { [shapes.shape]: true, [tags.hat]: true },
        x: 0,
        y: 0,
      } satisfies Shape),
  }),
];
