import { hasTag, State, type Behavior } from "@cards/core";
import { Place, Remove, Taker, type Container } from "./index.js";

// Applied to anything tagged container: the one place that changes a container's children.
export default ((node) => {
  const { request, on } = node;
  const self = () => request(State).read<Container>();

  on(Taker, ({ node: held }, next) => {
    const takes = self().takes;
    return takes !== undefined && hasTag(held, takes) ? node : next();
  });

  // adds the node to the children (if it isn't there yet) and sets where it sits
  on(Place, ({ node: placed, fields, at }) => {
    request(State).change((d: Container) => {
      if (!d.children) d.children = [];
      const i = d.children.findIndex(
        (c) => (c as unknown as string) === placed.url,
      );
      if (at === undefined) {
        if (i < 0) d.children.push(placed);
      } else if (i !== at) {
        if (i >= 0) d.children.splice(i, 1);
        d.children.splice(Math.min(at, d.children.length), 0, placed);
      }
    });
    if (Object.keys(fields).length === 0) return;
    const child = self().children.find((c) => c.url === placed.url)!;
    child.request(State).change((d: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(fields)) d[key] = value;
    });
  });

  // false if it wasn't a child
  on(Remove, ({ node: removed }) => {
    const i = (self().children ?? []).findIndex((c) => c.url === removed.url);
    if (i < 0) return false;
    request(State).change((d: Container) => {
      d.children.splice(i, 1);
    });
    return true;
  });
}) satisfies Behavior;
