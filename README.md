# fastcomments-demos

Aggregator that builds the static demo bundle for each fastcomments-* frontend
integration repo and stages them under `dist/<slug>/` so the main fastcomments
worker can serve each at `/commenting-system-for-<slug>`.

## Layout

After `node build.mjs` runs, `dist/` looks like:

```
dist/
  react/      ← served at /commenting-system-for-react
  vue/        ← served at /commenting-system-for-vue
  angular/    ← served at /commenting-system-for-angular
  svelte/     ← served at /commenting-system-for-svelte
  astro/      ← served at /commenting-system-for-astro
  11ty/       ← served at /commenting-system-for-11ty
  gatsby/     ← served at /commenting-system-for-gatsby
  nextjs/     ← served at /commenting-system-for-nextjs
```

## Temporary / ad-hoc demos (`tmp_demos/`)

One-off demos live in `tmp_demos/<slug>/` in this repo (each is a small vite
app whose `npm run build` emits `dist/`). The build stages them at
`dist/tmp_demos/<slug>/` and the worker serves everything under that
directory at `fastcomments.com/tmp_demos/<slug>` through a single static
mount, so shipping a new one requires NO worker changes:

1. Create `tmp_demos/<slug>/` with `index.html`, `src/`, `package.json`
   (with a `build` script), and a vite config using `base: './'` (assets
   must be relative because the bundle serves from a subpath).
2. Append `{ slug, deps }` to the `TMP_DEMOS` array in `build.mjs`. `deps`
   are repos cloned into `build/` as siblings of the staged demo before it
   builds; `ref` pins a branch, `prepare` runs once per dep (e.g. compile a
   library the demo links against).
3. Deploy as usual; the demo is live at `/tmp_demos/<slug>`.

`tmp_demos/idcollab` is the reference example: it builds the React Native
SDK from source (pinned branch) against a compiled `fastcomments-sdk-js`
sibling.

## Local iteration

By default `build.mjs` clones each repo fresh from GitHub. To reuse local
checkouts for faster iteration, point at a parent directory that contains the
`fastcomments-*` repos as siblings:

```
DEMOS_LOCAL_SOURCE_DIR=/home/winrid/dev/fastcomments node build.mjs
```

To build a subset, filter by slug (note `dist/` is wiped at the start of
every run, so only deploy full builds):

```
DEMOS_FILTER=idcollab node build.mjs
```

## Adding a new demo

1. Add a `build-demo.mjs` to the new frontend repo that produces a static
   bundle at `<repo-root>/demo-dist/`.
2. Append `{ slug, repo }` to the `LIBS` array in `build.mjs`.
3. Add the matching slug to the `DEMO_LIBS` constant in the fastcomments
   worker so a static mount is registered.
4. Add the new URL to `routes/sitemap.ts` `ADDITIONAL_PATHS`.

## Deployment

Deployed via the orchestrator. Build runs in `/tmp/fastcomments-demos`
on the orchestrator host (`customBuildCommand: "node build.mjs"`), then
the resulting tree is rsynced to `/home/winrid/fastcomments-demos/` on
each fastcomments instance.
