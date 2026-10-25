import { card, NewNode, packageUrl, tag } from "@cards/core";
import {
  Drop,
  Pan,
  tags as shapes,
  type Container,
  type Shape,
} from "@cards/shapes";

export const url = packageUrl(import.meta.url);

export const tags = {
  map: tag(url, "map"),
};

export type Camera = { center: [lng: number, lat: number]; zoom: number };
export type MapShape = Shape &
  Container & {
    width: number;
    height: number;
    camera: Camera;
  };

export const BERLIN: Camera = { center: [13.388, 52.517], zoom: 9.5 };

export const cards = [
  card({
    id: "map",
    title: "Map",
    description:
      "A surface on a map. Things drawn or dropped onto it stick to their place.",
    matches: tags.map,
    accepts: [Drop, Pan],
    behavior: () => import("./map.js"),
    example: ({ request }) =>
      request(NewNode, {
        "@tags": { [shapes.shape]: true, [tags.map]: true },
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        camera: BERLIN,
        children: [],
      } satisfies MapShape),
  }),
];
