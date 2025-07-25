/**
 * Type definitions for RBAC Graph components
 * 
 * This module contains all TypeScript interfaces and types used
 * throughout the RBAC Graph visualization system.
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import type * as d3 from "d3"
import type { RbacBinding, RbacFinding, RbacSubject } from "../../types/rbac"

/**
 * Entry from the "who-can" API endpoint
 */
export interface WhoCanEntry {
  subject: string
  namespace: string
  role: string
}

/**
 * Graph node representing subjects and roles in the RBAC visualization
 */
export interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: string
  namespace: string
  hasFinding: boolean
  /** For role nodes, specifies if it's a 'Role' or 'ClusterRole' */
  roleKind?: 'Role' | 'ClusterRole'
}

/**
 * Graph link connecting subjects to roles
 */
export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
}

/**
 * Props for the main RbacGraph component
 */
export interface RbacGraphProps {
  data: RbacBinding[]
  findings?: RbacFinding[]
  focusSubject?: RbacSubject | null
}

/**
 * Graph data structure containing nodes and links
 */
export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

/**
 * Filter option for verbs and resources
 */
export interface FilterOption {
  label: string
  value: string
}

/**
 * State for graph filters
 */
export interface GraphFilters {
  selectedVerbs: string[]
  selectedResources: string[]
  namespaceFilter: string
  showOnlyFlagged: boolean
  enabledSubjectTypes: Set<string>
}
