import {
  card,
  message,
  NewNode,
  packageUrl,
  tag,
  type Node,
  type Tagged,
} from "@cards/core";
import { tags as shapes, type Point, type Shape } from "@cards/shapes";

export const url = packageUrl(import.meta.url);

export const tags = {
  pointer: tag(url, "pointer"),
  tool: tag(url, "tool"), // one tool on a surface is selected at a time
  default: tag(url, "default"), // the tool selected when none is
  selection: tag(url, "selection"),
  select: tag(url, "select"),
  inspector: tag(url, "inspector"),
  template: tag(url, "template"), // dragged out as a copy
};

export type Pointer = Shape & {
  // puts
  position?: Point; // on the root surface, so it means the same in every tab
  client?: () => Point | undefined; // where it is on this screen: the pointer card works it out in every tab
  claimedBy?: Node; // put by the pointer for one press, or by a tool for as long as it wants every press
  holding?: Node; // what the pointer carries while a tool drags it; rendered here, under the cursor
  grip?: Grip;
};
export type Grip = {
  grab: Point; // where the held node was grabbed, in its own pixels
  scale: number; // its scale on screen
  over?: Node; // the container that would take it
};
export type Tool = Tagged & { selected?: boolean }; // put by the tool card
export type Selection = Tagged & { tool?: Node }; // tool is a put

// `target` is the innermost node under the pointer, looking through anything held; bind it with nodeIn in your
// own scope. `grab`, on PointerDown, is where on the target it was pressed, in the target's own pixels, and the
// target's scale on screen
export type PointerInput = {
  client: Point;
  target: Node["url"];
  grab?: { at: Point; scale: number };
  claimedBy?: Node["url"];
};

// Sent by a pointer to itself; subscribe with pointer.on(...). Handlers run newest first and call next() to pass
// the event on. A PointerDown or PointerMove handler claims the press by returning its url instead of calling
// next(); until release, moves and ups carry claimedBy, and everyone else should just call next(). A press on
// something that handles it itself (it calls preventDefault on pointerdown) never reaches the pointer.
// A tool that wants every press, buttons included, puts its url as claimedBy on the pointer: then every press
// except those on that tool's own view goes to it before the page sees it.
export const PointerDown = message<PointerInput, Node["url"] | undefined>(
  `${url}#pointer-down`,
);
export const PointerMove = message<PointerInput, Node["url"] | undefined>(
  `${url}#pointer-move`,
);
export const PointerUp = message<PointerInput, void>(`${url}#pointer-up`);
// sent by a tool to its own node to select or deselect itself
export const Toggle = message<void, void>(`${url}#toggle`);

const PointerEvents = [PointerDown, PointerMove, PointerUp];

export const cards = [
  card({
    id: "card",
    title: "Card",
    description:
      "Shows a card with its example. Drag the example out to make a copy.",
    matches: "card",
    accepts: [],
    behavior: () => import("./card.js"),
  }),
  card({
    id: "pointer",
    title: "Pointer",
    description:
      "Every user's cursor, and what it holds. Yours turns presses on the canvas into pointer events; a subscriber can claim a press.",
    matches: tags.pointer,
    accepts: [],
    behavior: () => import("./pointer.js"),
  }),
  card({
    id: "tool",
    title: "Tool",
    description:
      "Selection for anything tagged tool. A default tool takes over when none is selected.",
    matches: tags.tool,
    accepts: [Toggle],
    behavior: () => import("./tool.js"),
  }),
  card({
    id: "select",
    title: "Select",
    description:
      "The default tool. Drag things to move them between containers; a click still reaches what you click.",
    matches: tags.select,
    accepts: PointerEvents,
    behavior: () => import("./select.js"),
    example: ({ request }) => request(NewNode, shape(tags.select)),
  }),
  card({
    id: "inspector",
    title: "Inspector",
    description:
      "A tool that picks a node, buttons included, and shows where it sits in the hierarchy and its data.",
    matches: tags.inspector,
    accepts: PointerEvents,
    behavior: () => import("./inspector.js"),
    example: ({ request }) => request(NewNode, shape(tags.inspector)),
  }),
];

function shape(tag: string): Shape {
  return { "@tags": { [shapes.shape]: true, [tag]: true }, x: 0, y: 0 };
}
