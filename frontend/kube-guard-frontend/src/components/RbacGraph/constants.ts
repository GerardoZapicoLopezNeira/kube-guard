/**
 * Constants for RBAC Graph visualization
 * 
 * This module contains all constant values used in the RBAC Graph
 * components, including filter options, colors, and configuration values.
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import type { FilterOption } from "./types"

/**
 * Available Kubernetes verbs for filtering
 */
export const VERBS: FilterOption[] = [
  { label: "get", value: "get" },
  { label: "list", value: "list" },
  { label: "create", value: "create" },
  { label: "update", value: "update" },
  { label: "patch", value: "patch" },
  { label: "delete", value: "delete" },
  { label: "deletecollection", value: "deletecollection" },
]

/**
 * Available Kubernetes resources for filtering
 */
export const RESOURCES: FilterOption[] = [
  { label: "pods", value: "pods" },
  { label: "deployments", value: "deployments" },
  { label: "services", value: "services" },
  { label: "secrets", value: "secrets" },
  { label: "configmaps", value: "configmaps" },
]

/**
 * Color mapping for different node types
 */
export const NODE_COLORS = {
  role: "#90caf9",
  serviceaccount: "#4caf50",
  user: "#f57c00",
  group: "#fbc02d",
  default: "#888"
} as const

/**
 * Default subject types that are enabled
 */
export const DEFAULT_SUBJECT_TYPES = new Set(["user", "group", "serviceaccount"])

/**
 * Legend items for the graph
 */
export const LEGEND_ITEMS = [
  { label: "User", color: NODE_COLORS.user, type: "user" },
  { label: "Group", color: NODE_COLORS.group, type: "group" },
  { label: "ServiceAccount", color: NODE_COLORS.serviceaccount, type: "serviceaccount" },
] as const
