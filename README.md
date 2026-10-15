# Consola entrada

Parametric 3D model and cutting drawings for the cabinet in [DEFINITION](DEFINITION.md).
Three.js renders the pieces; Manifold builds the solids, including grooves.

```sh
npm install
npm run dev            # http://127.0.0.1:5173
npm test               # geometry and drawing checks
npm run test:browser   # Playwright, needs Google Chrome
npm run build          # static site in dist/ (serve over HTTP for the wasm)
```

## Assembly

Orbit, explode, isolate pieces, open doors and drawers, and edit the parameters
(saved in local storage, importable/exportable as JSON). **Export 3D** writes the
visible pieces as GLB in metres. Knobs, hinges and rails are cosmetic only.

Parameters, part geometry and placement live in `src/model.ts`; `DEFINITION.md`
remains the source of truth.

## Translations

English (base) and Catalan, via [Paraglide](https://paraglidejs.com). Strings live in
`messages/{en,ca}.json`; `npm run i18n` compiles them to `src/paraglide/` (generated,
git-ignored; dev, build and test run it first). The header switch stores the choice in
local storage; otherwise the browser language decides. Drawings and PDFs follow the
same locale, including decimal commas in Catalan.

## Drawings

One A4 sheet per distinct board, exported as vector PDF. Each board is laid flat
with its longest side horizontal and drawn to scale (1:2 – 1:12, the largest that
fits). Identical boards share a sheet; mirror-image pairs (left/right) share a sheet
listed as "n + n mirrored", drawn with the grooves facing the viewer and an
undimensioned mirror image below.

Through cuts are dimensioned by chained lengths from the board edges. Grooves are
drawn as a line of their real width with one 45° note giving width, depth and edge
offset. Dimensions are nominal, in mm, with no fit allowance.
