import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Component,
} from "solid-js";
import { MyPointer, Pointers, State, type Behavior } from "@cards/core";
import { Move, type Point, type Shape } from "@cards/shapes";

const SHEET = new URL("./sheep.png", import.meta.url).href; // eSheep's sheet: 16 × 11 frames of 40 × 40, facing left
const FRAME = 40;
const ZOOM = 2; // drawn at twice the sheet's pixels
const WALK = [2, 3]; // the walking frames, in the top row
const STEP = 1000; // a step every second, which the container glides over
const STRIDE = 14; // how far a step goes, in the sheep's own pixels
const RANGE = 160; // how far it strays from where it was put before it turns back

// Wanders about. Every tab draws it, but only one tab walks it: the one whose pointer comes first, so the sheep
// takes one step at a time however many people watch. A step is a Move, so its container works out what a step
// means in its own terms.
export default ((sheep) => {
  const { request } = sheep;
  const self = () => request(State).read<Shape>();
  const [frame, setFrame] = createSignal(0);
  // which way it last moved; x grows to the right on every container
  const facing = createMemo<{ x: number; dir: 1 | -1 }>(
    (last) => {
      const x = self().x;
      return { x, dir: x > last.x ? 1 : x < last.x ? -1 : last.dir };
    },
    { x: NaN, dir: -1 },
  );
  const walks = createMemo(() => {
    const mine = request(MyPointer)?.url;
    const first = (request(Pointers) ?? []).map((p) => p.url).sort()[0];
    return mine !== undefined && mine === first;
  });

  request(State).put({
    glide: STEP,
    view: () => <SheepView frame={WALK[frame()]} dir={facing().dir} />,
  });

  const legs = setInterval(() => setFrame((f) => (f + 1) % WALK.length), 250);
  onCleanup(() => clearInterval(legs));

  createEffect(() => {
    if (!walks()) return;
    let heading = Math.random() * 2 * Math.PI;
    const strayed: Point = { x: 0, y: 0 };
    const timer = setInterval(() => {
      heading = turn(heading, strayed);
      const by = {
        x: Math.cos(heading) * STRIDE,
        y: Math.sin(heading) * STRIDE,
      };
      // nothing answers while it's held, so it only counts steps it took
      if (!request(Move, { node: sheep, by })) return;
      strayed.x += by.x;
      strayed.y += by.y;
    }, STEP);
    onCleanup(() => clearInterval(timer));
  });
}) satisfies Behavior;

// a little to either side, or back the way it came once it has strayed too far
function turn(heading: number, strayed: Point): number {
  if (Math.hypot(strayed.x, strayed.y) > RANGE)
    return Math.atan2(-strayed.y, -strayed.x) + (Math.random() - 0.5) * 0.6;
  return heading + (Math.random() - 0.5) * 1.2;
}

const SheepView: Component<{ frame: number; dir: 1 | -1 }> = (props) => (
  <div
    class="sheep"
    style={{
      width: `${FRAME * ZOOM}px`,
      height: `${FRAME * ZOOM}px`,
      "background-image": `url(${SHEET})`,
      "background-size": `${640 * ZOOM}px ${440 * ZOOM}px`,
      "background-position": `-${props.frame * FRAME * ZOOM}px 0`,
      "image-rendering": "pixelated",
      transform: props.dir > 0 ? "scaleX(-1)" : undefined,
    }}
  />
);
