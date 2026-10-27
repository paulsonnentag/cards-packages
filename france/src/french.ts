import { createEffect, createMemo } from "solid-js";
import { hasTag, State, type Behavior } from "@cards/core";
import { tags as berets } from "@cards/beret";
import { tags as maps } from "@cards/map";
import type { Shape } from "@cards/shapes";

type LngLat = [lng: number, lat: number];

// Puts the beret tag on whatever it's dealt to while it sits on a map inside France. The tag is a put, so it goes
// away as soon as the shape leaves France, or loses the french tag
export default ((node) => {
  const { request } = node;
  const inFrance = createMemo(() => {
    const container = node.parent;
    if (!container || !hasTag(container, maps.map)) return false;
    const { x, y } = request(State).read<Shape>(); // on a map, longitude and latitude
    return contains(FRANCE, [x, y]);
  });

  createEffect(() =>
    request(State).put(`@tags/${berets.beret}`, inFrance() || undefined),
  );
}) satisfies Behavior;

// ray casting: a point is inside if a ray from it crosses the outline an odd number of times
function contains(outline: LngLat[], [x, y]: LngLat): boolean {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, yi] = outline[i];
    const [xj, yj] = outline[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// mainland France, roughly, clockwise from Dunkirk
const FRANCE: LngLat[] = [
  [2.54, 51.09],
  [2.9, 50.7],
  [3.6, 50.4],
  [4.2, 49.95],
  [4.8, 50.15],
  [5.4, 49.6],
  [6.1, 49.5],
  [6.7, 49.2],
  [7.6, 49.05],
  [8.2, 48.97],
  [7.8, 48.5],
  [7.55, 47.6],
  [7.0, 47.45],
  [6.45, 46.95],
  [6.1, 46.4],
  [6.8, 46.4],
  [6.8, 45.9],
  [7.0, 45.3],
  [6.6, 44.9],
  [7.0, 44.2],
  [7.5, 43.8],
  [6.6, 43.15],
  [5.4, 43.2],
  [4.2, 43.45],
  [3.2, 42.9],
  [3.15, 42.45],
  [1.7, 42.5],
  [0.7, 42.8],
  [-0.8, 42.95],
  [-1.8, 43.35],
  [-1.25, 44.5],
  [-1.15, 46.2],
  [-2.2, 47.0],
  [-4.4, 47.8],
  [-4.8, 48.4],
  [-3.0, 48.85],
  [-1.6, 48.65],
  [-1.9, 49.7],
  [-1.25, 49.6],
  [0.1, 49.45],
  [1.6, 50.2],
  [1.6, 50.73],
];
