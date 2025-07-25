/**
 * API Service Module
 * 
 * This module provides all API communication functions for the KubeGuard frontend.
 * It handles HTTP requests to the backend API with optimized strategies for
 * different types of data loading, including intelligent batching for policy rules.
 * 
 * Key features:
 * - RESTful API communication with the backend
 * - Intelligent URL length detection for GET/POST selection
 * - Batch loading optimization for policy rules
 * - Error handling and fallback mechanisms
 * - Type-safe API responses
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import type { RbacBinding, RbacFinding, RbacPolicyRule, K8sPolicyRule } from "../types/rbac"


/**
 * Fetches RBAC bindings from the API.
 * 
 * Retrieves all ClusterRoleBindings and RoleBindings from the Kubernetes cluster
 * that have been analyzed by the backend service.
 * 
 * @returns Promise resolving to an array of RBAC bindings
 * @throws Error if the API request fails
 */
export async function fetchBindings(): Promise<RbacBinding[]> {
  const response = await fetch("/rbac/bindings")
  if (!response.ok) throw new Error(response.statusText)
  return response.json()
}

/**
 * Fetches RBAC security findings from the API.
 * 
 * Retrieves security analysis results including identified risks,
 * overprivileged subjects, and policy violations.
 * 
 * @returns Promise resolving to an array of RBAC findings
 * @throws Error if the API request fails
 */
export async function fetchFindings(): Promise<RbacFinding[]> {
  const res = await fetch("/rbac/analysis")
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

/**
 * Fetches policy rules for a single subject.
 * 
 * Retrieves all policy rules (permissions) that apply to a specific subject
 * (user, service account, or group) in the Kubernetes cluster.
 * 
 * @param subject - The subject name to fetch policy rules for
 * @returns Promise resolving to an array of policy rules
 * @throws Error if the API request fails
 */
export async function fetchPolicyRules(subject: string): Promise<RbacPolicyRule[]> {
  const res = await fetch(`/rbac/policy-rules?subject=${encodeURIComponent(subject)}`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

/**
 * Fetches policy rules for multiple subjects in a single optimized request.
 * 
 * This function implements an intelligent strategy to choose between GET and POST
 * requests based on the estimated URL length. For short URLs, it uses GET (semantically
 * correct), but falls back to POST for longer URLs to avoid server limits.
 * 
 * Features:
 * - Automatic URL length estimation
 * - GET request with query parameters for short subject lists
 * - POST request with body payload for long subject lists
 * - Automatic fallback from GET to POST if URL limits are exceeded
 * 
 * @param subjects - Array of subject names to fetch policy rules for
 * @returns Promise resolving to a record mapping subject names to their policy rules
 * @throws Error if both GET and POST requests fail
 */
export async function fetchBatchPolicyRules(subjects: string[]): Promise<Record<string, RbacPolicyRule[]>> {
  // 🧠 INTELLIGENT LOGIC: Choose between GET and POST based on URL size
  const maxUrlLength = 2000 // Conservative limit for URLs
  const baseUrl = `/rbac/policy-rules/batch`

  // Build query params to estimate URL length
  const params = new URLSearchParams()
  subjects.forEach(subject => params.append('subjects', subject))
  const estimatedUrl = `${baseUrl}?${params.toString()}`
  
  if (estimatedUrl.length <= maxUrlLength) {
    // ✅ Short URL: use GET (semantically correct)
    console.log(`🔗 Using GET for ${subjects.length} subjects (URL: ${estimatedUrl.length} chars)`)
    try {
      const response = await fetch(estimatedUrl)
      if (!response.ok) throw new Error(response.statusText)
      return response.json()
    } catch (error) {
      // If GET fails due to URL being too long, fallback to POST
      console.warn('🔄 GET failed, falling back to POST:', error)
    }
  } else {
    console.log(`📦 Using POST for ${subjects.length} subjects (URL would be ${estimatedUrl.length} chars)`)
  }
  
  // 🚀 Long URL or GET failed: use POST as fallback
  const response = await fetch("/rbac/policy-rules/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subjects)
  })
  if (!response.ok) throw new Error(response.statusText)
  return response.json()
}

/**
 * Legacy function to fetch all policy rules for subjects from bindings.
 * 
 * @deprecated Use fetchBatchPolicyRules directly for better performance
 * 
 * This function extracts unique subject names from bindings and then
 * fetches policy rules for each subject individually. It's less efficient
 * than batch loading but kept for compatibility.
 * 
 * @param bindings - Array of RBAC bindings to extract subjects from
 * @returns Promise resolving to a flattened array of all policy rules
 */
export async function fetchAllPolicyRules(
  bindings: RbacBinding[]
): Promise<RbacPolicyRule[]> {
  // 1) Extract unique subject names
  const subjectNames = Array.from(
    new Set(
      bindings.flatMap(b => b.subjects.map(s => s.name))
    )
  )

  // 2) For each name, dispatch the request
  const promises = subjectNames.map(name =>
    fetchPolicyRules(name)
      .catch(err => {
        console.error(`Error loading rules for ${name}:`, err)
        return [] as RbacPolicyRule[]
      })
  )

  // 3) Wait for all requests and flatten results
  const arrays = await Promise.all(promises)
  return arrays.flat()
}

/**
 * Fetches policy rules for a specific Role or ClusterRole.
 * 
 * This function retrieves the detailed policy rules defined in a specific
 * Role or ClusterRole, showing what verbs are allowed on which resources.
 * Unlike subject-based policy rules, this returns the raw role definition.
 * 
 * @param roleName - Name of the Role or ClusterRole
 * @param kind - Type of role ('Role' or 'ClusterRole')
 * @param namespace - Namespace for the role (required for Roles, ignored for ClusterRoles)
 * @returns Promise resolving to an array of Kubernetes policy rules
 * @throws Error if the API request fails or role is not found
 */
export async function fetchRoleRules(
  roleName: string, 
  kind: 'Role' | 'ClusterRole', 
  namespace?: string
): Promise<K8sPolicyRule[]> {
  const params = new URLSearchParams({
    role_name: roleName,
    kind: kind
  })
  
  if (namespace && kind === 'Role') {
    params.append('namespace', namespace)
  }
  
  const response = await fetch(`/rbac/roles?${params.toString()}`)
  if (!response.ok) throw new Error(response.statusText)
  return response.json()
}
