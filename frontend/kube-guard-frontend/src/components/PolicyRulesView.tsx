/**
 * Policy Rules View Component
 * 
 * This component provides a comprehensive view of RBAC policy rules with advanced
 * filtering and grouping capabilities. It displays what actions subjects are allowed
 * to perform on different resources in the Kubernetes cluster.
 * 
 * Key features:
 * - Subject-based filtering to view rules for specific users/groups/service accounts
 * - Resource-based filtering to see permissions for specific resource types
 * - Grouped display by subject for easy analysis
 * - Collapsible sections for better organization
 * - Support for both regular resources and non-resource URLs
 * - Badge-based verb display for quick permission overview
 * - Responsive design for various screen sizes
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import type { RbacPolicyRule, RbacSubject } from "../types/rbac"

/**
 * Props interface for the PolicyRulesView component.
 */
interface Props {
  /** Array of RBAC policy rules to display */
  data: RbacPolicyRule[]
  
  /** Optional initial subject to filter by (for cross-component navigation) */
  initialSubject?: RbacSubject
}

/**
 * Main PolicyRulesView component that renders policy rules with filtering capabilities.
 * 
 * This component processes and displays RBAC policy rules in a structured format,
 * allowing users to understand what permissions each subject has in the cluster.
 * 
 * @param data - Array of policy rules to display
 * @param initialSubject - Optional subject to pre-filter the view
 * @returns JSX element representing the policy rules view
 */
export function PolicyRulesView({ data, initialSubject }: Props) {
  // === Local State Management ===
  
  /**
   * Current subject filter value.
   * Initialized from initialSubject prop if provided for cross-component navigation.
   */
  const [subjectFilter, setSubjectFilter] = useState(
    typeof initialSubject === "string"
      ? initialSubject
      : initialSubject
      ? `${initialSubject.kind}/${initialSubject.name}`
      : ""
  )
  
  /** Current resource filter selection */
  const [resourceFilter, setResourceFilter] = useState("all")

  // === Filter Options Generation ===

  /**
   * Generate list of available resource options from the policy rules data.
   * Includes both regular Kubernetes resources and non-resource URLs.
   */
  const resources = useMemo(() => {
    const setR = new Set<string>()
    data.forEach(r =>
      r.allowedTo.forEach(a => {
        if (a.resource) setR.add(a.resource)
        else if (a.nonResourceURI) setR.add(a.nonResourceURI)
      })
    )
    return ["all", ...Array.from(setR).sort()]
  }, [data])

  // === Data Filtering Logic ===
  const filtered = useMemo(() => {
    return data.filter(r => {
      const subj = `${r.kind}/${r.name}`
      if (subjectFilter && !subj.includes(subjectFilter)) return false
      if (
        resourceFilter !== "all" &&
        !r.allowedTo.some(a =>
          (a.resource === resourceFilter) ||
          (a.nonResourceURI === resourceFilter)
        )
      ) return false
      return true
    })
  }, [data, subjectFilter, resourceFilter])

  // 4) Agrupación: subject → key → verbs
  const tree = useMemo(() => {
    const m: Record<string, Record<string, Set<string>>> = {}
    filtered.forEach(r => {
      const subj = `${r.kind}/${r.name}`
      m[subj] ||= {}
      r.allowedTo.forEach(a => {
        const key = a.resource ?? a.nonResourceURI ?? "<unknown>"
        m[subj][key] ||= new Set()
        m[subj][key].add(a.verb)
      })
    })
    return m
  }, [filtered])

  return (
    <Card className="bg-muted text-white p-6 space-y-6">
      <h2 className="text-xl font-semibold">Policy Rules Explorer</h2>

      {/* ─── Filters ─── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Filter subjects…"
          value={subjectFilter}
          onChange={e => setSubjectFilter(e.target.value)}
          className="w-full sm:w-1/3 border border-border rounded-md shadow-sm"
        />

        <Select
          value={resourceFilter}
          onValueChange={setResourceFilter}
        >
          <SelectTrigger className="w-full sm:w-[180px] bg-background/60 border border-border rounded-md shadow-sm">
            <SelectValue placeholder="Resource" />
          </SelectTrigger>
          <SelectContent>
            {resources.map(r => (
              <SelectItem key={r} value={r}>
                {r === "all" ? "All Resources" : r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ─── Tree (Collapsibles) ─── */}
      <div className="space-y-4 max-h-[60vh] overflow-auto">
        {Object.entries(tree).map(([subj, resMap]) => (
          <Collapsible key={subj} defaultOpen>
            <CollapsibleTrigger className="w-full flex justify-between px-4 py-2 bg-background rounded-md hover:bg-accent/20">
              <span className="font-medium">{subj}</span>
              <span className="text-sm text-muted-foreground">
                {Object.keys(resMap).length} resources
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 mt-2 space-y-2">
              {Object.entries(resMap).map(([key, verbs]) => (
                <Collapsible key={key} defaultOpen>
                  <CollapsibleTrigger className="w-full flex justify-between px-4 py-1 bg-background/50 rounded-md hover:bg-accent/10">
                    <span>{key}</span>
                    <span className="text-sm text-muted-foreground">
                      {verbs.size} verbs
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 mt-1 flex flex-wrap gap-2">
                    {Array.from(verbs).map(v => (
                      <Badge key={v} variant="outline">
                        {v}
                      </Badge>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}

        {/* Fallback */}
        {Object.keys(tree).length === 0 && (
          <p className="text-center text-muted-foreground">
            No rules match the filters.
          </p>
        )}
      </div>
    </Card>
  )
}
