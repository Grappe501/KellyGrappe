import React, { useMemo } from "react"
import ForceGraph2D from "react-force-graph-2d"

import type { CommunityGraph } from "@platform/identity/community.graph.engine"

/*
  Civic Network Map
  -----------------
  Visualizes the relational civic graph.

  Nodes = people
  Links = relationships
*/

interface Props {
  graph: CommunityGraph
}

interface GraphNode {
  id: string
  label?: string
  influence?: number
  organizerLevel?: number
}

interface GraphLink {
  source: string
  target: string
}

export default function CivicNetworkMap({ graph }: Props) {

  const data = useMemo(() => {

    const nodes: GraphNode[] = []
    const links: GraphLink[] = []

    const seenLinks = new Set<string>()

    if (!graph) {
      return { nodes, links }
    }

    /* ------------------------------------------------ */
    /* Build nodes                                       */
    /* ------------------------------------------------ */

    for (const person of graph.nodes ?? []) {

      nodes.push({
        id: (person as any).id,
        label: (person as any).name ?? (person as any).id,
        influence: (person as any).reputationScore ?? 0,
        organizerLevel: (person as any).organizerLevel ?? 0
      })

    }

    /* ------------------------------------------------ */
    /* Build links safely (schema tolerant)              */
    /* ------------------------------------------------ */

    for (const edge of graph.edges ?? []) {

      const source =
        (edge as any).source ??
        (edge as any).from ??
        (edge as any).fromId ??
        (edge as any).personA ??
        (edge as any).nodeA

      const target =
        (edge as any).target ??
        (edge as any).to ??
        (edge as any).toId ??
        (edge as any).personB ??
        (edge as any).nodeB

      if (!source || !target) continue

      const s = String(source)
      const t = String(target)

      const key = [s, t].sort().join("-")

      if (!seenLinks.has(key)) {

        links.push({
          source: s,
          target: t
        })

        seenLinks.add(key)

      }

    }

    return { nodes, links }

  }, [graph])

  return (

    <div style={{ height: "700px", width: "100%" }}>

      <ForceGraph2D
        graphData={data}

        nodeLabel={(node: any) => node.label || node.id}

        nodeVal={(node: any) =>
          Math.max(node.influence || 1, 1)
        }

        nodeColor={(node: any) => {

          if ((node.organizerLevel ?? 0) >= 3)
            return "#ff6b00" // organizers

          if ((node.influence ?? 0) >= 50)
            return "#2a7fff" // influencers

          return "#888"

        }}

        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.002}
        linkColor={() => "#bbb"}

      />

    </div>

  )

}
