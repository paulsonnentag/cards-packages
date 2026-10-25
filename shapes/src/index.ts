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
  container: tag(url, "container"), // holds children and answers Place, Remove and Taker
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

// Container protocol. A container says what it takes with `takes`; Taker, sent from where something is held,
// answers with the nearest container that takes it. Drop hands a node to a container: `client` is where its origin
// goes on screen, `scale` its size on screen. Place and Remove change a container's children, Pan moves a
// surface's view.
export type DropRequest = {
  node: Node;
  client: Point;
  scale: number;
  pointer?: Point; // where the pointer is, if not at the origin
};
export type PanRequest = { delta: Point };
// with `at`, the node ends up at that index, counted without it, so a child already there is moved
export type PlaceRequest = {
  node: Node;
  fields: Record<string, unknown>;
  at?: number;
};

export const Drop = message<DropRequest, Node["url"] | undefined>(
  `${url}#drop`,
);
export const Pan = message<PanRequest, void>(`${url}#pan`);
export const Place = message<PlaceRequest, void>(`${url}#place`);
export const Remove = message<{ node: Node }, boolean>(`${url}#remove`);
export const Taker = message<{ node: Node }, Node | undefined>(`${url}#taker`);

export const cards = [
  card({
    id: "container",
    title: "Container",
    description:
      "Places, removes and claims children for anything tagged container.",
    matches: tags.container,
    accepts: [Place, Remove, Taker],
    behavior: () => import("./container.js"),
  }),
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
