/**
 * RBAC Graph Component - Refactored Version
 * 
 * This is the main RBAC Graph component, refactored for better maintainability
 * and readability. It orchestrates all the sub-components and provides a clean
 * interface for visualizing RBAC relationships.
 * 
 * Key improvements:
 * - Separated concerns into focused sub-components
 * - Extracted complex state logic into custom hooks
 * - Better type safety and documentation
 * - Improved performance through memoization
 * - Cleaner component structure
 * 
 * @author Gerardo Zapico
 * @version 2.0.0
 */

"use client"

import { useEffect, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"

import { NodeDetails } from "../NodeDetails"
import { GraphControls } from "./GraphControls"
import { D3Graph, type D3GraphRef } from "./D3Graph"
import { useRbacGraph } from "./useRbacGraph"
import { exportGraphAsDot } from "./exportUtils"
import type { RbacGraphProps } from "./types"

/**
 * Main RBAC Graph component
 * 
 * This component provides a comprehensive visualization of RBAC relationships
 * in a Kubernetes cluster, with advanced filtering and interaction capabilities.
 * 
 * Features:
 * - Interactive graph visualization using D3.js
 * - Advanced filtering by verbs, resources, namespaces, and subject types
 * - Security findings integration with visual indicators
 * - Export capabilities (SVG, DOT formats)
 * - Node details panel with comprehensive information
 * - Focus functionality for cross-component navigation
 * 
 * @param data - RBAC bindings data
 * @param findings - Security findings data (optional)
 * @param focusSubject - Subject to focus on (optional)
 * @returns JSX element representing the RBAC graph visualization
 */
export default function RbacGraph({ data, findings, focusSubject }: RbacGraphProps) {
  const d3GraphRef = useRef<D3GraphRef>(null)
  
  // Use our custom hook for all state management
  const {
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
    
    // Actions
    setNamespaceFilter,
    setShowOnlyFlagged,
    setSelectedNode,
    toggleVerb,
    toggleResource,
    toggleSubjectType,
    handleFilter,
    handleClear,
  } = useRbacGraph({ data, findings })

  /**
   * Handle focus subject changes from parent component
   */
  useEffect(() => {
    if (!focusSubject) {
      setSelectedNode(null)
    } else {
      const nodeId = `subject:${focusSubject.kind}/${focusSubject.name}`
      const foundNode = displayedNodes.find(node => node.id === nodeId) || null
      setSelectedNode(foundNode)
    }
  }, [focusSubject, displayedNodes, setSelectedNode])

  /**
   * Handle SVG export
   */
  const handleExportSVG = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    d3GraphRef.current?.exportSVG()
  }

  /**
   * Handle DOT export
   */
  const handleExportDot = () => {
    exportGraphAsDot(displayedNodes, displayedLinks)
  }

  return (
    <>
      {/* Main Graph Card */}
      <Card className="bg-muted text-white rounded-xl shadow-md p-6 mt-12 border border-border">
        <CardHeader>
          <CardTitle className="text-2xl">RBAC Graph View</CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* Graph Controls */}
          <GraphControls
            selectedVerbs={selectedVerbs}
            selectedResources={selectedResources}
            namespaceFilter={namespaceFilter}
            showOnlyFlagged={showOnlyFlagged}
            enabledSubjectTypes={enabledSubjectTypes}
            namespaceOptions={namespaceOptions}
            onToggleVerb={toggleVerb}
            onToggleResource={toggleResource}
            onNamespaceChange={setNamespaceFilter}
            onToggleFlagged={setShowOnlyFlagged}
            onToggleSubjectType={toggleSubjectType}
            onFilter={handleFilter}
            onClear={handleClear}
            onExportSVG={handleExportSVG}
            onExportDot={handleExportDot}
          />

          {/* D3 Graph Visualization */}
          <div className="mt-6">
            <D3Graph
              ref={d3GraphRef}
              nodes={displayedNodes}
              links={displayedLinks}
              onNodeClick={setSelectedNode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Node Details Sheet */}
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
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-semibold max-w-[calc(100%-3rem)] whitespace-normal break-words">
                {selectedNode?.label}
              </SheetTitle>
            </div>

            <SheetDescription className="mt-1 text-sm text-muted-foreground">
              Node details and capabilities
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
