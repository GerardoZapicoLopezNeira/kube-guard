/**
 * Custom hook for managing RBAC Graph state
 * 
 * This hook encapsulates all the complex state management logic
 * for the RBAC Graph component, including filters, data processing,
 * and node selection.
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import { useState, useMemo } from "react"
import type { RbacBinding, RbacFinding } from "../../types/rbac"
import type { WhoCanEntry, GraphNode } from "./types"
import { DEFAULT_SUBJECT_TYPES } from "./constants"
import { 
  buildGraph, 
  markNodesWithFindings, 
  filterDisplayedNodes, 
  filterDisplayedLinks,
  isWhoCanEntryArray
} from "./utils"

/**
 * Props for the useRbacGraph hook
 */
interface UseRbacGraphProps {
  data: RbacBinding[]
  findings?: RbacFinding[]
}

/**
 * Custom hook that manages all RBAC Graph state and derived data
 * 
 * @param data - RBAC bindings data
 * @param findings - Security findings data
 * @returns Object containing state, actions, and computed values
 */
export function useRbacGraph({ data, findings }: UseRbacGraphProps) {
  // === Filter State ===
  const [selectedVerbs, setSelectedVerbs] = useState<string[]>([])
  const [selectedResources, setSelectedResources] = useState<string[]>([])
  const [whoCanData, setWhoCanData] = useState<WhoCanEntry[] | null>(null)
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false)
  const [enabledSubjectTypes, setEnabledSubjectTypes] = useState<Set<string>>(DEFAULT_SUBJECT_TYPES)
  const [namespaceFilter, setNamespaceFilter] = useState<string>("all")
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  // === Computed Values ===
  
  /**
   * Set of risky subject IDs based on findings
   */
  const riskySubjects = useMemo(() => {
    if (!findings) return new Set<string>()
    return new Set(
      findings.map(finding => `subject:${finding.Subject.kind}/${finding.Subject.name}`)
    )
  }, [findings])

  /**
   * Available namespace options for filtering
   */
  const namespaceOptions = useMemo<string[]>(() => {
    const rawSource = whoCanData ?? data
    const namespaces = isWhoCanEntryArray(rawSource)
      ? (rawSource as WhoCanEntry[]).map(entry => entry.namespace)
      : (rawSource as RbacBinding[]).map(binding => binding.roleRef.namespace ?? "cluster")
    
    return Array.from(new Set(namespaces))
  }, [data, whoCanData])

  /**
   * Filtered data source based on namespace filter
   */
  const filteredSource = useMemo(() => {
    const rawSource = whoCanData ?? data
    
    if (namespaceFilter === "all") return rawSource
    
    if (isWhoCanEntryArray(rawSource)) {
      return (rawSource as WhoCanEntry[]).filter(item => item.namespace === namespaceFilter)
    } else {
      return (rawSource as RbacBinding[]).filter(
        binding => (binding.roleRef.namespace ?? "cluster") === namespaceFilter
      )
    }
  }, [data, whoCanData, namespaceFilter])

  /**
   * Graph data built from filtered source
   */
  const { nodes, links } = useMemo(
    () => buildGraph(filteredSource),
    [filteredSource]
  )

  /**
   * Nodes with finding flags marked
   */
  const flaggedNodes = useMemo(() => 
    markNodesWithFindings([...nodes], riskySubjects),
    [nodes, riskySubjects]
  )

  /**
   * Set of flagged node IDs for quick lookup
   */
  const flaggedIds = useMemo(
    () => new Set(flaggedNodes.filter(node => node.hasFinding).map(node => node.id)),
    [flaggedNodes]
  )

  /**
   * Nodes to display based on filters
   */
  const displayedNodes = useMemo(() => 
    filterDisplayedNodes(flaggedNodes, links, showOnlyFlagged, enabledSubjectTypes, flaggedIds),
    [flaggedNodes, links, showOnlyFlagged, enabledSubjectTypes, flaggedIds]
  )

  /**
   * Links to display based on displayed nodes
   */
  const displayedLinks = useMemo(() => 
    filterDisplayedLinks(links, displayedNodes),
    [links, displayedNodes]
  )

  // === Actions ===
  
  /**
   * Toggle a verb in the selected verbs array
   */
  const toggleVerb = (verb: string) => {
    setSelectedVerbs(prev =>
      prev.includes(verb) ? prev.filter(v => v !== verb) : [...prev, verb]
    )
  }

  /**
   * Toggle a resource in the selected resources array
   */
  const toggleResource = (resource: string) => {
    setSelectedResources(prev =>
      prev.includes(resource) ? prev.filter(r => r !== resource) : [...prev, resource]
    )
  }

  /**
   * Toggle a subject type in the enabled types set
   */
  const toggleSubjectType = (type: string) => {
    setEnabledSubjectTypes(prev => {
      const copy = new Set(prev)
      if (copy.has(type)) {
        copy.delete(type)
      } else {
        copy.add(type)
      }
      return copy
    })
  }

  /**
   * Handle the filter action to fetch "who-can" data
   */
  const handleFilter = async () => {
    if (!selectedVerbs.length || !selectedResources.length) {
      alert("Selecciona un verbo y un recurso")
      return
    }

    try {
      const params = new URLSearchParams()
      selectedVerbs.forEach(verb => params.append("verb", verb))
      selectedResources.forEach(resource => params.append("resource", resource))
      
      const response = await fetch(`/rbac/who-can?${params}`)
      if (!response.ok) throw new Error(response.statusText)
      
      const json: WhoCanEntry[] = await response.json()
      setWhoCanData(json)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * Clear all filters and reset to original data
   */
  const handleClear = () => {
    setSelectedVerbs([])
    setSelectedResources([])
    setWhoCanData(null)
  }

  return {
    // State
    selectedVerbs,
    selectedResources,
    namespaceFilter,
    showOnlyFlagged,
    enabledSubjectTypes,
    selectedNode,
    
    // Computed data
    displayedNodes,
    displayedLinks,
    namespaceOptions,
    flaggedNodes: flaggedIds,
    
    // Actions
    setSelectedVerbs,
    setSelectedResources,
    setNamespaceFilter,
    setShowOnlyFlagged,
    setSelectedNode,
    toggleVerb,
    toggleResource,
    toggleSubjectType,
    handleFilter,
    handleClear,
  }
}
