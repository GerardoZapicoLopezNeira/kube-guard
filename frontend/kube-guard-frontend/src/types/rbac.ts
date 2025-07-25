/**
 * RBAC Type Definitions
 * 
 * This module contains TypeScript type definitions for all RBAC-related data
 * structures used throughout the KubeGuard frontend application. These types
 * ensure type safety and provide clear contracts for API responses and component props.
 * 
 * The types mirror the backend API responses and provide a consistent interface
 * for working with Kubernetes RBAC data including bindings, findings, and policy rules.
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

/**
 * Represents a subject in an RBAC binding.
 * 
 * Subjects are entities (users, service accounts, groups) that can be granted
 * permissions through RBAC bindings.
 */
export interface RbacSubject {
  /** The kind of subject (User, ServiceAccount, Group) */
  kind: string
  
  /** The name of the subject */
  name: string
  
  /** API group for the subject (optional) */
  apiGroup?: string | null
  
  /** Namespace for the subject (optional, used for ServiceAccounts) */
  namespace?: string | null
}

/**
 * Represents a role reference in an RBAC binding.
 * 
 * Role references point to the Role or ClusterRole that defines the permissions
 * being granted to the subjects in the binding.
 */
export interface RbacRoleRef {
  /** The kind of role (Role or ClusterRole) */
  kind: string
  
  /** The name of the role */
  name: string
  
  /** API group for the role (optional) */
  apiGroup?: string | null
  
  /** Namespace for the role (required for Roles, null for ClusterRoles) */
  namespace?: string | null
}

/**
 * Represents a complete RBAC binding (RoleBinding or ClusterRoleBinding).
 * 
 * Bindings connect subjects to roles, granting the permissions defined in
 * the role to the specified subjects.
 */
export interface RbacBinding {
  /** Unique identifier for the binding */
  id: number
  
  /** Name of the binding */
  name: string
  
  /** Kind of binding (RoleBinding or ClusterRoleBinding) */
  kind: string
  
  /** Array of subjects that receive the permissions */
  subjects: RbacSubject[]
  
  /** Reference to the role that defines the permissions */
  roleRef: RbacRoleRef
  
  /** Raw YAML representation of the binding (optional) */
  raw?: string
}

/**
 * Legacy subject interface for compatibility.
 * @deprecated Use RbacSubject instead
 */
export interface Subject {
  kind: string
  name: string
  namespace?: string
  apiGroup?: string
}

/**
 * Detailed information about a security finding.
 * 
 * Contains the analysis results including severity, recommendations,
 * and references for addressing the security issue.
 */
export interface FindingDetails {
  /** Severity level of the finding (High, Medium, Low) */
  Severity: string
  
  /** Descriptive message explaining the finding */
  Message: string
  
  /** Recommended action to address the finding */
  Recommendation: string
  
  /** Name of the rule that generated this finding */
  RuleName: string
  
  /** Unique identifier for the rule */
  RuleUuid: string
  
  /** Optional references for additional information */
  References?: string[]
}

/**
 * Represents a security finding from RBAC analysis.
 * 
 * Findings identify potential security risks or policy violations
 * in the cluster's RBAC configuration.
 */
export interface RbacFinding {
  /** The subject associated with this finding */
  Subject: Subject
  
  /** Detailed information about the finding */
  Finding: FindingDetails
}

/**
 * Represents the origin of a permission (which role granted it).
 * 
 * Used to track where specific permissions come from in the RBAC hierarchy.
 */
export interface RbacOrigin {
  /** API group of the role that grants this permission */
  apiGroup: string
  
  /** Kind of the role (Role or ClusterRole) */
  kind: string
  
  /** Name of the role */
  /** Name of the role */
  name: string
}

/**
 * Represents an allowed action/permission that a subject can perform.
 * 
 * Allowed actions define specific permissions including the verb (action),
 * target resources, and the roles that grant these permissions.
 */
export interface RbacAllowedAction {
  /** Namespace where this action is allowed */
  namespace: string
  
  /** Action verb (get, list, create, update, delete, etc.) */
  verb: string
  
  /** API group of the target resource (optional) */
  apiGroup?: string
  
  /** Type of resource this action applies to (optional) */
  resource?: string
  
  /** Non-resource URI for actions outside of resource types (optional) */
  nonResourceURI?: string
  
  /** Array of roles/origins that grant this permission */
  originatedFrom: RbacOrigin[]
}

/**
 * Represents a complete policy rule for a subject.
 * 
 * Policy rules aggregate all permissions that a specific subject has,
 * providing a comprehensive view of what actions they can perform.
 */
export interface RbacPolicyRule {
  /** Kind of subject this rule applies to */
  kind: string
  
  /** Name of the subject */
  name: string
  
  /** Namespace of the subject (optional) */
  namespace?: string
  
  /** Array of all actions this subject is allowed to perform */
  allowedTo: RbacAllowedAction[]
}

/**
 * Represents a Kubernetes native policy rule structure.
 * 
 * This mirrors the structure of PolicyRule from the Kubernetes API,
 * defining what actions are allowed on which resources for a specific Role or ClusterRole.
 */
export interface K8sPolicyRule {
  /** List of allowed verbs (get, list, create, update, patch, delete, etc.) */
  verbs: string[]
  
  /** API groups the rule applies to (optional) */
  apiGroups?: string[]
  
  /** Resource types the rule applies to (optional) */
  resources?: string[]
  
  /** Specific resource names (optional) */
  resourceNames?: string[]
  
  /** Non-resource URL paths (optional) */
  nonResourceURLs?: string[]
}


