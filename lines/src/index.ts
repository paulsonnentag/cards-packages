import { card, NewNode, packageUrl, tag } from "@cards/core";
import { tags as shapes, type Point, type Shape } from "@cards/shapes";
import { PointerDown, PointerMove, PointerUp } from "@cards/tools";

export const url = packageUrl(import.meta.url);

export const tags = {
  line: tag(url, "line"),
  pen: tag(url, "pen"),
};

export type Line = Shape & { points: Point[]; color: string; width: number };

export const cards = [
  card({
    id: "line",
    title: "Line",
    description: "Draws a polyline through its points.",
    matches: tags.line,
    accepts: [],
    behavior: () => import("./line.js"),
    example: ({ request }) =>
      request(NewNode, {
        "@tags": { [shapes.shape]: true, [tags.line]: true },
        x: 0,
        y: 0,
        points: [
          { x: 0, y: 30 },
          { x: 25, y: 0 },
          { x: 50, y: 30 },
          { x: 75, y: 0 },
          { x: 100, y: 30 },
        ],
        color: "#1d1d1f",
        width: 3,
      } satisfies Line),
  }),
  card({
    id: "pen",
    title: "Pen",
    description: "A tool that draws lines onto whatever surface you press.",
    matches: tags.pen,
    accepts: [PointerDown, PointerMove, PointerUp],
    behavior: () => import("./pen.js"),
    example: ({ request }) =>
      request(NewNode, {
        "@tags": { [shapes.shape]: true, [tags.pen]: true },
        x: 0,
        y: 0,
      } satisfies Shape),
  }),
];
