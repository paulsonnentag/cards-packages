import { For, type Component, type JSX } from "solid-js";
import { Pointers, state, State, type Behavior, type Node } from "@cards/core";
import { Child } from "@cards/core/render";
import { Drop, tags, type Canvas, type Shape } from "./index.js";

// A surface in plain pixels: x and y are offsets from its top-left, scale is the size on screen.
export default (({ url, request, on }) => {
  const canvas = () => request(State).read<Canvas>();
  let frame: HTMLElement | undefined;

  request(State).put({
    [`@tags/${tags.surface}`]: true,
    takes: tags.shape,
    view: () => (
      <CanvasView
        url={url}
        children={canvas().children ?? []}
        pointers={request(Pointers) ?? []}
        frame={(el) => (frame = el)}
      />
    ),
  });

  on(Drop, ({ node, client, scale }) => {
    const origin = frame!.getBoundingClientRect();
    request(State).change((d: Canvas) => {
      if (!d.children) d.children = [];
      d.children.push(node);
    });
    const child = canvas().children.find((c) => c.url === node.url)!;
    child.request(State).change((d: Shape) => {
      d.x = client.x - origin.left;
      d.y = client.y - origin.top;
      d.scale = scale;
    });
    return url;
  });
}) satisfies Behavior;

// pointers come last so cursors and what they hold draw above every shape
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
  };
}
