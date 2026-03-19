// app/src/platform/ui/PlatformDashboard.tsx

import React from "react"
import * as platformBootModule from "@platform/kernel/platformBootLoader"

import CardRenderer from "@platform/renderers/CardRenderer"
import { dashboardRuntimeEngine } from "@platform/dashboard/dashboardRuntime.engine"

type Props = {
  organizationKey: string
  dashboardId: string
}

function MissingDashboard({
  title,
  warnings
}: {
  title: string
  warnings: string[]
}) {
  return (
    <div
      style={{
        border: "1px dashed #cbd5e1",
        padding: "20px",
        borderRadius: "12px",
        background: "#f8fafc"
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "8px" }}>{title}</h2>
      {warnings.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "18px", color: "#475569" }}>
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function runPlatformBoot(
  organizationId: string,
  dashboardKey: string
): void {
  const moduleAsAny = platformBootModule as any

  if (moduleAsAny.platformBootLoader?.boot) {
    moduleAsAny.platformBootLoader.boot({
      organizationId,
      dashboardKey
    })
    return
  }

  if (typeof moduleAsAny.bootPlatform === "function") {
    moduleAsAny.bootPlatform({
      organizationKey: organizationId,
      dashboardId: dashboardKey
    })
    return
  }

  if (typeof moduleAsAny.default === "function") {
    moduleAsAny.default({
      organizationKey: organizationId,
      dashboardId: dashboardKey
    })
  }
}

export default function PlatformDashboard(props: Props) {
  runPlatformBoot(props.organizationKey, props.dashboardId)

  const runtime = dashboardRuntimeEngine.createRuntime({
    dashboardKey: props.dashboardId,
    organizationId: props.organizationKey
  })

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0 }}>{runtime.template.title}</h1>
        {runtime.template.description && (
          <p style={{ marginTop: "8px", color: "#475569" }}>
            {runtime.template.description}
          </p>
        )}
      </div>

      {!runtime.found && (
        <div style={{ marginBottom: "16px" }}>
          <MissingDashboard
            title="Requested dashboard not found"
            warnings={runtime.warnings}
          />
        </div>
      )}

      {runtime.warnings.length > 0 && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#fff7ed",
            color: "#9a3412"
          }}
        >
          <strong>Runtime warnings:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
            {runtime.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gap: "16px"
        }}
      >
        {runtime.cards.map((card) => {
          const width = card.instance.placement?.w ?? 4

          return (
            <div
              key={card.id}
              style={{
                gridColumn: `span ${Math.min(Math.max(width, 1), 12)}`
              }}
            >
              <CardRenderer
                instance={card.instance}
                runtime={runtime.context}
              />
            </div>
          )
        })}
      </div>

      {runtime.cards.length === 0 && (
        <MissingDashboard
          title="No cards are configured for this dashboard yet"
          warnings={runtime.warnings}
        />
      )}
    </div>
  )
}