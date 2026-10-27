import { createEffect, onCleanup } from "solid-js";
import { NewComputedNode, State, type Behavior } from "@cards/core";
import { tags as shapes, type Shape } from "@cards/shapes";
import { tags } from "./index.js";

// A beret on whatever it's dealt to: a computed hat at the target's position, put among the target's container's
// children just above the target. It sits at the target's origin in the container's terms and draws itself above
// it in its own pixels, so it fits on any container, whatever its units. Dragging it off takes a stored copy; this
// one stays on.
export default ((target) => {
  const { request } = target;
  const beret = request(NewComputedNode, {
    "@tags": { [shapes.shape]: true, [tags.hat]: true },
    x: 0,
    y: 0,
  });

  createEffect(() => {
    const { x, y, scale, glide, order } = request(State).read<Shape>();
    beret.request(State).put({ x, y, scale, glide, order: (order ?? 0) + 0.5 });
  });

  createEffect(() => {
    const container = target.parent;
    if (!container) return;
    const path = `children/${beret.url}`;
    container.request(State).put(path, beret.url);
    onCleanup(() => container.request(State).put(path, undefined));
  });
}) satisfies Behavior;
