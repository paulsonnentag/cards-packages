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
  type PointerInput,
} from "./index.js";

type Carried = { node: Node; grip: Grip }; // what the hand shows

const ARRIVAL = 500; // how long a hand keeps showing what someone else dropped, if it doesn't arrive

// The one card that looks at the page as a whole: it turns presses on the surface it sits on into pointer events
// that say which node is under it. A press is captured only once someone claims it, so a plain click still
// reaches what was clicked. Other users' pointers only show where they are and what they hold.
export default (({ url, parent, request }) => {
  const self = () => request(State).read<Pointer>();
  // a memo, so the view only re-listens when this really changes, not on every put at the root
  const mine = createMemo(() => request(MyPointer)?.url === url);
  let frame: HTMLElement | undefined;
  // the surface this pointer is drawn on, and so the one its position is on
  const surface = () => frame?.closest<HTMLElement>(".canvas") ?? undefined;
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

  request(State).put({
    // a function, like a view, so presence leaves it in this tab
    client: () => {
      const position = self().position;
      const rect = surface()?.getBoundingClientRect();
      if (!position || !rect) return undefined;
      return { x: position.x + rect.left, y: position.y + rect.top };
    },
    view: () => (
      <PointerView
        self={self()}
        carried={carried()}
        mine={mine()}
        over={over()}
        frame={(el) => (frame = el)}
        listen={listen}
      />
    ),
  });

  // On the window, in both phases: Solid hands most events to their handlers from the document, so only the
  // window sees a press before and after all of them
  function listen() {
    const canvas = surface();
    if (!canvas) return;
    let pressed = false;
    let claimed = false; // this press is claimed by whoever answered for it, not by a tool for good
    let swallow = false; // the click that ends a claimed press shouldn't reach what was pressed

    // before the page sees it: a tool that claims every press takes it, unless it's on that tool's own view
    const intercept = (e: PointerEvent) => {
      if (!primary(e)) return;
      swallow = false;
      const claim = self().claimedBy;
      if (!claim || under(e)?.closest(`[data-node="${claim.url}"]`)) return;
      e.stopPropagation();
      e.preventDefault();
      pressed = swallow = true;
      canvas.setPointerCapture(e.pointerId);
      emit(PointerDown, e);
    };
    // after the page: a press nothing handled itself is offered to whoever subscribes
    const down = (e: PointerEvent) => {
      if (!primary(e) || pressed || e.defaultPrevented || self().claimedBy)
        return;
      pressed = true;
      claim(emit(PointerDown, e), e);
    };
    const move = (e: PointerEvent) => {
      const answer = emit(PointerMove, e);
      if (pressed && !self().claimedBy) claim(answer, e);
    };
    const up = (e: PointerEvent) => {
      if (!pressed) return;
      pressed = false;
      emit(PointerUp, e);
      if (claimed) request(State).put("claimedBy", undefined);
      claimed = false;
    };
    const click = (e: MouseEvent) => {
      if (!swallow) return;
      swallow = false;
      e.stopPropagation();
      e.preventDefault();
    };

    function claim(by: Node["url"] | undefined, e: PointerEvent) {
      if (!by) return;
      claimed = swallow = true;
      canvas!.setPointerCapture(e.pointerId);
      request(State).put("claimedBy", by);
    }

    function primary(e: PointerEvent) {
      return e.button === 0 && canvas!.contains(e.target as Element);
    }

    function emit(
      msg: typeof PointerDown | typeof PointerMove | typeof PointerUp,
      e: PointerEvent,
    ): Node["url"] | undefined {
      const rect = canvas!.getBoundingClientRect();
      const client: Point = { x: e.clientX, y: e.clientY };
      request(State).put("position", {
        x: client.x - rect.left,
        y: client.y - rect.top,
      });
      const el = under(e);
      return request(msg as typeof PointerDown, {
        client,
        target: (el?.dataset.node as Node["url"]) ?? rootOf(parent!).url,
        grab: msg === PointerDown && el ? grabOn(el, client) : undefined,
        claimedBy: self().claimedBy?.url,
      });
    }

    const options = { capture: true };
    window.addEventListener("pointerdown", intercept, options);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("click", click, options);
    onCleanup(() => {
      window.removeEventListener("pointerdown", intercept, options);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("click", click, options);
    });
  }
}) satisfies Behavior;

// the innermost node's element under the pointer. Not e.target: a touch keeps targeting what it pressed, and
// parts of what is held can still be hit
function under(e: PointerEvent): HTMLElement | undefined {
  return (
    document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((el) => !el.closest(".held"))
      ?.closest<HTMLElement>("[data-node]") ?? undefined
  );
}

// where on a node's element `client` is, in the node's own pixels, and the element's scale on screen
function grabOn(el: HTMLElement, client: Point): PointerInput["grab"] {
  const rect = el.getBoundingClientRect();
  const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
  return {
    at: { x: (client.x - rect.left) / scale, y: (client.y - rect.top) / scale },
    scale,
  };
}

const PointerView: Component<{
  self: Pointer;
  carried?: Carried;
  mine: boolean;
  over: boolean;
  frame(el: HTMLElement): void;
  listen(): void;
}> = (props) => {
  createEffect(() => {
    if (props.mine) props.listen();
  });
  // the pointer's own origin on the canvas; what it shows is offset from there
  const at = (p: Point) => ({
    x: p.x - (props.self.x ?? 0),
    y: p.y - (props.self.y ?? 0),
  });

  return (
    <div ref={props.frame}>
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
            {/* yours is the system cursor; everyone else's is an arrow with its tip on their position */}
            <Show when={!props.mine}>
              <svg
                class="cursor remote"
                viewBox="0 0 16 20"
                width="16"
                height="20"
                style={{
                  left: `${at(position()).x}px`,
                  top: `${at(position()).y}px`,
                }}
              >
                <path d="M1 1 L1 16 L5 12 L8 19 L11 17.5 L8 11 L14 11 Z" />
              </svg>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
};
