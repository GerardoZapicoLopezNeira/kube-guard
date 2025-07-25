/**
 * Graph Controls Component
 * 
 * This component renders all the filter controls and action buttons
 * for the RBAC Graph visualization, including verb/resource filters,
 * namespace selection, and export options.
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { VerbFilter } from "../VerbFilter"
import { ResourceFilter } from "../ResourceFilter"
import { VERBS, RESOURCES, LEGEND_ITEMS } from "./constants"

/**
 * Props for the GraphControls component
 */
interface GraphControlsProps {
  // Filter state
  selectedVerbs: string[]
  selectedResources: string[]
  namespaceFilter: string
  showOnlyFlagged: boolean
  enabledSubjectTypes: Set<string>
  
  // Available options
  namespaceOptions: string[]
  
  // Actions
  onToggleVerb: (verb: string) => void
  onToggleResource: (resource: string) => void
  onNamespaceChange: (namespace: string) => void
  onToggleFlagged: (checked: boolean) => void
  onToggleSubjectType: (type: string) => void
  onFilter: () => void
  onClear: () => void
  onExportSVG: (event: React.MouseEvent<HTMLButtonElement>) => void
  onExportDot: () => void
}

/**
 * Graph controls component that renders all filter and action controls
 * 
 * @param props - Component props
 * @returns JSX element with all graph controls
 */
export function GraphControls({
  selectedVerbs,
  selectedResources,
  namespaceFilter,
  showOnlyFlagged,
  enabledSubjectTypes,
  namespaceOptions,
  onToggleVerb,
  onToggleResource,
  onNamespaceChange,
  onToggleFlagged,
  onToggleSubjectType,
  onFilter,
  onClear,
  onExportSVG,
  onExportDot,
}: GraphControlsProps) {
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
        {LEGEND_ITEMS.map(item => {
          const isActive = enabledSubjectTypes.has(item.type)
          return (
            <button
              key={item.label}
              onClick={() => onToggleSubjectType(item.type)}
              className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition ${
                isActive ? "opacity-100" : "opacity-40"
              }`}
              title={`Toggle ${item.label}`}
            >
              <span
                className="inline-block w-4 h-4 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2 mb-4">
        <VerbFilter
          options={VERBS}
          selected={selectedVerbs}
          onToggle={onToggleVerb}
        />
        
        <ResourceFilter
          options={RESOURCES}
          selected={selectedResources}
          onToggle={onToggleResource}
        />

        <Select value={namespaceFilter} onValueChange={onNamespaceChange}>
          <SelectTrigger className="w-[200px] flex-none px-3 py-1 rounded border border-border bg-background text-sm hover:bg-muted transition">
            <SelectValue placeholder="Namespace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All namespaces</SelectItem>
            {namespaceOptions.map(ns => (
              <SelectItem key={ns} value={ns}>
                {ns === "cluster" ? "Cluster-wide" : ns}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <label className="inline-flex items-center space-x-1 text-sm">
          <input
            type="checkbox"
            checked={showOnlyFlagged}
            onChange={e => onToggleFlagged(e.target.checked)}
          />
          <span>Show only flagged</span>
        </label>
        
        <div className="ml-auto flex gap-2">
          <Button onClick={onFilter}>Search</Button>
          <Button variant="outline" onClick={onClear}>
            Clear
          </Button>
          <Button onClick={onExportSVG}>Export SVG</Button>
          <Button variant="outline" onClick={onExportDot}>
            Export DOT
          </Button>
        </div>
      </div>
    </div>
  )
}
