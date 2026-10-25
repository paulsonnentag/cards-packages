import { createEffect, createMemo } from "solid-js";
import {
  hasTag,
  MyPointer,
  NewNode,
  rootOf,
  State,
  type Behavior,
  type Node,
} from "@cards/core";
import { Drop, tags as shapes, type Point, type Shape } from "@cards/shapes";
import {
  PointerDown,
  PointerMove,
  PointerUp,
  tags as tools,
  Toggle,
  type Tool,
} from "@cards/tools";
import { tags, type Line } from "./index.js";

type Pen = Shape &
  Tool & {
    // puts
    press?: { from: Point; on: Node }; // where the pen went down on screen, and the node under it
    stroke?: Node; // the line being drawn
  };

const THRESHOLD = 2;

// Draws only once the pen moves, so a click still reaches what was clicked, buttons included
export default (({ url, parent, request }) => {
  request(State).put(`@tags/${tools.tool}`, true);
  const self = () => request(State).read<Pen>();
  const selected = () => self().selected ?? false;
  const pointer = createMemo(() => request(MyPointer));

  createEffect(() => {
    const p = pointer();
    if (!p) return;
    p.on(PointerDown, (e, next) => {
      if (!e.claimedBy && selected())
        request(State).put("press", { from: e.client, on: e.target });
      return next();
    });
    p.on(PointerMove, (e, next) => {
      const press = self().press;
      if (e.claimedBy === url) extend(e.client);
      else if (!e.claimedBy && press && moved(press.from, e.client)) {
        start();
        extend(e.client);
        return url;
      } else return next();
    });
    p.on(PointerUp, (e, next) => {
      if (self().press)
        request(State).put({ press: undefined, stroke: undefined });
      if (e.claimedBy !== url) next();
    });
  });

  request(State).put("view", () => (
    <button
      class="btn"
      classList={{ active: selected() }}
      onClick={() => request(Toggle)}
    >
      ✎ Pen
    </button>
  ));

  // the surface the pen went down on decides where the line lives; points are screen pixels from there
  function start() {
    const { from, on } = self().press!;
    const surface = surfaceOf(on) ?? rootOf(parent!);
    const line = request(NewNode, {
      "@tags": { [shapes.shape]: true, [tags.line]: true },
      x: 0,
      y: 0,
      points: [{ x: 0, y: 0 }],
      color: "#1d1d1f",
      width: 2,
    } satisfies Line);
    surface.request(Drop, { node: line, client: from, scale: 1 });
    request(State).put("stroke", line.url);
  }

  function extend(client: Point) {
    const { stroke, press } = self();
    if (!stroke || !press) return;
    stroke.request(State).change((d: Line) => {
      d.points.push({ x: client.x - press.from.x, y: client.y - press.from.y });
    });
  }
}) satisfies Behavior;

function moved(from: Point, to: Point) {
  return Math.hypot(to.x - from.x, to.y - from.y) >= THRESHOLD;
}

// the nearest surface, from `node` up
function surfaceOf(node: Node): Node | undefined {
  for (let n: Node | undefined = node; n; n = n.parent)
    if (hasTag(n, shapes.surface)) return n;
  return undefined;
}
