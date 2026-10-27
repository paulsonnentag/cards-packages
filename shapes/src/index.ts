import {
  card,
  message,
  packageUrl,
  state,
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
    order?: number; // where it stacks among its container's children, lowest first
    glide?: number; // milliseconds a change of position animates over, for shapes that move by themselves
  };
export type Container = Tagged & {
  // by url: stored ones are urls in the document, put ones (a computed node) are puts at children/<url>
  children?: Record<Node["url"], Node>;
  takes?: Record<string, true>; // puts, one per tag: a node with any of these tags can be dropped here
};
export type Canvas = Container &
  Viewed & {
    objects?: Node[]; // non-visual objects, e.g. created by a Lookup with orCreate
  };

// Container protocol. A container says what it takes with `takes` and is the only one that stores into its
// `children`: Drop hands it a node, `client` is where the node's origin goes on screen and `scale` its scale on
// screen, and it answers with its url once the node is in. A node leaves its container when the select tool
// lifts it. Several cards can take drops on one node, so each handler calls next() for what isn't its kind.
// Move asks a node's container to move it `by` the node's own pixels, and is answered by the container that
// holds it. A card can also put a computed node in a container's children; the container draws it like any other.
export type DropRequest = {
  node: Node;
  client: Point;
  scale: number;
  pointer?: Point; // where the pointer is, if not at the origin
};

export type MoveRequest = { node: Node; by: Point };

export const Drop = message<DropRequest, Node["url"] | undefined>(
  `${url}#drop`,
);
export const Move = message<MoveRequest, Node["url"] | undefined>(
  `${url}#move`,
);

// a container's children as it draws them, by `order`, then by url so every tab stacks ties the same way
export function ordered(children: Container["children"]): Node[] {
  return Object.values(children ?? {}).sort(
    (a, b) =>
      orderOf(a) - orderOf(b) || (a.url < b.url ? -1 : a.url > b.url ? 1 : 0),
  );
}

// the order that puts a node at `index` among `nodes` (as `ordered` returns them): between its neighbours
export function orderAt(nodes: Node[], index: number): number {
  const before = nodes[index - 1];
  const after = nodes[index];
  if (before && after) return (orderOf(before) + orderOf(after)) / 2;
  if (before) return orderOf(before) + 1;
  if (after) return orderOf(after) - 1;
  return 0;
}

function orderOf(node: Node): number {
  return state<Partial<Shape>>(node).order ?? 0;
}

export const cards = [
  card({
    id: "canvas",
    title: "Canvas",
    description:
      "A surface in plain pixels. Positions its children; each child draws itself.",
    matches: tags.canvas,
    accepts: [Drop, Move],
    behavior: () => import("./canvas.js"),
  }),
];
