/**
 * Graph utilities for RBAC visualization
 * 
 * This module contains utility functions for building and manipulating
 * the graph data structure used in the RBAC visualization.
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import type { RbacBinding } from "../../types/rbac"
import type { WhoCanEntry, GraphNode, GraphLink, GraphData } from "./types"

/**
 * Type guard to check if an array contains WhoCanEntry items
 * @param items - Array to check
 * @returns True if the array contains WhoCanEntry items
 */
export function isWhoCanEntryArray(items: any[]): items is WhoCanEntry[] {
  return items.length > 0 && "subject" in items[0] && "role" in items[0]
}

/**
 * Builds a graph data structure from RBAC bindings or WhoCanEntry data
 * 
 * @param items - Either RBAC bindings or WhoCanEntry data
 * @returns Graph data with nodes and links
 */
export function buildGraph(items: WhoCanEntry[] | RbacBinding[]): GraphData {
  const nodeMap = new Map<string, GraphNode>()
  const links: GraphLink[] = []

  if (isWhoCanEntryArray(items)) {
    // Build graph from WhoCanEntry data
    for (const item of items as WhoCanEntry[]) {
      const [sKind, sName] = item.subject.split("/", 2)
      const subjId = `subject:${sKind}/${sName}`
      
      if (!nodeMap.has(subjId)) {
        nodeMap.set(subjId, {
          id: subjId,
          label: sName,
          type: sKind.toLowerCase(),
          namespace: item.namespace,
          hasFinding: false,
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
          hasFinding: false,
          roleKind: rKind as 'Role' | 'ClusterRole',
        })
      }
      
      links.push({ source: subjId, target: roleId })
    }
  } else {
    // Build graph from RBAC bindings
    for (const binding of items as RbacBinding[]) {
      const ns = binding.roleRef.namespace ?? "cluster"
      const roleId = `role:${binding.roleRef.kind}/${binding.roleRef.name}`
      
      if (!nodeMap.has(roleId)) {
        nodeMap.set(roleId, {
          id: roleId,
          label: binding.roleRef.name,
          type: "role",
          namespace: ns,
          hasFinding: false,
          roleKind: binding.roleRef.kind as 'Role' | 'ClusterRole',
        })
      }
      
      for (const subject of binding.subjects) {
        const subjId = `subject:${subject.kind}/${subject.name}`
        const subjNs = subject.namespace ?? ns
        
        if (!nodeMap.has(subjId)) {
          nodeMap.set(subjId, {
            id: subjId,
            label: subject.name,
            type: subject.kind.toLowerCase(),
            namespace: subjNs,
            hasFinding: false,
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

/**
 * Marks nodes that have security findings
 * 
 * @param nodes - Array of graph nodes
 * @param riskySubjects - Set of risky subject IDs
 * @returns Modified nodes array with hasFinding flags set
 */
export function markNodesWithFindings(
  nodes: GraphNode[], 
  riskySubjects: Set<string>
): GraphNode[] {
  nodes.forEach(node => {
    node.hasFinding = riskySubjects.has(node.id)
  })
  return nodes
}

/**
 * Filters nodes based on various criteria
 * 
 * @param nodes - All available nodes
 * @param links - All available links
 * @param showOnlyFlagged - Whether to show only flagged nodes and their neighbors
 * @param enabledSubjectTypes - Set of enabled subject types
 * @param flaggedIds - Set of flagged node IDs
 * @returns Filtered array of nodes
 */
export function filterDisplayedNodes(
  nodes: GraphNode[],
  links: GraphLink[],
  showOnlyFlagged: boolean,
  enabledSubjectTypes: Set<string>,
  flaggedIds: Set<string>
): GraphNode[] {
  let baseNodes = nodes

  if (showOnlyFlagged) {
    const neighborIds = new Set<string>()
    
    links.forEach(link => {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id
      const targetId = typeof link.target === "string" ? link.target : link.target.id
      
      if (flaggedIds.has(sourceId)) neighborIds.add(targetId)
      if (flaggedIds.has(targetId)) neighborIds.add(sourceId)
    })
    
    baseNodes = baseNodes.filter(node => 
      node.hasFinding || neighborIds.has(node.id)
    )
  }

  return baseNodes.filter(node =>
    node.type === "role" || enabledSubjectTypes.has(node.type)
  )
}

/**
 * Filters links to only include those between displayed nodes
 * 
 * @param links - All available links
 * @param displayedNodes - Currently displayed nodes
 * @returns Filtered array of links
 */
export function filterDisplayedLinks(
  links: GraphLink[],
  displayedNodes: GraphNode[]
): GraphLink[] {
  const displayedIds = new Set(displayedNodes.map(node => node.id))

  return links.filter(link => {
    const sourceId = typeof link.source === "string" ? link.source : link.source.id
    const targetId = typeof link.target === "string" ? link.target : link.target.id
    return displayedIds.has(sourceId) && displayedIds.has(targetId)
  })
}
