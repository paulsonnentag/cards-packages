import { createEffect, Show, type Component } from "solid-js";
import {
  Describe,
  state,
  State,
  type Behavior,
  type Card,
  type CardDescriptor,
  type Node,
} from "@cards/core";
import { View } from "@cards/core/render";
import type { Shape } from "@cards/shapes";
import { tags } from "./index.js";

const BOX = 140;

// Renders every card: its title and description, from its package, and an example that drags out as a copy.
export default (({ request }) => {
  const card = () => request(State).read<Card>();

  request(State).put("view", () => (
    <CardView card={card()} descriptor={request(Describe)} />
  ));

  // the example is a template: the select tool leaves it here and drops a copy
  createEffect(() =>
    card().example?.request(State).put(`@tags/${tags.template}`, true),
  );
}) satisfies Behavior;

const CardView: Component<{ card: Card; descriptor?: CardDescriptor }> = (
  props,
) => (
  <div class="paper card">
    <h3 class="card-title">
      {props.descriptor?.title ?? props.card.card?.split("#").pop()}
    </h3>
    <div class="card-body">
      <Show when={props.card.example}>
        {(example) => (
          <div class="example" data-node={example().url}>
            <Preview example={example()} />
          </div>
        )}
      </Show>
      <p class="description">{props.descriptor?.description ?? "Loading…"}</p>
    </div>
  </div>
);

// the example's own view, scaled down to fit the box
const Preview: Component<{ example: Node }> = (props) => {
  let content!: HTMLDivElement;

  createEffect(() => {
    state<Shape>(props.example);
    requestAnimationFrame(() => fit(content));
  });

  return (
    <View
      class="example-content"
      node={props.example}
      ref={(el) => (content = el)}
    />
  );
};

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
