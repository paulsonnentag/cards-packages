import {
  createEffect,
  createMemo,
  For,
  Show,
  type Component,
  type JSX,
} from "solid-js";
import {
  Describe,
  NewComputedNode,
  state,
  State,
  type Behavior,
  type Card,
  type CardDescriptor,
  type Node,
} from "@cards/core";
import { Child, View } from "@cards/core/render";
import { ordered, type Container, type Shape } from "@cards/shapes";
import { tags } from "./index.js";

const BOX = 140;

// children are what is put on the card from its example, like the example's beret; token is a put
type Dealt = Card & Pick<Container, "children"> & { token?: Node };

// Renders every card: its title and description, from its package, the tag it's dealt to, and an example. The
// tag and the example are templates: dragging them out drops a copy.
export default (({ request }) => {
  const card = () => request(State).read<Dealt>();
  const matches = createMemo(() => request(Describe)?.matches);
  // computed in every tab rather than stored: it is the descriptor's tag, which only the package knows
  const token = createMemo(() => {
    const tag = matches();
    return tag
      ? request(NewComputedNode, { "@tags": { [tags.token]: true }, tag })
      : undefined;
  });

  request(State).put("view", () => (
    <CardView card={card()} descriptor={request(Describe)} />
  ));

  createEffect(() => {
    const t = token();
    t?.request(State).put(`@tags/${tags.template}`, true);
    request(State).put("token", t?.url);
  });

  createEffect(() =>
    card().example?.request(State).put(`@tags/${tags.template}`, true),
  );
}) satisfies Behavior;

const CardView: Component<{ card: Dealt; descriptor?: CardDescriptor }> = (
  props,
) => (
  <div class="paper card">
    <Show when={props.card.token}>
      {(token) => (
        <div class="card-token" data-node={token().url}>
          <View node={token()} />
        </div>
      )}
    </Show>
    <h3 class="card-title">
      {props.descriptor?.title ?? props.card.card?.split("#").pop()}
    </h3>
    <div class="card-body">
      <Show when={props.card.example}>
        {(example) => (
          <div class="example" data-node={example().url}>
            <Preview
              example={example()}
              around={ordered(props.card.children)}
            />
          </div>
        )}
      </Show>
      <p class="description">{props.descriptor?.description ?? "Loading…"}</p>
    </div>
  </div>
);

// the example's own view, with what is put around it, scaled down to fit the box
const Preview: Component<{ example: Node; around: Node[] }> = (props) => {
  let content!: HTMLDivElement;

  createEffect(() => {
    state<Shape>(props.example);
    for (const node of props.around) state<Shape>(node);
    requestAnimationFrame(() => fit(content));
  });

  return (
    <div class="example-content" ref={content}>
      <View node={props.example} />
      <For each={props.around}>
        {(node) => <Child node={node} style={relative(node, props.example)} />}
      </For>
    </div>
  );
};

// a node where it sits next to the example, as a container would place it
function relative(node: Node, example: Node): JSX.CSSProperties {
  const s = state<Shape>(node);
  const e = state<Shape>(example);
  return {
    left: `${(s.x ?? 0) - (e.x ?? 0)}px`,
    top: `${(s.y ?? 0) - (e.y ?? 0)}px`,
    transform: `scale(${s.scale ?? 1})`,
  };
}

function fit(content: HTMLElement) {
  content.style.transform = "none";
  const origin = content.getBoundingClientRect();
  const box = bounds(content);
  if (!box) return;
  const scale = Math.min(1, (BOX - 20) / box.width, (BOX - 20) / box.height);
  const dx = (BOX - box.width * scale) / 2 - (box.left - origin.left) * scale;
  const dy = (BOX - box.height * scale) / 2 - (box.top - origin.top) * scale;
  content.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
}

// what an element draws, including descendants that overflow it (a line's svg is 1×1)
function bounds(el: Element): DOMRect | undefined {
  let box: DOMRect | undefined;
  for (const r of [el, ...el.querySelectorAll("*")].map((e) =>
    e.getBoundingClientRect(),
  )) {
    if (r.width === 0 && r.height === 0) continue;
    if (!box) box = DOMRect.fromRect(r);
    else {
      const left = Math.min(box.left, r.left);
      const top = Math.min(box.top, r.top);
      box = new DOMRect(
        left,
        top,
        Math.max(box.right, r.right) - left,
        Math.max(box.bottom, r.bottom) - top,
      );
    }
  }
  return box;
}
