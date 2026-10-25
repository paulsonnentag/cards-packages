import { batch, createEffect, createMemo } from "solid-js";
import {
  hasTag,
  MyPointer,
  nodeIn,
  rootOf,
  state,
  State,
  type Behavior,
  type Node,
} from "@cards/core";
import { Drop, type Container, type Point, type Shape } from "@cards/shapes";
import {
  PointerDown,
  PointerMove,
  PointerUp,
  tags,
  Toggle,
  type Grip,
  type Pointer,
  type PointerInput,
  type Tool,
} from "./index.js";

const THRESHOLD = 4; // pixels before a press becomes a drag, so plain clicks still reach the shape's own UI

// what's being pressed (puts); once lifted, the pointer holds `target`
type Press = {
  target: Node; // what was pressed; once lifted, what is held, which is a copy if a template was pressed
  start: Point;
  grab: Point; // where the target was grabbed, in its own pixels
  scale: number; // its scale on screen, once lifted: the scale it's held at
  lifted?: boolean; // past the threshold: taken from its container, in the pointer's hand
};
type Select = Shape & Tool & { press?: Press };

// The default tool: drag anything to move it between containers. It claims a press only once it becomes a drag,
// so a click still reaches what was clicked. A template (a card's example) stays where it is; a copy of it is
// what gets dragged.
export default (({ url, parent, scope, request }) => {
  request(State).put(`@tags/${tags.tool}`, true);
  const self = () => request(State).read<Select>();
  const selected = () => self().selected ?? false;
  const root = () => rootOf(parent!);
  const pointer = createMemo(() => request(MyPointer));
  const hand = () => pointer()!.request(State);

  createEffect(() => {
    const p = pointer();
    if (!p) return;
    p.on(PointerDown, (e, next) => {
      if (!e.claimedBy && selected()) press(e);
      return next();
    });
    p.on(PointerMove, (e, next) => {
      if (e.claimedBy === url) follow(self().press!, e);
      else if (!e.claimedBy && self().press && start(e)) return url;
      else return next();
    });
    p.on(PointerUp, (e, next) => {
      if (e.claimedBy === url) return release(e);
      if (self().press) request(State).put("press", undefined);
      next();
    });
  });

  request(State).put("view", () => (
    <button
      class="btn"
      classList={{ active: selected() }}
      onClick={() => request(Toggle)}
    >
      ↖ Select
    </button>
  ));

  function press(e: PointerInput) {
    request(State).put("press", {
      target: nodeIn(scope, e.target),
      start: e.client,
      grab: e.grab?.at ?? { x: 0, y: 0 },
      scale: e.grab?.scale ?? 1,
    } satisfies Press);
  }

  // past the threshold a press becomes a drag: true once it lifted what was pressed and should claim the pointer
  function start(e: PointerInput): boolean {
    const p = self().press!;
    if (distance(p.start, e.client) < THRESHOLD) return false;
    if (p.target.url === root().url) return false;
    lift(p);
    return true;
  }

  // takes the pressed node out of its container and puts it in the pointer's hand. A template stays where it is:
  // a full-size copy is what the pointer takes
  function lift(p: Press) {
    const template = hasTag(p.target, tags.template);
    const lifted: Press = {
      ...p,
      target: template ? p.target.request(State).clone() : p.target,
      scale: template ? 1 : p.scale,
      lifted: true,
    };
    batch(() => {
      if (!template) takeOut(p.target);
      hand().put({ holding: lifted.target.url, grip: grip(lifted) });
      request(State).put("press", lifted);
    });
  }

  // tells the pointer which container would take what it holds, so that container and the held node can show it
  function follow(p: Press, e: PointerInput) {
    const under = nodeIn(scope, e.target);
    hand().put("grip", grip(p, dropTarget(under, p.target)));
  }

  // hands what the pointer holds to the container under it. A Drop nobody on the way answers reaches the root
  // canvas, which takes anything, so it always lands
  function release(e: PointerInput) {
    const p = self().press;
    request(State).put("press", undefined);
    if (!p?.lifted) return;
    const over = state<Pointer>(pointer()!).grip?.over ?? root();
    batch(() => {
      hand().put({ holding: undefined, grip: undefined });
      over.request(Drop, {
        node: p.target,
        client: originAt(e.client, p),
        pointer: e.client,
        scale: p.scale,
      });
    });
  }
}) satisfies Behavior;

// a grip as it is put: the container is stored by url and read back as a node
function grip(p: Press, over?: Node): Record<keyof Grip, unknown> {
  return { grab: p.grab, scale: p.scale, over: over?.url };
}

// the nearest container, from `node` up, whose `takes` the held node carries
function dropTarget(node: Node, held: Node): Node | undefined {
  for (let n: Node | undefined = node; n; n = n.parent) {
    const takes = state<Partial<Container>>(n).takes;
    if (takes !== undefined && hasTag(held, takes)) return n;
  }
  return undefined;
}

// a container adds to its own children on Drop; this is the one place a node leaves one
function takeOut(node: Node) {
  node.parent?.request(State).change((d: Partial<Container>) => {
    const i = (d.children ?? []).findIndex(
      (c) => (c as unknown as string) === node.url,
    );
    if (i >= 0) d.children!.splice(i, 1);
  });
}

// where the held node's top-left goes when the pointer is at `client`
function originAt(client: Point, p: Pick<Press, "grab" | "scale">): Point {
  return { x: client.x - p.grab.x * p.scale, y: client.y - p.grab.y * p.scale };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
