import { For, type Component, type JSX } from "solid-js";
import {
  hasTag,
  Pointers,
  state,
  State,
  type Behavior,
  type Node,
} from "@cards/core";
import { Child } from "@cards/core/render";
import {
  Drop,
  Move,
  ordered,
  orderAt,
  tags,
  type Canvas,
  type Shape,
} from "./index.js";

// A surface in plain pixels: x and y are offsets from its top-left, scale is the size on screen.
export default ((node) => {
  const { url, request, on } = node;
  const canvas = () => request(State).read<Canvas>();
  const children = () => ordered(canvas().children);
  const holds = (child: Node) => canvas().children?.[child.url];
  let frame: HTMLElement | undefined;

  request(State).put({
    [`@tags/${tags.surface}`]: true,
    [`takes/${tags.shape}`]: true,
    view: () => (
      <CanvasView
        url={url}
        children={children()}
        pointers={request(Pointers) ?? []}
        frame={(el) => (frame = el)}
      />
    ),
  });

  // the root takes anything, so whatever is dropped where nothing else takes it still lands somewhere. A drop
  // lands on top
  on(Drop, ({ node: dropped, client, scale }, next) => {
    if (node.parent && !hasTag(dropped, tags.shape)) return next();
    const origin = frame!.getBoundingClientRect();
    const order = orderAt(children(), children().length);
    request(State).change((d: Canvas) => {
      if (!d.children) d.children = {};
      d.children[dropped.url] = dropped;
    });
    holds(dropped)!
      .request(State)
      .change((d: Shape) => {
        d.x = client.x - origin.left;
        d.y = client.y - origin.top;
        d.scale = scale;
        d.order = order;
      });
    return url;
  });

  on(Move, ({ node: moved, by }, next) => {
    const child = holds(moved);
    if (!child) return next();
    child.request(State).change((d: Shape) => {
      d.x += by.x * (d.scale ?? 1);
      d.y += by.y * (d.scale ?? 1);
    });
    return url;
  });
}) satisfies Behavior;

// pointers draw above everything
const CanvasView: Component<{
  url: Node["url"];
  children: Node[];
  pointers: Node[];
  frame(el: HTMLElement): void;
}> = (props) => (
  <div class="canvas" data-node={props.url} ref={props.frame}>
    <For each={props.children}>
      {(child) => <Child node={child} style={placement(child)} />}
    </For>
    <For each={props.pointers}>
      {(pointer) => <Child node={pointer} style={placement(pointer)} />}
    </For>
  </div>
);

function placement(node: Node): JSX.CSSProperties {
  const s = state<Shape>(node);
  return {
    left: `${s.x ?? 0}px`,
    top: `${s.y ?? 0}px`,
    transform: `scale(${s.scale ?? 1})`,
    transition: s.glide
      ? `left ${s.glide}ms linear, top ${s.glide}ms linear`
      : undefined,
  };
}
