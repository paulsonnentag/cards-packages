# cards-packages

The card packages for [Cards](../cards-core). Each folder is a package on its own: it installs, builds and pushes by itself, and isn't part of a workspace. A package is published as an Automerge document with pushwork; the loader in `cards-core` pins and loads it from there.

| Package  | Depends on                       |
| -------- | -------------------------------- |
| `shapes` |                                  |
| `tools`  | `shapes`                         |
| `lines`  | `shapes`, `tools`                |
| `deck`   | `shapes`, `tools`                |
| `map`    | `shapes`, `tools`, `maplibre-gl` |
| `sheep`  | `shapes`                         |
| `beret`  | `shapes`                         |
| `france` | `shapes`, `map`, `beret`         |

## Setup

Once per machine. You need Node 24, pnpm 12 (through corepack, which each package pins with `packageManager`), pushwork, and a checkout of `cards-core` next to this repo, at `../cards-core`.

1. Install `cards-core`, so the loader's own dependencies are there:

   ```sh
   cd ../cards-core && pnpm install
   ```

2. Put the loader on your path. This links your checkout, so `cards-importmap` is always the version you have checked out:

   ```sh
   pnpm add -g link:$(pwd)/loader
   ```

   pnpm's global bin directory has to be on your `PATH` (`pnpm setup` adds it).

3. Make pnpm resolve `automerge:` dependencies, in every project:

   ```sh
   pnpm config set --global globalPnpmfile $(pwd)/loader/tools/pnpmfile.cjs
   pnpm config set --global optimisticRepeatInstall false
   ```

   The resolver fetches packages from the sync server and keeps what it fetched in `~/.cache/cards` (or `$CARDS_CACHE`). `optimisticRepeatInstall: false` makes every `pnpm install` check whether a dependency's document has moved; otherwise pnpm skips resolving when nothing local changed.

4. Install pushwork:

   ```sh
   npm install -g pushwork
   ```

## Working on a package

```sh
cd lines
pnpm install   # npm dependencies, and package dependencies at their latest heads
pnpm push      # build, then pushwork sync
```

`pnpm build` transpiles `src/` to `dist/` with Babel (TypeScript and Solid's JSX, file by file, no bundling), writes `dist/*.d.ts` with `tsc`, and generates `importmap.json` from the lockfile with `cards-importmap`. Open pages pick up the pushed version without a reload.

A package that depends on another one gets the other package's newest version on `pnpm install`. Push dependencies first: `shapes`, then `tools`, then the rest, with `beret` and `map` before `france`.

## A new package

Copy a small package such as `deck`, then:

- give it its own `name` in `package.json`;
- delete `.pushwork/`, then run `pushwork init .` once to create its document;
- list package dependencies by document URL, under their `@cards/<name>` alias:

  ```json
  "dependencies": { "@cards/shapes": "automerge:atho8JGpgB4mZnR6pP4LYffh1XT" }
  ```

Keep `@cards/core` and `solid-js` in `peerDependencies`: the page provides them, so they never go into the import map. `@cards/core` is also a dev dependency, linked from `../../cards-core/core`, for its types.

`.pushworkattributes` pins `dist/`, `package.json` and `importmap.json` to their heads in the package document, which is what the loader serves and reads. Everything else is pushed without heads.
