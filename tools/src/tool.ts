import { createEffect, createMemo } from "solid-js";
import {
  hasTag,
  Lookup,
  state,
  State,
  type Behavior,
  type Tagged,
} from "@cards/core";
import { tags as shapes } from "@cards/shapes";
import { tags, Toggle, type Selection } from "./index.js";

// Applied to anything tagged tool: keeps `selected` put on the node, from the shared selection object.
// A tool tagged default is selected whenever no other tool is. Tools only act while they sit on a surface,
// so the examples inside cards stay inert.
export default ((node) => {
  const { url, request, on } = node;
  const selection = createMemo(() => request(Lookup, { tag: tags.selection }));
  // read live: a tool dragged off a surface stops acting
  const onSurface = () =>
    Boolean(node.parent && hasTag(node.parent, shapes.surface));
  const isDefault = () =>
    Boolean(request(State).read<Partial<Tagged>>()["@tags"]?.[tags.default]);

  const selected = createMemo(() => {
    if (!onSurface()) return false;
    const tool = selection() && state<Selection>(selection()!).tool;
    return tool ? tool.url === url : isDefault();
  });

  createEffect(() => request(State).put("selected", selected()));

  on(Toggle, () => {
    const s = request(Lookup, { tag: tags.selection, orCreate: {} })!;
    const tool = state<Selection>(s).tool;
    if (selected() && !tool) return; // the default tool can't be switched off
    s.request(State).put("tool", selected() ? undefined : url);
  });
}) satisfies Behavior;
