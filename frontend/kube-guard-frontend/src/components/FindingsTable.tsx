/**
 * RBAC Findings Table Component
 * 
 * This component displays RBAC security findings in a comprehensive table format
 * with advanced filtering, pagination, and interactive capabilities. It allows users
 * to analyze security issues identified in the Kubernetes cluster's RBAC configuration.
 * 
 * Key features:
 * - Advanced filtering by severity, namespace, and subject name
 * - Pagination for handling large datasets
 * - Interactive subject selection for cross-component navigation
 * - Detailed finding information in modal dialogs
 * - Color-coded severity indicators
 * - Responsive design for various screen sizes
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

"use client"

import type { FC } from "react"
import { useState, useMemo, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { RbacFinding, RbacSubject } from "../types/rbac"

/** Number of findings to display per page */
const ROWS_PER_PAGE = 10

/** 
 * Mapping of severity levels to visual badge variants.
 * This provides consistent color coding for different severity levels.
 */
const SEVERITY_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  CRITICAL: "destructive",
  HIGH: "default",
  MEDIUM: "secondary",
  LOW: "outline",
  INFO: "secondary",
}

/**
 * Props interface for the FindingsTable component.
 */
interface Props {
  /** Array of RBAC findings to display */
  findings: RbacFinding[]
  
  /** Optional callback when a subject is selected for graph visualization */
  onSubjectSelect?: (s: RbacSubject) => void
  
  /** Optional callback when viewing policy rules for a subject */
  onViewPolicyRules?: (s: RbacSubject) => void
}

/**
 * Main FindingsTable component that renders security findings in a table format.
 * 
 * This component manages local state for filtering and pagination while displaying
 * RBAC security findings with comprehensive interaction capabilities.
 * 
 * Features:
 * - Multi-dimensional filtering (severity, namespace, subject name)
 * - Paginated results for performance
 * - Interactive subject actions (view on graph, view policy rules)
 * - Detailed finding modal with recommendations and references
 * 
 * @param findings - Array of RBAC findings to display
 * @param onSubjectSelect - Callback for subject selection (graph navigation)
 * @param onViewPolicyRules - Callback for viewing subject policy rules (currently unused)
 * @returns JSX element representing the findings table
 */
export const FindingsTable: FC<Props> = ({ findings, onSubjectSelect, onViewPolicyRules: _onViewPolicyRules }) => {
  // === Local State Management ===
  
  /** Current severity filter selection */
  const [severityFilter, setSeverityFilter] = useState<string>("All")
  
  /** Current search text for subject name filtering */
  const [searchFilter, setSearchFilter] = useState<string>("")
  
  /** Current namespace filter selection */
  const [namespaceFilter, setNamespaceFilter] = useState<string>("All")
  
  /** Current page number for pagination */
  const [page, setPage] = useState(1)
  
  /** Currently selected finding for modal display */
  const [selected, setSelected] = useState<RbacFinding | null>(null)

  // === Filter Options Generation ===
  
  /**
   * Dynamically generate severity filter options from available findings.
   * Memoized to prevent recalculation on every render.
   */
  const severityOptions = useMemo(() => {
    const uniq = Array.from(new Set(findings.map(f => f.Finding.Severity.toUpperCase())))
    return ["All", ...uniq.sort()]
  }, [findings])
  
  /**
   * Dynamically generate namespace filter options from available findings.
   * Uses "-" as placeholder for cluster-wide findings without specific namespace.
   */
  const namespaceOptions = useMemo(() => {
    const uniq = Array.from(new Set(
      findings.map(f => f.Subject.namespace ?? "-")
    ))
    return ["All", ...uniq.sort()]
  }, [findings])

  // === Data Filtering Logic ===
  
  /**
   * Apply all active filters to the findings array.
   * This creates a filtered subset based on current filter selections.
   */
  const filtered = useMemo(() => {
    return findings.filter(f => {
      const sev = f.Finding.Severity.toUpperCase()
      const ns = f.Subject.namespace ?? "-"
      const sub = f.Subject.name.toLowerCase()
      if (severityFilter !== "All" && sev !== severityFilter) return false
      if (namespaceFilter !== "All" && ns !== namespaceFilter) return false
      if (searchFilter && !sub.includes(searchFilter.toLowerCase())) return false
      return true
    })
  }, [findings, severityFilter, namespaceFilter, searchFilter])

  // === Pagination Logic ===
  
  /** Calculate total number of pages based on filtered results */
  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE)
  
  /**
   * Get the current page's data slice from filtered results.
   * Memoized to prevent recalculation when dependencies haven't changed.
   */
  const pageData = useMemo(
    () => filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE),
    [filtered, page]
  )
  
  /**
   * Reset page to 1 whenever filters change to ensure valid page state.
   * This prevents showing empty pages when filters reduce the result set.
   */
  useEffect(() => { setPage(1) }, [severityFilter, namespaceFilter, searchFilter])

  return (
    <Card className="bg-muted text-white p-6 border border-border rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">RBAC Findings</h2>

      {/* === Filter Controls Section === */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-4 mb-4">
        {/* Subject Name Search Input */}
        <Input
          placeholder="🔍 Search by subject name…"
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="w-full md:w-1/3 border border-border rounded-md shadow-sm bg-background/60 backdrop-blur focus:ring-2 focus:ring-accent"
        />

        {/* Severity Level Filter Dropdown */}
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/60 backdrop-blur border border-border shadow-sm rounded-md">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            {severityOptions.map(opt => (
              <SelectItem key={opt} value={opt}>
                {opt === "All" ? "All Severities" : opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Namespace Filter Dropdown */}
        <Select value={namespaceFilter} onValueChange={setNamespaceFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/60 backdrop-blur border border-border shadow-sm rounded-md">
            <SelectValue placeholder="Namespace" />
          </SelectTrigger>
          <SelectContent>
            {namespaceOptions.map(ns => (
              <SelectItem key={ns} value={ns}>
                {ns === "-" ? "Cluster-wide" : ns}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* === Main Data Table === */}
      <div className="overflow-x-auto rounded-lg border border-border shadow-sm mb-4">
        <table className="w-full text-sm text-left table-auto">
          {/* Table Header */}
          <thead className="bg-secondary/80 text-secondary-foreground sticky top-0 border-b border-border">
            <tr className="uppercase text-muted-foreground">
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Namespace</th>
              <th className="px-4 py-3">Rule</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3 text-center">Details</th>
            </tr>
          </thead>
          
          {/* Table Body with Finding Rows */}
          <tbody className="divide-y divide-border">
            {pageData.map((f, i) => {
              const sev = f.Finding.Severity.toUpperCase()
              const ns = f.Subject.namespace ?? "-"
              return (
                <tr key={i} className="hover:bg-accent/20 transition">
                  {/* Subject Information */}
                  <td className="px-4 py-3">{`${f.Subject.kind}/${f.Subject.name}`}</td>
                  
                  {/* Namespace (or cluster-wide indicator) */}
                  <td className="px-4 py-3">{ns}</td>
                  
                  {/* Rule Name */}
                  <td className="px-4 py-3">{f.Finding.RuleName}</td>
                  
                  {/* Severity Badge with Color Coding */}
                  <td className="px-4 py-3">
                    <Badge variant={SEVERITY_VARIANT[sev] ?? "secondary"}>
                      {sev}
                    </Badge>
                  </td>
                  
                  {/* Action Buttons */}
                  <td className="px-4 py-3 flex justify-center gap-2">
                    {/* Details Button - Opens modal with finding information */}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Details"
                      onClick={() => setSelected(f)}
                    >
                      🔍
                    </Button>
                    
                    {/* Graph View Button - Navigate to graph view focused on this subject */}
                    {onSubjectSelect && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="View on Graph"
                        onClick={() => onSubjectSelect(f.Subject)}
                      >
                        🧠
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
            
            {/* Empty State Message */}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-muted-foreground">
                  No findings match the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* === Pagination Controls === */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 text-sm text-muted-foreground mb-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </Button>
          <span>Page {page} of {totalPages}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* === Finding Details Modal === */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="bg-muted text-white max-w-xl">
            <DialogHeader>
              <DialogTitle>Finding Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-auto">
              {/* Finding Message */}
              <p><strong>Message:</strong> {selected.Finding.Message}</p>
              
              {/* Recommendation Section */}
              <div>
                <strong>Recommendation:</strong>
                <p className="mt-1 whitespace-pre-wrap bg-background p-3 rounded">
                  {selected.Finding.Recommendation}
                </p>
              </div>
              
              {/* Future: Policy Rules View Button (currently commented out) */}
              {/* {onViewPolicyRules && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selected) {
                        onViewPolicyRules(selected.Subject)
                      }
                      setSelected(null)
                    }}
                  >
                    🔍 View Policy Rules
                  </Button>
                </div>
              )} */}
              
              {/* External References Links */}
              {Array.isArray(selected.Finding.References) && selected.Finding.References.length > 0 && (
                <div>
                  <strong>References:</strong>
                  <ul className="list-disc ml-6 mt-1">
                    {selected.Finding.References.map((url, idx) => (
                      <li key={idx}>
                        <a href={url} className="underline" target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
