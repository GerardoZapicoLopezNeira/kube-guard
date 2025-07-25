/**
 * RBAC Binding Table Component
 * 
 * This component provides a comprehensive view of all RBAC bindings in the
 * Kubernetes cluster, including both RoleBindings and ClusterRoleBindings.
 * It features advanced filtering, pagination, and detailed binding inspection
 * capabilities using the global Zustand store for optimal performance.
 * 
 * Key features:
 * - Global state integration with Zustand store
 * - Real-time search and filtering capabilities  
 * - Multi-dimensional filtering (name, kind, namespace)
 * - Pagination for large datasets
 * - Detailed binding modal for YAML inspection
 * - Namespace-aware filtering with cluster-wide support
 * - Responsive design with smooth animations
 * - Performance optimized with memoization
 * 
 * Architecture:
 * - Uses global RBAC store for data access
 * - Maintains minimal local state for UI interactions
 * - Implements efficient filtering and pagination logic
 * - Provides modal for detailed binding inspection
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import { useState, useMemo, useEffect } from "react"
import { useRbacStore } from "../stores/rbacStore"
import type { RbacBinding } from "../types/rbac"
import BindingModal from "./BindingModal"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Eye, ChevronLeft, ChevronRight } from "lucide-react"

/** Number of bindings to display per page */
const ITEMS_PER_PAGE = 10

/**
 * Main binding table component that displays RBAC bindings with filtering and pagination.
 * 
 * This component:
 * - Fetches binding data from the global Zustand store
 * - Provides search functionality by binding name
 * - Filters by binding kind (RoleBinding/ClusterRoleBinding)
 * - Filters by namespace (including cluster-wide)
 * - Implements pagination for performance with large datasets
 * - Opens detailed modal for binding inspection
 * 
 * @returns JSX element representing the binding table with controls
 */
function BindingTable() {
  // === Global State Integration ===
  // Get bindings from the global Zustand store
  const bindings = useRbacStore((state) => state.bindings)
  
  // === Local UI State ===
  /** Currently selected binding for modal display */
  const [selected, setSelected] = useState<RbacBinding | null>(null)
  
  /** Search query for filtering bindings by name */
  const [search, setSearch] = useState("")
  
  /** Filter for binding kind (all, RoleBinding, ClusterRoleBinding) */
  const [kindFilter, setKindFilter] = useState("all")
  
  /** Current page number for pagination */
  const [currentPage, setCurrentPage] = useState(1)
  
  /** Filter for namespace (All, specific namespace, or cluster-wide) */
  const [namespaceFilter, setNamespaceFilter] = useState("All")

  /**
   * Calculate available namespaces from the bindings data.
   * 
   * This memoized calculation extracts unique namespaces from the bindings,
   * treating ClusterRoleBindings as "cluster" and RoleBindings by their namespace.
   */
  const namespaces = useMemo(() => {
    if (bindings.length === 0) return ["All"]
    
    const allNs = bindings.map(b =>
      b.kind === "RoleBinding"
        ? b.roleRef.namespace!
        : "cluster"
    )
    return ["All", ...Array.from(new Set(allNs))]
  }, [bindings])

  /**
   * Filter bindings based on current filter criteria.
   * 
   * Applies three filters:
   * 1. Name search (case-insensitive partial match)
   * 2. Kind filter (RoleBinding, ClusterRoleBinding, or all)
   * 3. Namespace filter (specific namespace, cluster-wide, or all)
   */
  const filteredBindings = bindings.filter(b => {
    const nameMatch = b.name.toLowerCase().includes(search.toLowerCase())
    const kindMatch = kindFilter === "all" || b.kind === kindFilter

    // Determine the binding's namespace
    const bns = b.kind === "RoleBinding"
      ? b.roleRef.namespace!
      : "cluster"

    const nsMatch = namespaceFilter === "All" || bns === namespaceFilter

    return nameMatch && kindMatch && nsMatch
  
  })

  /** Calculate total pages for pagination */
  const totalPages = Math.ceil(filteredBindings.length / ITEMS_PER_PAGE)
  
  /** Get bindings for current page */
  const pageData = filteredBindings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  /**
   * Reset to first page when filters change.
   * This ensures users don't end up on an empty page after filtering.
   */
  useEffect(() => {
    setCurrentPage(1)
  }, [search, kindFilter, namespaceFilter])

  return (
    <Card className="bg-muted text-white p-6 mb-6 border border-border rounded-xl shadow-md transition hover:shadow-lg">
      <h2 className="text-xl font-semibold mb-4">RBAC Bindings</h2>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-4 mb-6">
        {/* Search Input */}
        <Input
          className={`w-full md:w-1/3 border border-border rounded-md shadow-sm bg-background/60 backdrop-blur placeholder:text-muted-foreground
            focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-300`}
          placeholder="🔍 Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Kind Filter */}
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-[200px] bg-background/60 backdrop-blur border border-border shadow-sm">
            <SelectValue placeholder="Kind" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="RoleBinding">RoleBinding</SelectItem>
            <SelectItem value="ClusterRoleBinding">ClusterRoleBinding</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Namespace Filter */}
        <Select value={namespaceFilter} onValueChange={setNamespaceFilter}>
          <SelectTrigger className="w-[200px] bg-background/60 backdrop-blur border border-border shadow-sm">
            <SelectValue placeholder="Namespace" />
          </SelectTrigger>
          <SelectContent>
            {namespaces.map(ns => (
              <SelectItem key={ns} value={ns}>
                {ns === "cluster" ? "cluster-wide" : ns}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
        <table className="w-full text-sm text-left table-auto">
          <thead className="bg-secondary/80 backdrop-blur-sm text-secondary-foreground sticky top-0 z-10 border-b border-border">
            <tr className="text-sm uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Kind</th>
              <th className="px-4 py-3 font-semibold">Subjects</th>
              <th className="px-4 py-3 font-semibold">RoleRef</th>
              <th className="px-4 py-3 font-semibold text-center">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {pageData.length === 0 ? (
              <tr className="hover:bg-accent/30 even:bg-muted/20 transition-all">
                <td colSpan={5} className="text-center text-muted-foreground px-4 py-3 whitespace-nowrap max-w-[250px] trunca ">
                  No bindings found.
                </td>
              </tr>
            ) : (
              pageData.map(binding => (
                <tr
                  key={binding.id}
                  className="transition-all duration-300 ease-in-out hover:bg-accent/20 even:bg-muted/30 animate-fade-in"
                >
                  <td className="px-4 py-3">{binding.name}</td>
                  <td className="px-4 py-3">{binding.kind}</td>
                  <td className="px-4 py-3">
                    {binding.subjects.map(s =>
                      `${s.kind}/${s.name}${s.namespace ? ` (${s.namespace})` : ""}`
                    ).join(", ")}
                  </td>
                  <td className="px-4 py-3">{binding.roleRef.kind}/{binding.roleRef.name}</td>
                  <td className="px-4 py-3 text-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:bg-accent hover:text-accent-foreground rounded-full transition-transform transform hover:scale-110 duration-200"
                    onClick={() => setSelected(binding)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-6 gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-md px-2 py-1 hover:bg-accent/30"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {[...Array(totalPages)].map((_, i) => {
            const page = i + 1
            const isCurrent = currentPage === page
            return (
              <Button
                key={page}
                variant={isCurrent ? "default" : "ghost"}
                size="sm"
                className={`rounded-md px-3 py-1 ${isCurrent ? "bg-accent text-accent-foreground" : "hover:bg-accent/30"}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            )
          })}

          <Button
            variant="ghost"
            size="icon"
            className="rounded-md px-2 py-1 hover:bg-accent/30"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}


      {selected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <BindingModal binding={selected} onClose={() => setSelected(null)} />
        </motion.div>
      )}
    </Card>
  )
}

export default BindingTable
