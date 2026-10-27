import type { Component } from "solid-js";
import { State, type Behavior } from "@cards/core";
import type { Token } from "./index.js";

// Draws a tag you can hold, by the name after its package
export default (({ request }) => {
  const token = () => request(State).read<Token>();
  request(State).put("view", () => <TokenView tag={token().tag} />);
}) satisfies Behavior;

const TokenView: Component<{ tag?: string }> = (props) => {
  const name = () => props.tag?.split("#").pop() ?? "?";
  return (
    <div class="chip token" style={{ "--chip": tint(name()) }}>
      {name()}
    </div>
  );
};

function tint(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return `hsl(${Math.abs(hash) % 360} 85% 86%)`;
}
