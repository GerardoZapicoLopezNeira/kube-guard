/**
 * D3 Graph Visualization Component
 * 
 * This component handles all D3.js-specific logic for rendering
 * the RBAC graph visualization, including simulation, interactions,
 * and visual effects.
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import * as d3 from "d3"
import type { GraphNode, GraphLink } from "./types"
import { NODE_COLORS } from "./constants"

/**
 * Props for the D3Graph component
 */
interface D3GraphProps {
  nodes: GraphNode[]
  links: GraphLink[]
  onNodeClick: (node: GraphNode) => void
  className?: string
}

/**
 * Interface for imperative methods exposed by D3Graph
 */
export interface D3GraphRef {
  exportSVG: () => void
}

/**
 * D3.js graph visualization component
 * 
 * This component encapsulates all D3.js logic for rendering the graph,
 * including force simulation, drag interactions, and visual effects.
 */
export const D3Graph = forwardRef<D3GraphRef, D3GraphProps>(({
  nodes,
  links,
  onNodeClick,
  className = ""
}, ref) => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    exportSVG: () => {
      if (!svgRef.current || !gRef.current) return

      // Save current transform
      const originalTransform = gRef.current.getAttribute("transform")

      // Reset for export
      gRef.current.setAttribute("transform", "translate(0,0) scale(1)")

      const serializer = new XMLSerializer()
      const source = serializer.serializeToString(svgRef.current)
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = "rbac-graph.svg"
      a.click()

      // Cleanup
      URL.revokeObjectURL(url)

      // Restore transform
      if (originalTransform) {
        gRef.current.setAttribute("transform", originalTransform)
      }
    }
  }), [])

  /**
   * Initialize D3 setup on mount
   */
  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const w = svgRef.current.clientWidth || 800
    const h = svgRef.current.clientHeight || 600
    svg.attr("viewBox", [-w / 2, -h / 2, w, h])

    const g = svg.append("g")
    g.append("g").attr("class", "links")
    g.append("g").attr("class", "nodes")
    gRef.current = g.node()

    // Setup zoom behavior
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", e => d3.select(gRef.current).attr("transform", e.transform))
    )

    // Setup force simulation
    const simulation = d3
      .forceSimulation<GraphNode>()
      .force("link", d3.forceLink<GraphNode, GraphLink>().id(d => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("x", d3.forceX().strength(0.02))
      .force("y", d3.forceY().strength(0.02))
      .on("tick", ticked)

    simulationRef.current = simulation

    function ticked() {
      if (!gRef.current) return
      const g = d3.select(gRef.current)
      
      g.selectAll<SVGLineElement, GraphLink>("line.link")
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!)
      
      g.selectAll<SVGGElement, GraphNode>("g.node")
        .attr("transform", d => `translate(${d.x},${d.y})`)
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
    }
  }, [])

  /**
   * Update visualization when data changes
   */
  useEffect(() => {
    if (!simulationRef.current || !gRef.current) return

    const simulation = simulationRef.current
    const g = d3.select(gRef.current)

    // === Update Links ===
    const linkSelection = g.select<SVGGElement>("g.links")
      .selectAll<SVGLineElement, GraphLink>("line.link")
      .data(links, d => {
        const sourceId = typeof d.source === "string" ? d.source : d.source.id
        const targetId = typeof d.target === "string" ? d.target : d.target.id
        return `${sourceId}-${targetId}`
      })

    linkSelection.exit().transition().attr("opacity", 0).remove()

    const linkEnter = linkSelection
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0)

    linkEnter.merge(linkSelection).transition().attr("opacity", 0.6)

    // === Update Nodes ===
    const nodeSelection = g.select<SVGGElement>("g.nodes")
      .selectAll<SVGGElement, GraphNode>("g.node")
      .data(nodes, d => d.id)

    nodeSelection.exit().transition().attr("opacity", 0).remove()

    const nodeEnter = nodeSelection
      .enter()
      .append("g")
      .attr("class", "node")
      .call(createDragBehavior(simulation))
      .attr("opacity", 0)

    // Add circles
    nodeEnter
      .append("circle")
      .attr("r", 12)
      .attr("fill", getNodeColor)
      .attr("stroke", "#fff")
      .attr("stroke-width", d => d.hasFinding ? 3 : 1.5)
      .classed("blinking-border", d => d.hasFinding)
      .style("cursor", "pointer")
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", (event, d) => {
        event.stopPropagation()
        onNodeClick(d)
      })

    // Add labels
    nodeEnter
      .append("text")
      .text(d => d.hasFinding ? `⚠ ${d.label}` : d.label)
      .attr("x", 16)
      .attr("y", 4)
      .attr("font-size", 12)
      .attr("fill", "#fff")
      .attr("class", "node-label")

    // Add tooltips
    nodeEnter.append("title").text(d => {
      const warning = d.hasFinding ? "⚠️ Finding detected\n" : ""
      return `${warning}${d.type}: ${d.label}`
    })

    nodeEnter.merge(nodeSelection).transition().attr("opacity", 1)

    // Update simulation
    simulation.nodes(nodes)
    const linkForce = simulation.force("link") as d3.ForceLink<GraphNode, GraphLink>
    linkForce.links(links)
    simulation.alpha(1).restart()

  }, [nodes, links, onNodeClick])

  /**
   * Get color for a node based on its type
   */
  function getNodeColor(d: GraphNode): string {
    return NODE_COLORS[d.type as keyof typeof NODE_COLORS] || NODE_COLORS.default
  }

  /**
   * Create drag behavior for nodes
   */
  function createDragBehavior(simulation: d3.Simulation<GraphNode, GraphLink>) {
    return d3
      .drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
  }

  /**
   * Handle mouse over events for highlighting
   */
  function handleMouseOver(_: any, d: GraphNode) {
    const connected = new Set<string>([d.id])
    
    links.forEach(link => {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id
      const targetId = typeof link.target === "string" ? link.target : link.target.id
      
      if (sourceId === d.id) connected.add(targetId)
      if (targetId === d.id) connected.add(sourceId)
    })

    d3.selectAll<SVGGElement, GraphNode>(".node")
      .classed("dimmed", n => !connected.has(n.id))
      .classed("highlighted", n => connected.has(n.id))

    d3.selectAll<SVGLineElement, GraphLink>(".link")
      .classed("dimmed", l => {
        const sourceId = typeof l.source === "string" ? l.source : l.source.id
        const targetId = typeof l.target === "string" ? l.target : l.target.id
        return !connected.has(sourceId) || !connected.has(targetId)
      })
      .classed("highlighted-link", l => {
        const sourceId = typeof l.source === "string" ? l.source : l.source.id
        const targetId = typeof l.target === "string" ? l.target : l.target.id
        return connected.has(sourceId) && connected.has(targetId)
      })
  }

  /**
   * Handle mouse out events to remove highlighting
   */
  function handleMouseOut() {
    d3.selectAll(".node").classed("dimmed", false).classed("highlighted", false)
    d3.selectAll(".link").classed("dimmed", false).classed("highlighted-link", false)
  }

  return (
    <svg
      ref={svgRef}
      className={`w-full h-[600px] bg-background/90 backdrop-blur-lg shadow-2xl border border-border rounded bg-[#1e1e2f] ${className}`}
      role="img"
      aria-label="RBAC Graph"
    />
  )
})
