import { createMemo, For, Show, type Component } from "solid-js";
import {
  Describe,
  hasTag,
  Pointers,
  state,
  State,
  type Behavior,
  type Node,
} from "@cards/core";
import { Child } from "@cards/core/render";
import { Drop, ordered, orderAt, type Point, type Shape } from "@cards/shapes";
import type { Pointer } from "@cards/tools";
import type { Deck } from "./index.js";

type Dropping = { node: Node; index: number }; // a card held over the deck, and the slot it would land in

const ROW = 28; // a row and the gap below it; rows are placed by hand so they can slide

// Holds cards: listed on the left, the selected one shown on the right. Cards on a deck are dealt like loose ones.
export default (({ url, request, on }) => {
  const deck = () => request(State).read<Deck>();
  const cards = () => ordered(deck().children);
  const selected = () =>
    cards().find((c) => c.url === deck().selected?.url) ?? cards()[0];
  const select = (card: Node) => request(State).put("selected", card.url);
  let rows: HTMLElement | undefined;

  // what someone's pointer holds over this deck, if anything
  const dropping = createMemo((): Dropping | undefined => {
    for (const pointer of request(Pointers) ?? []) {
      const { holding, grip, client } = state<Pointer>(pointer);
      const at = client?.();
      if (holding && grip?.over?.url === url && at)
        return { node: holding, index: slotAt(at) };
    }
    return undefined;
  });

  request(State).put({
    "takes/card": true,
    view: () => (
      <DeckView
        cards={cards()}
        selected={selected()}
        dropping={dropping()}
        select={select}
        rows={(el) => (rows = el)}
      />
    ),
  });

  on(Drop, ({ node, client, pointer = client }, next) => {
    if (!hasTag(node, "card")) return next();
    const order = orderAt(cards(), slotAt(pointer));
    request(State).change((d: Deck) => {
      if (!d.children) d.children = {};
      d.children[node.url] = node;
    });
    deck()
      .children![node.url].request(State)
      .change((d: Shape) => {
        d.order = order;
      });
    select(node);
    return url;
  });

  // the slot nearest to the pointer
  function slotAt(pointer: Point): number {
    if (!rows) return cards().length;
    const rect = rows.getBoundingClientRect();
    const scale = rows.offsetWidth ? rect.width / rows.offsetWidth : 1;
    const top = (pointer.y - rect.top) / scale - ROW / 2;
    return clamp(Math.round(top / ROW), 0, cards().length);
  }
}) satisfies Behavior;

const DeckView: Component<{
  cards: Node[];
  selected?: Node;
  dropping?: Dropping;
  select(card: Node): void;
  rows(el: HTMLElement): void;
}> = (props) => {
  const count = () => props.cards.length + (props.dropping ? 1 : 0);
  // the rows make room at the slot a card would land in
  const top = (card: Node) => {
    const i = props.cards.indexOf(card);
    return (props.dropping && i >= props.dropping.index ? i + 1 : i) * ROW;
  };

  return (
    <div class="paper deck" classList={{ droppable: Boolean(props.dropping) }}>
      <div class="deck-list">
        <div
          class="deck-rows"
          ref={props.rows}
          style={{ height: `${count() * ROW}px` }}
        >
          <For each={props.cards}>
            {(card) => (
              <div
                class="deck-row"
                classList={{ selected: props.selected === card }}
                data-node={card.url}
                style={{ transform: `translateY(${top(card)}px)` }}
                onClick={() => props.select(card)}
              >
                {title(card)}
              </div>
            )}
          </For>
          <Show when={props.dropping}>
            {(dropping) => (
              <div
                class="deck-row placeholder"
                style={{ transform: `translateY(${dropping().index * ROW}px)` }}
              >
                {title(dropping().node)}
              </div>
            )}
          </Show>
        </div>
        <Show when={count() === 0}>
          <p class="empty">Drop cards here</p>
        </Show>
      </div>
      <div class="deck-pane">
        <Show when={props.selected}>{(card) => <Child node={card()} />}</Show>
      </div>
    </div>
  );
};

function title(card: Node): string {
  return card.request(Describe)?.title ?? "…";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
