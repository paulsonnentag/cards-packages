import type { Component } from "solid-js";
import { State, type Behavior } from "@cards/core";

// Draws a beret, above the origin of whatever it's put on
export default (({ request }) => {
  request(State).put("view", () => <BeretView />);
}) satisfies Behavior;

const BeretView: Component = () => (
  <svg
    class="beret"
    viewBox="0 0 44 26"
    width="44"
    height="26"
    style={{
      position: "absolute",
      left: "14px",
      top: "-14px",
      overflow: "visible",
    }}
  >
    <path
      d="M23 5 L25 0"
      stroke="#1f2433"
      stroke-width="3"
      stroke-linecap="round"
    />
    <path
      d="M2 18 C2 9 13 4 24 4 C35 4 43 9 42 15 C41 20 31 23 21 23 C10 23 2 21 2 18 Z"
      fill="#1f2433"
    />
    <path
      d="M9 15 C11 10 18 8 26 8"
      stroke="#46506a"
      stroke-width="2"
      fill="none"
      stroke-linecap="round"
    />
    <path
      d="M5 20 C13 24 31 24 39 18"
      stroke="#0d1018"
      stroke-width="2"
      fill="none"
      stroke-linecap="round"
    />
  </svg>
);
