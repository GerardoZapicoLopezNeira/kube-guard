"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import * as d3 from "d3"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { VerbFilter } from "./VerbFilter"
import { ResourceFilter } from "./ResourceFilter"
import { NodeDetails } from "./NodeDetails"
import type { RbacBinding, RbacFinding, RbacSubject } from "../types/rbac"


interface WhoCanEntry {
  subject: string
  namespace: string
  role: string
}

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: string
  namespace: string
  hasFinding: boolean
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
}

interface Props {
  data: RbacBinding[]
  findings?: RbacFinding[]
  focusSubject?: RbacSubject | null
}

const VERBS = [
  { label: "get", value: "get" },
  { label: "list", value: "list" },
  { label: "create", value: "create" },
  { label: "update", value: "update" },
  { label: "patch", value: "patch" },
  { label: "delete", value: "delete" },
  { label: "deletecollection", value: "deletecollection" },
]

const RESOURCES = [
  { label: "pods", value: "pods" },
  { label: "deployments", value: "deployments" },
  { label: "services", value: "services" },
  { label: "secrets", value: "secrets" },
  { label: "configmaps", value: "configmaps" },
]

function isWhoCanEntryArray(items: any[]): items is WhoCanEntry[] {
  return items.length > 0 && "subject" in items[0] && "role" in items[0]
}

function buildGraph(items: WhoCanEntry[] | RbacBinding[]) {
  const nodeMap = new Map<string, GraphNode>()
  const links: GraphLink[] = []

  if (isWhoCanEntryArray(items)) {
    for (const item of items as WhoCanEntry[]) {
      const [sKind, sName] = item.subject.split("/", 2)
      const subjId = `subject:${sKind}/${sName}`
      if (!nodeMap.has(subjId)) {
        nodeMap.set(subjId, {
          id: subjId,
          label: sName,
          type: sKind.toLowerCase(),
          namespace: item.namespace,
          hasFinding: false, // Inicialmente sin findings
        })
      }
      const [rKind, rName] = item.role.split("/", 2)
      const roleId = `role:${rKind}/${rName}`
      if (!nodeMap.has(roleId)) {
        nodeMap.set(roleId, {
          id: roleId,
          label: rName,
          type: "role",
          namespace: item.namespace,
          hasFinding: false, // Inicialmente sin findings
        })
      }
      links.push({ source: subjId, target: roleId })
    }
  } else {
    for (const b of items as RbacBinding[]) {
      const ns = b.roleRef.namespace ?? "cluster"
      const roleId = `role:${b.roleRef.kind}/${b.roleRef.name}`
      if (!nodeMap.has(roleId)) {
        nodeMap.set(roleId, {
          id: roleId,
          label: b.roleRef.name,
          type: "role",
          namespace: ns,
          hasFinding: false, // Inicialmente sin findings
        })
      }
      for (const s of b.subjects) {
        const subjId = `subject:${s.kind}/${s.name}`
        const subjNs = s.namespace ?? ns
        if (!nodeMap.has(subjId)) {
          nodeMap.set(subjId, {
            id: subjId,
            label: s.name,
            type: s.kind.toLowerCase(),
            namespace: subjNs,
            hasFinding: false, // Inicialmente sin findings
          })
        }
        links.push({ source: subjId, target: roleId })
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links,
  }
}

export default function RbacGraph({ data, findings, focusSubject }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)

  const [selectedVerbs, setSelectedVerbs] = useState<string[]>([])
  const [selectedResources, setSelectedResources] = useState<string[]>([])
  const [whoCanData, setWhoCanData] = useState<WhoCanEntry[] | null>(null)

  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false);

  const [enabledSubjectTypes, setEnabledSubjectTypes] = useState<Set<string>>(new Set(["user", "group", "serviceaccount"]));

  function toggleSubjectType(type: string) {
    setEnabledSubjectTypes(prev => {
      const copy = new Set(prev)
      if (copy.has(type)) copy.delete(type)
      else copy.add(type)
      return copy
    })
  }

  const riskySubjects = useMemo(() => {
    if (!findings) return new Set<string>()
    return new Set(
      findings.map(f => `subject:${f.Subject.kind}/${f.Subject.name}`)
    )
  }, [findings])

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  // Estado y cálculo de namespaces disponibles
  const [namespaceFilter, setNamespaceFilter] = useState<string>("all")
  const namespaceOptions = useMemo<string[]>(() => {
    const arr = whoCanData
      ? whoCanData.map(e => e.namespace)
      : data.map(b => b.roleRef.namespace ?? "cluster")
    return Array.from(new Set(arr))
  }, [data, whoCanData])

  // Combinamos datos RBAC o WhoCan, y luego filtramos por namespace
  const rawSource = whoCanData ?? data
  const filteredSource = useMemo(() => {
    if (isWhoCanEntryArray(rawSource)) {
      if (namespaceFilter === "all") return rawSource as WhoCanEntry[]
      return (rawSource as WhoCanEntry[]).filter(item => item.namespace === namespaceFilter)
    } else {
      if (namespaceFilter === "all") return rawSource as RbacBinding[]
      return (rawSource as RbacBinding[]).filter(
        b => (b.roleRef.namespace ?? "cluster") === namespaceFilter
      )
    }
  }, [rawSource, namespaceFilter])

  // Construimos nodos/enlaces ya filtrados
  const { nodes, links } = useMemo(
    () => buildGraph(filteredSource),
    [filteredSource]
  )

  const flaggedNodes = useMemo(() => {
    nodes.forEach(n => {
      n.hasFinding = riskySubjects.has(n.id)
    })
    return nodes
  }, [nodes, riskySubjects])

  const flaggedIds = useMemo(
    () => new Set(flaggedNodes.filter(n => n.hasFinding).map(n => n.id)),
    [flaggedNodes]
  );

  const displayedNodes = useMemo(() => {
    let baseNodes = flaggedNodes

    if (showOnlyFlagged) {
      const neighborIds = new Set<string>()
      links.forEach(l => {
        const s = typeof l.source === "string" ? l.source : l.source.id
        const t = typeof l.target === "string" ? l.target : l.target.id
        if (flaggedIds.has(s)) neighborIds.add(t)
        if (flaggedIds.has(t)) neighborIds.add(s)
      })
      baseNodes = baseNodes.filter(n => n.hasFinding || neighborIds.has(n.id))
    }

    return baseNodes.filter(n =>
      n.type === "role" || enabledSubjectTypes.has(n.type)
    )
  }, [flaggedNodes, links, showOnlyFlagged, flaggedIds, enabledSubjectTypes])



  const displayedLinks = useMemo(() => {
    const displayedIds = new Set(displayedNodes.map(n => n.id))

    return links.filter(l => {
      const s = typeof l.source === "string" ? l.source : l.source.id
      const t = typeof l.target === "string" ? l.target : l.target.id
      return displayedIds.has(s) && displayedIds.has(t)
    })
  }, [links, displayedNodes])

  const toggleVerb = (v: string) =>
    setSelectedVerbs(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    )
  const toggleResource = (r: string) =>
    setSelectedResources(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    )

  const handleFilter = async () => {
    if (!selectedVerbs.length || !selectedResources.length) {
      alert("Selecciona un verbo y un recurso")
      return
    }
    try {
      const params = new URLSearchParams()
      selectedVerbs.forEach(v => params.append("verb", v))
      selectedResources.forEach(r => params.append("resource", r))
      const res = await fetch(`/rbac/who-can?${params}`)
      if (!res.ok) throw new Error(res.statusText)
      const json: WhoCanEntry[] = await res.json()
      setWhoCanData(json)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  const handleClear = () => {
    setSelectedVerbs([])
    setSelectedResources([])
    setWhoCanData(null)
  }

  function exportToDot() {
    const lines: string[] = [];
    lines.push("digraph RBAC {");
    // opcional: layout left-to-right
    lines.push("  rankdir=LR;");

    // nodos
    displayedNodes.forEach(n => {
      // escapa comillas y dos puntos
      const id = `"${n.id.replace(/"/g, '\\"')}"`;
      const label = `"${n.label.replace(/"/g, '\\"')}"`;
      lines.push(`  ${id} [label=${label} shape=${n.type === "role" ? "box" : "ellipse"}];`);
    });

    // aristas
    displayedLinks.forEach(l => {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      const sid = `"${s.replace(/"/g, '\\"')}"`;
      const tid = `"${t.replace(/"/g, '\\"')}"`;
      lines.push(`  ${sid} -> ${tid};`);
    });

    lines.push("}");
    const dot = lines.join("\n");

    // descarga el fichero
    const blob = new Blob([dot], { type: "text/vnd.graphviz" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rbac-graph.dot";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  // Inicialización D3
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    const w = svgRef.current.clientWidth || 800
    const h = svgRef.current.clientHeight || 600
    svg.attr("viewBox", [-w / 2, -h / 2, w, h])
    const g = svg.append("g")
    const linkLayer = g.append("g").attr("class", "links")
    const nodeLayer = g.append("g").attr("class", "nodes")
    gRef.current = g.node()
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", e => d3.select(gRef.current).attr("transform", e.transform))
    )
    const sim = d3
      .forceSimulation<GraphNode>()
      .force("link", d3.forceLink<GraphNode, GraphLink>().id(d => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("x", d3.forceX().strength(0.02))
      .force("y", d3.forceY().strength(0.02))
      .on("tick", ticked)
    simulationRef.current = sim
  }, [])


  useEffect(() => {
    if (!simulationRef.current) return
    const sim = simulationRef.current!
    const g = d3.select(gRef.current)

    // --- enlaces ---
    const linkSel = g.select<SVGGElement>("g.links").selectAll<SVGLineElement, GraphLink>("line.link").data(
      displayedLinks,
      d => {
        const s = typeof d.source === "string" ? d.source : d.source.id
        const t = typeof d.target === "string" ? d.target : d.target.id
        return `${s}-${t}`
      }
    )
    linkSel.exit().transition().attr("opacity", 0).remove()
    const linkEnter = linkSel
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0)
    linkEnter.merge(linkSel).transition().attr("opacity", 0.6)

    // --- nodos ---
    const nodeSel = g.select<SVGGElement>("g.nodes").selectAll<SVGGElement, GraphNode>("g.node").data(
      displayedNodes,
      d => d.id
    )
    nodeSel.exit().transition().attr("opacity", 0).remove()
    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .attr("class", "node")
      .call(drag(sim))
      .attr("opacity", 0)

    nodeEnter
      .append("circle")
      .attr("r", 12)
      .attr("fill", d => {
        switch (d.type) {
          case "role":
            return "#90caf9"
          case "serviceaccount":
            return "#4caf50"
          case "user":
            return "#f57c00"
          case "group":
            return "#fbc02d"
          default:
            return "#888"
        }
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", d => (d as any).hasFinding ? 3 : 1.5)
      .classed("blinking-border", d => d.hasFinding)
      .style("cursor", "pointer")
      .on("mouseover", (e, d) => handleMouseOver(e, d))
      .on("mouseout", handleMouseOut)
      .on("click", (e, d) => {
        e.stopPropagation()
        setSelectedNode(d)
      })

    nodeEnter
      .append("text")
      .text(d => (d as any).hasFinding ? `⚠ ${d.label}` : d.label)
      .attr("x", 16)
      .attr("y", 4)
      .attr("font-size", 12)
      .attr("fill", "#fff")
      .attr("class", "node-label")

    nodeEnter.append("title").text(d => {
      const warning = (d as any).hasFinding ? "⚠️ Finding detected\n" : ""
      return `${warning}${d.type}: ${d.label}`
    })

    nodeEnter.merge(nodeSel).transition().attr("opacity", 1)

    sim.nodes(displayedNodes);
    (sim.force("link") as d3.ForceLink<GraphNode, GraphLink>).links(displayedLinks);
    sim.alpha(1).restart()
  }, [displayedNodes, displayedLinks])

  useEffect(() => {
    if (!focusSubject) {
      setSelectedNode(null);
    } else {
      const nodeId = `subject:${focusSubject.kind}/${focusSubject.name}`;
      const foundNode = nodes.find(n => n.id === nodeId) || null;
      setSelectedNode(foundNode);
    }
  }, [focusSubject, nodes])

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

  function drag(sim: d3.Simulation<GraphNode, GraphLink>) {
    return d3
      .drag<SVGGElement, GraphNode>()
      .on("start", (e, d) => {
        if (!e.active) sim.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (e, d) => {
        d.fx = e.x
        d.fy = e.y
      })
      .on("end", (e, d) => {
        if (!e.active) sim.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
  }

  function handleMouseOver(_: any, d: GraphNode) {
    const connected = new Set<string>([d.id])
    links.forEach(l => {
      const s = typeof l.source === "string" ? l.source : l.source.id
      const t = typeof l.target === "string" ? l.target : l.target.id
      if (s === d.id) connected.add(t)
      if (t === d.id) connected.add(s)
    })
    d3.selectAll<SVGGElement, GraphNode>(".node")
      .classed("dimmed", n => !connected.has(n.id))
      .classed("highlighted", n => connected.has(n.id))
    d3.selectAll<SVGLineElement, GraphLink>(".link")
      .classed("dimmed", l => {
        const s = typeof l.source === "string" ? l.source : l.source.id
        const t = typeof l.target === "string" ? l.target : l.target.id
        return !connected.has(s) || !connected.has(t)
      })
      .classed("highlighted-link", l => {
        const s = typeof l.source === "string" ? l.source : l.source.id
        const t = typeof l.target === "string" ? l.target : l.target.id
        return connected.has(s) && connected.has(t)
      })
  }

  function handleMouseOut() {
    d3.selectAll(".node").classed("dimmed", false).classed("highlighted", false)
    d3.selectAll(".link").classed("dimmed", false).classed("highlighted-link", false)
  }


  function exportAsSVG(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault()
    if (!svgRef.current || !gRef.current) return

    // Guarda transform actual
    const originalTransform = gRef.current.getAttribute("transform")

    // Resetea para exportar "todo"
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
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Restaurar transform
    if (originalTransform) {
      gRef.current.setAttribute("transform", originalTransform)
    }
  }

  return (
    <>
      {/* ─── Card con gráfico ─── */}
      <Card className="bg-muted text-white rounded-xl shadow-md p-6 mt-12 border border-border">
        <CardHeader>
          <CardTitle className="text-2xl">RBAC Graph View</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Leyenda */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
            {[
              { label: "User", color: "#f57c00", type: "user" },
              { label: "Group", color: "#fbc02d", type: "group" },
              { label: "ServiceAccount", color: "#4caf50", type: "serviceaccount" },
            ].map(item => {
              const isActive = enabledSubjectTypes.has(item.type)
              return (
                <button
                  key={item.label}
                  onClick={() => toggleSubjectType(item.type)}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition ${isActive ? "opacity-100" : "opacity-40"
                    }`}
                  title={`Toggle ${item.label}`}
                >
                  <span
                    className="inline-block w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 mb-4">
            <VerbFilter
              options={VERBS}
              selected={selectedVerbs}
              onToggle={toggleVerb}
            />
            <ResourceFilter
              options={RESOURCES}
              selected={selectedResources}
              onToggle={toggleResource}
            />

            <Select
              value={namespaceFilter}
              onValueChange={setNamespaceFilter}
            >

              <SelectTrigger className="w-[200px] flex-none px-3 py-1 rounded border border-border bg-background text-sm hover:bg-muted transition">
                <SelectValue placeholder="Namespace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All namespaces</SelectItem>
                {namespaceOptions.map(ns => (
                  <SelectItem key={ns} value={ns}>
                    {ns === "cluster" ? "Cluster-wide" : ns}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="inline-flex items-center space-x-1 text-sm">
              <input
                type="checkbox"
                checked={showOnlyFlagged}
                onChange={e => setShowOnlyFlagged(e.target.checked)}
              />
              <span>Mostrar solo inseguros</span>
            </label>
            <div className="ml-auto flex gap-2">
              <Button onClick={handleFilter}>Buscar</Button>
              <Button variant="outline" onClick={handleClear}>
                Limpiar
              </Button>
            </div>
            <Button onClick={exportAsSVG}>Exportar grafo (SVG)</Button>
          </div>

          {/* SVG con D3 */}
          <svg
            ref={svgRef}
            className="w-full h-[600px] bg-background/90 backdrop-blur-lg shadow-2xl border border-border rounded bg-[#1e1e2f]"
            role="img"
            aria-label="RBAC Graph"
          />
        </CardContent>
      </Card>


      <Sheet
        open={!!selectedNode}
        onOpenChange={(open) => {
          if (!open) setSelectedNode(null)
        }}
      >
        <SheetContent
          side="right"
          className="!w-[500px] !max-w-none bg-background/150 backdrop-blur-lg shadow-2xl transition-transform duration-300"

        >
          <SheetHeader>
            {/* flex con título + botón juntos */}
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-semibold max-w-[calc(100%-3rem)] whitespace-normal break-words">
                {selectedNode?.label}
              </SheetTitle>


            </div>

            <SheetDescription className="mt-1 text-sm text-muted-foreground">
              Detalles y capacidades
            </SheetDescription>
          </SheetHeader>

          {selectedNode && (
            <div className="p-4">
              <NodeDetails node={selectedNode} />
            </div>
          )}
        </SheetContent>

      </Sheet>
    </>
  )


}
