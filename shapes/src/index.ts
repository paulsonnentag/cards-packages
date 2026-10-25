import {
  card,
  message,
  packageUrl,
  tag,
  type Node,
  type Tagged,
} from "@cards/core";
import type { Viewed } from "@cards/core/render";

export const url = packageUrl(import.meta.url);

export const tags = {
  shape: tag(url, "shape"), // drawn by a container at x, y
  surface: tag(url, "surface"), // a container you can draw on
  canvas: tag(url, "canvas"),
};

export type Point = { x: number; y: number };
// x, y and scale are in the container's terms (pixels on a canvas, lng/lat on a map); the view is in plain pixels
export type Shape = Tagged &
  Viewed & {
    x: number;
    y: number;
    scale?: number;
  };
export type Container = Tagged & {
  children: Node[]; // urls in the document, nodes when read
  takes?: string; // put: the tag a node needs to be dropped here
};
export type Canvas = Container &
  Viewed & {
    objects?: Node[]; // non-visual objects, e.g. created by a Lookup with orCreate
  };

// Container protocol. A container says what it takes with `takes` and is the only one that adds to its
// `children`: Drop hands it a node, `client` is where the node's origin goes on screen and `scale` its scale on
// screen, and it answers with its url once the node is in. A node leaves its container when the select tool
// lifts it.
export type DropRequest = {
  node: Node;
  client: Point;
  scale: number;
  pointer?: Point; // where the pointer is, if not at the origin
};

export const Drop = message<DropRequest, Node["url"] | undefined>(
  `${url}#drop`,
);

export const cards = [
  card({
    id: "canvas",
    title: "Canvas",
    description:
      "A surface in plain pixels. Positions its children; each child draws itself.",
    matches: tags.canvas,
    accepts: [Drop],
    behavior: () => import("./canvas.js"),
  }),
];
