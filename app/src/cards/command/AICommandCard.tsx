import React, { useState } from "react"

import { Card, CardContent, CardHeader } from "@components/Card"
import { Button, Input, Textarea } from "@components/FormControls"

import { executeAICommand } from "@platform/ai/ai.executor"

function stringifyResult(value: unknown) {
  if (typeof value === "string") return value

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default function AICommandCard() {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)

  async function runCommand() {
    if (!prompt.trim()) return

    setLoading(true)

    try {
      const response = await executeAICommand(prompt)
      const rendered = [
        response.preview,
        response.data !== undefined ? "" : null,
        response.data !== undefined ? stringifyResult(response.data) : null
      ]
        .filter(Boolean)
        .join("\n\n")

      setResult(rendered)
    } catch (err) {
      setResult("AI command failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="AI Command"
        subtitle="Run platform AI actions"
      />

      <CardContent>
        <div className="space-y-3">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask the platform something..."
          />

          <Button
            onClick={runCommand}
            disabled={loading}
          >
            {loading ? "Running..." : "Run"}
          </Button>

          <Textarea
            value={result}
            readOnly
            rows={12}
          />
        </div>
      </CardContent>
    </Card>
  )
}
