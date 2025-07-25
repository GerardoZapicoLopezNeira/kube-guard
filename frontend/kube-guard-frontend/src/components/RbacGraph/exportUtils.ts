/**
 * Export utilities for RBAC Graph
 * 
 * This module provides functions for exporting the graph
 * in different formats (SVG, DOT, etc.).
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import type { GraphNode, GraphLink } from "./types"

/**
 * Exports the graph as a DOT file for use with Graphviz
 * 
 * @param nodes - Array of graph nodes
 * @param links - Array of graph links
 */
export function exportGraphAsDot(nodes: GraphNode[], links: GraphLink[]): void {
  const lines: string[] = []
  lines.push("digraph RBAC {")
  lines.push("  rankdir=LR;") // Optional: left-to-right layout

  // Add nodes
  nodes.forEach(node => {
    // Escape quotes and colons
    const id = `"${node.id.replace(/"/g, '\\"')}"`
    const label = `"${node.label.replace(/"/g, '\\"')}"`
    const shape = node.type === "role" ? "box" : "ellipse"
    lines.push(`  ${id} [label=${label} shape=${shape}];`)
  })

  // Add edges
  links.forEach(link => {
    const sourceId = typeof link.source === "string" ? link.source : link.source.id
    const targetId = typeof link.target === "string" ? link.target : link.target.id
    const sid = `"${sourceId.replace(/"/g, '\\"')}"`
    const tid = `"${targetId.replace(/"/g, '\\"')}"`
    lines.push(`  ${sid} -> ${tid};`)
  })

  lines.push("}")
  const dot = lines.join("\n")

  // Download the file
  const blob = new Blob([dot], { type: "text/vnd.graphviz" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "rbac-graph.dot"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
