import {
  createEffect,
  createMemo,
  For,
  onCleanup,
  Show,
  untrack,
  type Component,
} from "solid-js";
import {
  Describe,
  MyPointer,
  Node,
  nodeIn,
  nodesIn,
  rootOf,
  state,
  State,
  type Behavior,
  type Tagged,
} from "@cards/core";
import type { Shape } from "@cards/shapes";
import {
  PointerDown,
  PointerMove,
  PointerUp,
  tags,
  Toggle,
  type Tool,
} from "./index.js";

type Inspector = Shape & Tool & { target?: Node }; // target is a put

// While selected it claims every press, so it can pick buttons too; picking hands the pointer back to the
// default tool
export default (({ url, parent, scope, request }) => {
  request(State).put(`@tags/${tags.tool}`, true);
  const self = () => request(State).read<Inspector>();
  const pointer = createMemo(() => request(MyPointer));
  const pick = (node: Node | undefined) => request(State).put("target", node);

  createEffect(() => {
    const p = pointer();
    if (!p) return;
    p.on(PointerDown, (e, next) => {
      if (e.claimedBy !== url) return next();
      pick(nodeIn(scope, e.target));
      request(Toggle);
      return url;
    });
    p.on(PointerMove, (e, next) => (e.claimedBy === url ? undefined : next()));
    p.on(PointerUp, (e, next) => (e.claimedBy === url ? undefined : next()));
  });

  createEffect(() => {
    const hand = pointer()?.request(State);
    if (!hand || !self().selected) return;
    hand.put("claimedBy", url);
    onCleanup(() => hand.put("claimedBy", undefined));
  });

  request(State).put("view", () => (
    <InspectorView
      root={rootOf(parent!)}
      target={self().target}
      selected={self().selected ?? false}
      toggle={() => request(Toggle)}
      pick={pick}
    />
  ));
}) satisfies Behavior;

type ViewProps = {
  root: Node;
  target?: Node;
  selected: boolean;
  toggle(): void;
  pick(node: Node): void;
};

const InspectorView: Component<ViewProps> = (props) => (
  <div class="panel" style={{ width: "300px", height: "460px" }}>
    <div class="titlebar">
      <button
        class="btn icon"
        classList={{ active: props.selected }}
        title="Inspect"
        onClick={() => props.toggle()}
      >
        <Crosshair />
      </button>
      <span>Inspector</span>
      <span class="grip" />
    </div>
    <section class="pane">
      <h4>Hierarchy</h4>
      <div class="scroll">
        <Tree
          node={props.root}
          label="root"
          depth={0}
          ancestors={[]}
          target={props.target}
          pick={props.pick}
        />
      </div>
    </section>
    <section class="pane">
      <h4>Data</h4>
      <div class="scroll">
        <Show
          when={props.target}
          fallback={<p class="empty">Pick a node with the inspect tool.</p>}
        >
          {(target) => <Data node={target()} pick={props.pick} />}
        </Show>
      </div>
    </section>
  </div>
);

type TreeProps = {
  node: Node;
  label: string;
  depth: number;
  ancestors: Node["url"][];
  target?: Node;
  pick(node: Node): void;
};

const Tree: Component<TreeProps> = (props) => {
  const cyclic = () => props.ancestors.includes(props.node.url);
  const entries = createMemo(() =>
    cyclic() || props.depth > 6
      ? new Map<string, Entry>()
      : childEntries(props.node),
  );
  const keys = createMemo(() => [...entries().keys()], [], {
    equals: sameArray,
  });

  return (
    <>
      <div
        class="row"
        classList={{ selected: props.target?.url === props.node.url }}
        style={{ "padding-left": `${6 + props.depth * 14}px` }}
        onPointerDown={() => props.pick(props.node)}
      >
        <span class="key">{props.label}</span>
        <span>{name(props.node)}</span>
        <span class="muted">{props.node.url.slice(-6)}</span>
        {cyclic() ? <span class="muted">↺</span> : null}
      </div>
      <For each={keys()}>
        {(key) => {
          const entry = untrack(() => entries().get(key)!);
          return (
            <Tree
              node={entry.node}
              label={entry.label}
              depth={props.depth + 1}
              ancestors={[...props.ancestors, props.node.url]}
              target={props.target}
              pick={props.pick}
            />
          );
        }}
      </For>
    </>
  );
};

const Data: Component<{ node: Node; pick(node: Node): void }> = (props) => {
  const data = () => state<Record<string, unknown>>(props.node);
  const putPaths = () => Object.keys(props.node.request(State).overlays());
  const putsUnder = (key: string) =>
    putPaths().filter((p) => p === key || p.startsWith(`${key}/`));

  return (
    <div class="fields">
      <For each={Object.keys(data())}>
        {(key) => (
          <>
            <span
              class="key"
              title={
                putsUnder(key).length
                  ? `put: ${putsUnder(key).join(", ")}`
                  : "stored"
              }
            >
              {key}
              {putsUnder(key).length ? <span class="put" /> : null}
            </span>
            <Value value={data()[key]} pick={props.pick} />
          </>
        )}
      </For>
    </div>
  );
};

const Value: Component<{ value: unknown; pick(node: Node): void }> = (
  props,
) => {
  const nodes = () => {
    const found = nodesIn(props.value);
    return found.length > 0 ? found : undefined;
  };
  return (
    <span class="value">
      <Show when={nodes()} fallback={format(props.value)}>
        {(list) => list().map((n) => <NodeLink node={n} pick={props.pick} />)}
      </Show>
    </span>
  );
};

const NodeLink: Component<{ node: Node; pick(node: Node): void }> = (props) => (
  <button
    class="chip"
    style={{ "--chip": tint(name(props.node)) }}
    title={props.node.url}
    onPointerDown={() => props.pick(props.node)}
  >
    {name(props.node)}
  </button>
);

const Crosshair = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
  >
    <circle cx="9" cy="9" r="5.5" />
    <path d="M9 1v5M9 12v5M1 9h5M12 9h5" />
  </svg>
);

type Entry = { label: string; node: Node };

// the nodes childNodes finds, labelled by the field they sit in
function childEntries(node: Node): Map<string, Entry> {
  const out = new Map<string, Entry>();
  for (const [key, value] of Object.entries(
    state<Record<string, unknown>>(node),
  ))
    for (const child of nodesIn(value))
      out.set(`${key}|${child.url}`, { label: key, node: child });
  return out;
}

// a card by its title, anything else by its tags without the package they belong to
function name(node: Node): string {
  const title = node.request(Describe)?.title;
  const names = Object.keys(state<Partial<Tagged>>(node)["@tags"] ?? {})
    .map((t) => t.slice(t.lastIndexOf("#") + 1))
    .filter((t) => t !== "shape");
  return title ?? (names.join(" ") || "node");
}

// a stable pastel for a name, so a card has the same color everywhere
function tint(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return `hsl(${Math.abs(hash) % 360} 85% 86%)`;
}

function format(value: unknown): string {
  if (typeof value === "function") return "ƒ";
  if (value === undefined) return "undefined";
  const text = JSON.stringify(value, (_, v) =>
    v instanceof Node
      ? `→${v.url.slice(-6)}`
      : typeof v === "function"
        ? "ƒ"
        : v,
  );
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

function sameArray(a: string[], b: string[]) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
