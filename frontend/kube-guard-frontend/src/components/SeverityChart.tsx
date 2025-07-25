/**
 * Severity Chart Component
 * 
 * This component provides a visual representation of RBAC findings distribution
 * by severity level using a pie chart. It helps users quickly understand the
 * overall security posture of their Kubernetes cluster's RBAC configuration.
 * 
 * Key features:
 * - Interactive pie chart with hover tooltips
 * - Color-coded severity levels for easy identification
 * - Responsive design that adapts to container size
 * - Total findings count display
 * - Legend for severity level identification
 * - Data sorted by severity count for optimal visualization
 * 
 * The chart uses distinct colors for each severity level:
 * - CRITICAL: Dark red (high attention)
 * - HIGH: Red (significant attention)
 * - MEDIUM: Yellow (moderate attention)
 * - LOW: Green (minimal attention)
 * - INFO: Gray (informational)
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

"use client"

import type { FC } from "react"
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from "recharts"
import { Card } from "@/components/ui/card"
import type { RbacFinding } from "../types/rbac"

/**
 * Props interface for the SeverityChart component.
 */
interface Props {
  /** Array of RBAC findings to analyze and visualize */
  findings: RbacFinding[]
}

/**
 * Color mapping for different severity levels.
 * Each severity level is assigned a distinct color for consistent visual representation.
 */
const COLOR_MAP: Record<string, string> = {
  CRITICAL: "#c53030",  // Dark red - highest priority
  HIGH:     "#e53e3e",  // Red - high priority
  MEDIUM:   "#d69e2e",  // Yellow - medium priority
  LOW:      "#38a169",  // Green - low priority
  INFO:     "#718096",  // Gray - informational
}

/**
 * SeverityChart component that renders a pie chart of findings by severity.
 * 
 * This component processes the findings data to count occurrences of each
 * severity level and presents them in an interactive pie chart format.
 * 
 * @param findings - Array of RBAC findings to visualize
 * @returns JSX element representing the severity distribution chart
 */
export const SeverityChart: FC<Props> = ({ findings }) => {
  // === Data Processing ===
  
  /**
   * Count findings by severity level.
   * Creates a map where keys are severity levels and values are counts.
   */
  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    const s = f.Finding.Severity.toUpperCase()
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  /**
   * Transform counts into chart data format.
   * Sorts by value (count) in descending order for better visual impact.
   */
  const data = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  /** Total number of findings for display */
  const total = findings.length

  return (
    <Card className="bg-muted text-white p-6 border border-border rounded-xl shadow-md">
      {/* Chart Header */}
      <h2 className="text-xl font-semibold mb-2">Severity Distribution</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Total findings: <strong>{total}</strong>
      </p>
      
      {/* Chart Container */}
      <div className="w-full h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="50%"
              outerRadius="80%"
              labelLine={false}
              label={({ name, percent = 0 }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
            >
              {/* Color each pie slice according to severity */}
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={COLOR_MAP[entry.name] ?? "#4a5568"}
                />
              ))}
            </Pie>
            
            {/* Interactive tooltip on hover */}
            <Tooltip />
            
            {/* Legend showing severity levels */}
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
