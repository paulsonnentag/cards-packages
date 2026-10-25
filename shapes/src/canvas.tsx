import { For, type Component, type JSX } from "solid-js";
import { Pointers, state, State, type Behavior, type Node } from "@cards/core";
import { elementOf } from "@cards/core/dom";
import { Child } from "@cards/core/render";
import { Drop, Place, tags, type Canvas, type Shape } from "./index.js";

// A surface in plain pixels: x and y are offsets from its top-left, scale is the size on screen.
export default (({ url, request, on }) => {
  const canvas = () => request(State).read<Canvas>();

  request(State).put({
    [`@tags/${tags.container}`]: true,
    [`@tags/${tags.surface}`]: true,
    takes: tags.shape,
    view: () => (
      <CanvasView
        url={url}
        children={canvas().children ?? []}
        pointers={request(Pointers) ?? []}
      />
    ),
  });

  on(Drop, ({ node, client, scale }) => {
    const origin = elementOf(url)!.getBoundingClientRect();
    request(Place, {
      node,
      fields: { x: client.x - origin.left, y: client.y - origin.top, scale },
    });
    return url;
  });
}) satisfies Behavior;

// pointers come last so cursors and what they hold draw above every shape
const CanvasView: Component<{
  url: Node["url"];
  children: Node[];
  pointers: Node[];
}> = (props) => (
  <div class="canvas" data-node={props.url} data-pan>
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
