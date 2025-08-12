# Control Center – status and next steps

Current state
- Main entry: `src/components/layout/MainLayout.tsx` routes dashboard to `DeepCADControlCenter` (AMap + Deck.gl)
- UnifiedMap path: `UnifiedControlCenterScreen` + `UnifiedMapView` (MapLibre + Deck.gl) exists but not wired in routing
- Two Zustand stores exist:
  - `src/core/controlCenterStore.ts` (filters, selection for DeepCADControlCenter)
  - `src/stores/controlCenterStore.ts` (navigation/map/weather for UnifiedControlCenterScreen)
- Legacy Three.js center: `visualization/PureThreeJSEpicCenter.tsx` (standalone demo)

Gaps to address
1) Store duplication
- Decide a single store. Proposal: keep `src/stores/controlCenterStore.ts` as global (navigation/map/weather) and merge filter/selection keys from `src/core/controlCenterStore.ts` into it.
- Deprecate `src/core/controlCenterStore.ts` after migration.

2) Map stack consolidation
- Pick one default: MapLibre + Deck.gl (UnifiedMapService) for cross‑platform, or AMap + Deck.gl for China‑centric deployments.
- Proposal: make Map provider selectable via env (VITE_MAP_PROVIDER=maplibre|amap) and create thin adapters so `DeepCADControlCenter` uses UnifiedMap when provider=maplibre.

3) Route clarity
- Keep dashboard -> `DeepCADControlCenter`. Expose experimental `UnifiedControlCenterScreen` at `/workspace/dashboard-unified` for A/B.

4) Type issues
- Typecheck currently fails due to many unused variables and shim type gaps. Short term: run `npm run build:typed` only for modules we touch; long term: add tsconfig.build.json include list.

Action plan (low-risk)
- [ ] Add experimental route to `UnifiedControlCenterScreen` for evaluation.
- [ ] Add env flag `VITE_MAP_PROVIDER` and proxy in DeepCADControlCenter to use UnifiedMap when maplibre is selected.
- [ ] Create `src/stores/controlCenterStore.migrate.ts` to merge filter keys, then refactor DeepCADControlCenter to consume from unified store.
- [ ] Write smoke test: render DeepCADControlCenter and ensure no runtime crash (vitest/jsdom) – skip heavy WebGL.

Nice to have
- [ ] Replace inline styles with CSS modules for control panels.
- [ ] Extract large components into subcomponents to reduce re-renders.
- [ ] Virtualize project list when > 500.

Notes
- Removed empty files `components/control/EpicControlCenter.tsx` and `EpicControlCenter.simple.tsx` to avoid confusion.
