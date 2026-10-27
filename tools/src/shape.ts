import { hasTag, state, State, type Behavior, type Tagged } from "@cards/core";
import { Drop } from "@cards/shapes";
import { tags, type Token } from "./index.js";

// Takes tags: a token dropped on a shape adds its tag to the shape's document, for good
export default (({ url, request, on }) => {
  request(State).put(`takes/${tags.token}`, true);

  on(Drop, ({ node }, next) => {
    if (!hasTag(node, tags.token)) return next();
    const { tag } = state<Token>(node);
    request(State).change((d: Tagged) => {
      if (!d["@tags"]) d["@tags"] = {};
      d["@tags"][tag] = true;
    });
    return url;
  });
}) satisfies Behavior;
