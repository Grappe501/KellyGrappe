import React, { useMemo, useState } from "react"

import { AIRegistry } from "@platform/ai/ai.registry"
import { routeAICommand, type AICommandPreviewResult } from "@platform/ai/ai.command-router"

type ModuleRendererProps = {
  moduleKey: string
}

export default function ModuleRenderer({ moduleKey }: ModuleRendererProps) {

  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState<AICommandPreviewResult | null>(null)
  const [running, setRunning] = useState(false)

  const tools = useMemo(() => {
    return AIRegistry.getToolsByModule(moduleKey)
  }, [moduleKey])

  const actions = useMemo(() => {
    return AIRegistry.getActionsByModule(moduleKey)
  }, [moduleKey])

  async function runPrompt() {

    setRunning(true)

    try {

      const routed = await routeAICommand(prompt || moduleKey)

      setResult(routed)

    } finally {

      setRunning(false)

    }

  }

  return (
    <div className="space-y-6">

      <div className="border-b pb-2">
        <h2 className="text-xl font-semibold">
          Module: {moduleKey}
        </h2>
      </div>

      <div className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">

        <h3 className="text-lg font-medium">
          AI Command Router
        </h3>

        <input
          className="w-full rounded border px-3 py-2"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Ask ${moduleKey} to analyze, draft, summarize, or route work...`}
        />

        <button
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          onClick={runPrompt}
          disabled={running}
        >
          {running ? "Running..." : "Run Command"}
        </button>

        {result && (
          <pre className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">
            {result.preview}
          </pre>
        )}

      </div>

      <div className="space-y-3">

        <h3 className="text-lg font-medium">
          AI Tools
        </h3>

        {tools.length === 0 && (
          <p className="text-sm text-gray-500">
            No tools registered for this module.
          </p>
        )}

        {tools.map((tool) => (

          <div
            key={tool.key}
            className="rounded-lg border bg-white p-3 shadow-sm"
          >

            <div className="font-medium">
              {tool.title}
            </div>

            <div className="text-sm text-gray-600">
              {tool.description}
            </div>

            <div className="mt-1 text-xs text-gray-400">
              Action Type: {tool.actionType}
            </div>

          </div>

        ))}

      </div>

      <div className="space-y-3">

        <h3 className="text-lg font-medium">
          AI Actions
        </h3>

        {actions.length === 0 && (
          <p className="text-sm text-gray-500">
            No actions registered for this module.
          </p>
        )}

        {actions.map((action) => (

          <div
            key={action.key}
            className="rounded-lg border bg-white p-3 shadow-sm"
          >

            <div className="flex items-center justify-between gap-4">

              <div>

                <div className="font-medium">
                  {action.title}
                </div>

                <div className="text-sm text-gray-600">
                  {action.description}
                </div>

                <div className="mt-1 text-xs text-gray-400">
                  Action Type: {action.actionType}
                </div>

              </div>

              <button
                className="rounded bg-slate-800 px-3 py-1 text-sm text-white"
                onClick={async () => {

                  setRunning(true)

                  try {

                    const routed = await routeAICommand(action.title)

                    setResult(routed)

                  } finally {

                    setRunning(false)

                  }

                }}
              >
                Run
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  )
}
