import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  type Component,
} from "solid-js";
import {
  MyPointer,
  rootOf,
  State,
  type Behavior,
  type Node,
} from "@cards/core";
import { Child } from "@cards/core/render";
import type { Point } from "@cards/shapes";
import {
  PointerDown,
  PointerMove,
  PointerUp,
  type Grip,
  type Pointer,
} from "./index.js";

type Carried = { node: Node; grip: Grip }; // what the hand shows

const ARRIVAL = 500; // how long a hand keeps showing what someone else dropped, if it doesn't arrive

// Listens on the whole surface it sits on, so presses on shapes reach subscribers too. After a press it follows
// the window rather than capturing the pointer, so buttons still get their clicks. Other users' pointers only
// show where they are and what they hold.
export default (({ url, parent, request }) => {
  const self = () => request(State).read<Pointer>();
  // a memo, so the view only re-listens when this really changes, not on every put at the root
  const mine = createMemo(() => request(MyPointer)?.url === url);
  let pressed = false;
  // Someone else's drop reaches this tab in two parts: their hand empties (presence), then the node arrives where
  // it was dropped (a document sync). Until it arrives, or for a moment if it never does, the hand keeps showing it
  const [waited, setWaited] = createSignal(false);
  const carried = createMemo<Carried | undefined>((last) => {
    const { holding, grip } = self();
    if (holding && grip) {
      setWaited(false);
      return { node: holding, grip };
    }
    if (!last || mine() || waited()) return undefined;
    const arrived = last.node.parent;
    if (arrived && arrived.url !== url) return undefined;
    setTimeout(() => setWaited(true), ARRIVAL);
    return last;
  });
  // held above a container that would take it, other than the canvas itself
  const over = () => {
    const target = carried()?.grip.over;
    return Boolean(target && target.url !== rootOf(parent!).url);
  };

  request(State).put("view", () => (
    <PointerView
      self={self()}
      carried={carried()}
      mine={mine()}
      over={over()}
      listen={listen}
    />
  ));

  function listen(surface: HTMLElement) {
    const emit = (
      msg: typeof PointerDown | typeof PointerMove | typeof PointerUp,
      e: PointerEvent,
    ): any => {
      const rect = surface.getBoundingClientRect();
      const client: Point = { x: e.clientX, y: e.clientY };
      request(State).put("position", {
        x: client.x - rect.left,
        y: client.y - rect.top,
      });
      return request(msg as typeof PointerDown, {
        client,
        element: e.target as Element,
        claimedBy: self().claimedBy?.url,
      });
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pressed = true;
      request(State).put("claimedBy", emit(PointerDown, e));
    };
    const move = (e: PointerEvent) => emit(PointerMove, e);
    const up = (e: PointerEvent) => {
      if (!pressed) return;
      pressed = false;
      emit(PointerUp, e);
      request(State).put("claimedBy", undefined);
    };

    surface.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    onCleanup(() => {
      surface.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    });
  }
}) satisfies Behavior;

const PointerView: Component<{
  self: Pointer;
  carried?: Carried;
  mine: boolean;
  over: boolean;
  listen(surface: HTMLElement): void;
}> = (props) => {
  let el!: HTMLDivElement;
  createEffect(() => {
    if (props.mine) props.listen(el.closest(".canvas") as HTMLElement);
  });
  // the pointer's own origin on the canvas; what it shows is offset from there
  const at = (p: Point) => ({
    x: p.x - (props.self.x ?? 0),
    y: p.y - (props.self.y ?? 0),
  });

  return (
    <div ref={el}>
      <Show when={props.self.position}>
        {(position) => (
          <>
            <Show when={props.carried}>
              {(carried) => {
                const origin = () => {
                  const p = at(position());
                  const g = carried().grip;
                  return {
                    x: p.x - g.grab.x * g.scale,
                    y: p.y - g.grab.y * g.scale,
                  };
                };
                return (
                  <div class="held" classList={{ over: props.over }}>
                    <Child
                      node={carried().node}
                      style={{
                        left: `${origin().x}px`,
                        top: `${origin().y}px`,
                        transform: `scale(${carried().grip.scale})`,
                      }}
                    />
                  </div>
                );
              }}
            </Show>
            <div
              class="cursor"
              classList={{ remote: !props.mine }}
              style={{
                left: `${at(position()).x}px`,
                top: `${at(position()).y}px`,
              }}
            />
          </>
        )}
      </Show>
    </div>
  );
};
