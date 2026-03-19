# Current Build Blockers

Exit code: 1

## Command

```bash
cd app && npm run build
```

## stderr

```text

```

## stdout

```text
> kelly-grappe-campaign-ops-pwa@0.1.0 build
> tsc -b && vite build

src/platform/ai/ai.runtime.ts(7,16): error TS2339: Property 'initialize' does not exist on type 'AIRegistryInternal'.
src/platform/ui/cockpit/cockpit.telemetry.demo.ts(15,5): error TS2353: Object literal may only specify known properties, and 'source' does not exist in type 'Omit<CockpitTelemetryEvent, "id" | "timestamp">'.
src/platform/ui/cockpit/cockpit.telemetry.demo.ts(22,5): error TS2322: Type '"success"' is not assignable to type '"error" | "warning" | "info"'.
src/platform/ui/cockpit/cockpit.telemetry.demo.ts(31,5): error TS2353: Object literal may only specify known properties, and 'source' does not exist in type 'Omit<CockpitTelemetryEvent, "id" | "timestamp">'.
src/platform/ui/cockpit/cockpit.telemetry.store.ts(10,7): error TS2322: Type 'import("/mnt/data/kelly_app/Kelly_Grappe_for_SOS_APP/app/src/platform/ui/cockpit/cockpit.telemetry.engine").CockpitTelemetrySnapshot' is not assignable to type 'import("/mnt/data/kelly_app/Kelly_Grappe_for_SOS_APP/app/src/platform/ui/cockpit/cockpit.telemetry.types").CockpitTelemetrySnapshot'.
  Types of property 'events' are incompatible.
    Type 'import("/mnt/data/kelly_app/Kelly_Grappe_for_SOS_APP/app/src/platform/ui/cockpit/cockpit.telemetry.engine").CockpitTelemetryEvent[]' is not assignable to type 'import("/mnt/data/kelly_app/Kelly_Grappe_for_SOS_APP/app/src/platform/ui/cockpit/cockpit.telemetry.types").CockpitTelemetryEvent[]'.
      Type 'import("/mnt/data/kelly_app/Kelly_Grappe_for_SOS_APP/app/src/platform/ui/cockpit/cockpit.telemetry.engine").CockpitTelemetryEvent' is not assignable to type 'import("/mnt/data/kelly_app/Kelly_Grappe_for_SOS_APP/app/src/platform/ui/cockpit/cockpit.telemetry.types").CockpitTelemetryEvent'.
        Types of property 'severity' are incompatible.
          Type '"error" | "warning" | "info"' is not assignable to type 'CockpitTelemetrySeverity'.
            Type '"error"' is not assignable to type 'CockpitTelemetrySeverity'.
src/platform/ui/cockpit/cockpit.telemetry.store.ts(14,7): error TS2322: Type 'import("/mnt/data/kelly_app/Kelly_Grappe_for_SOS_APP/app/src/platform/ui/cockpit/cockpit.telemetry.engine").CockpitTelemetryEvent[]' is not assignable to type 'import("/mnt/data/kelly_app/Kelly_Grappe_for_SOS_APP/app/src/platform/ui/cockpit/cockpit.telemetry.types").CockpitTelemetryEvent[]'.
  Type 'import("/mnt/data/kelly_app/Kelly_Grappe_for_SOS_APP/app/src/platform/ui/cockpit/cockpit.telemetry.engine").CockpitTelemetryEvent' is not assignable to type 'import("/mnt/data/kelly_app/Kelly_Grappe_for_SOS_APP/app/src/platform/ui/cockpit/cockpit.telemetry.types").CockpitTelemetryEvent'.
    Types of property 'severity' are incompatible.
      Type '"error" | "warning" | "info"' is not assignable to type 'CockpitTelemetrySeverity'.
        Type '"error"' is not assignable to type 'CockpitTelemetrySeverity'.
src/platform/ui/cockpit/useCockpitTelemetry.ts(14,7): error TS2554: Expected 1 arguments, but got 2.
```
