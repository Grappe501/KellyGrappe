# Phase 0.1 Build Stabilization

This package fixes the exact TypeScript errors reported during `npm run build`.

## Fixed areas
- AI runtime registry initialization mismatch
- Cockpit telemetry demo payload typing
- Cockpit telemetry type drift between engine and shared types
- Cockpit telemetry subscribe API mismatch in the React hook

## Files included
- `app/src/platform/ai/ai.runtime.ts`
- `app/src/platform/ui/cockpit/cockpit.telemetry.types.ts`
- `app/src/platform/ui/cockpit/cockpit.telemetry.engine.ts`
- `app/src/platform/ui/cockpit/cockpit.telemetry.demo.ts`
- `app/src/platform/ui/cockpit/cockpit.telemetry.store.ts`
- `app/src/platform/ui/cockpit/useCockpitTelemetry.ts`
