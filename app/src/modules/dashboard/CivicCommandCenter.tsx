import React, { useEffect, useState } from "react"

import { generateOrganizingStrategy } from "@platform/ai/organizing.strategy.engine"
import { calculateInfluenceProfiles } from "@platform/identity/influence.analysis.engine"
import { identifyCommunityBridges } from "@platform/identity/influence.analysis.engine"

import type { CommunityGraph } from "@platform/identity/community.graph.engine"

interface Props {
  graph: CommunityGraph
  organizerId: string
}

export default function CivicCommandCenter({ graph, organizerId }: Props) {

  const [strategy, setStrategy] = useState<any>()
  const [influencers, setInfluencers] = useState<any[]>([])
  const [bridges, setBridges] = useState<any[]>([])

  useEffect(() => {

    const strategyReport =
      generateOrganizingStrategy(graph, organizerId)

    const influence =
      calculateInfluenceProfiles(graph)

    const communityBridges =
      identifyCommunityBridges(graph)

    setStrategy(strategyReport)
    setInfluencers(influence.slice(0,10))
    setBridges(communityBridges.slice(0,10))

  }, [graph, organizerId])

  return (

    <div style={{ padding: 24 }}>

      <h1>🌎 Civic Command Center</h1>

      {/* ------------------------------------------------ */}
      {/* STRATEGIC RECOMMENDATIONS */}
      {/* ------------------------------------------------ */}

      <section style={{ marginTop: 30 }}>

        <h2>AI Organizing Strategy</h2>

        {strategy?.recommendations?.map((rec: any, i: number) => (

          <div
            key={i}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              marginBottom: 10,
              borderRadius: 6
            }}
          >

            <strong>{rec.type}</strong>

            <div>Target: {rec.targetId}</div>

            <div>Reason: {rec.reason}</div>

            <div>Priority: {rec.priority}</div>

          </div>

        ))}

      </section>

      {/* ------------------------------------------------ */}
      {/* TOP INFLUENCERS */}
      {/* ------------------------------------------------ */}

      <section style={{ marginTop: 40 }}>

        <h2>Top Influencers</h2>

        {influencers.map((p, i) => (

          <div
            key={i}
            style={{
              padding: 10,
              borderBottom: "1px solid #eee"
            }}
          >

            <strong>{p.personId}</strong>

            <div>Influence Score: {p.influenceScore}</div>

            <div>Connections: {p.connectionCount}</div>

            <div>{p.reasons?.join(", ")}</div>

          </div>

        ))}

      </section>

      {/* ------------------------------------------------ */}
      {/* COMMUNITY BRIDGES */}
      {/* ------------------------------------------------ */}

      <section style={{ marginTop: 40 }}>

        <h2>Community Connectors</h2>

        {bridges.map((b, i) => (

          <div
            key={i}
            style={{
              padding: 10,
              borderBottom: "1px solid #eee"
            }}
          >

            <strong>{b.personId}</strong>

            <div>Bridge Score: {b.bridgeScore}</div>

            <div>
              Connects: {b.connectsGroups?.join(", ")}
            </div>

          </div>

        ))}

      </section>

    </div>

  )

}
