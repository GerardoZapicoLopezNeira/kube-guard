/**
 * KubeGuard Main Application Component
 * 
 * This is the root component of the KubeGuard frontend application.
 * It orchestrates the loading and display of RBAC data, manages application-wide
 * state, and provides navigation between different views.
 * 
 * Key features:
 * - Global RBAC data management using Zustand store
 * - Comprehensive loading and error states
 * - Tab-based navigation between different views
 * - Subject focusing and cross-view navigation
 * - Performance-optimized data loading
 * 
 * Architecture:
 * - Uses custom hooks for data management (useRbacData, usePolicyRules)
 * - Maintains minimal local state for UI interactions
 * - Implements proper error boundaries and loading states
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { RbacSubject } from "./types/rbac"
import BindingTable from "./components/BindingTable"
import RbacGraphRefactored from "./components/RbacGraph/RbacGraphRefactored"
import { SeverityChart } from "./components/SeverityChart"
import { FindingsTable } from "./components/FindingsTable"
import { useRbacData } from "./hooks/useRbacData"
import { usePolicyRules } from "./hooks/usePolicyRules"
import { PolicyRulesView } from "./components/PolicyRulesView"

/**
 * Main application component that serves as the entry point for KubeGuard.
 * 
 * This component:
 * - Loads all RBAC data using global state management
 * - Provides comprehensive error handling and loading states
 * - Manages navigation between different views (Analysis, Bindings, Graph, Rules)
 * - Handles subject focusing for cross-view navigation
 * - Displays real-time statistics about loaded data
 * 
 * @returns JSX element representing the complete application
 */
export default function App() {
  // === Local UI State ===
  // These state variables are kept local as they only affect UI behavior
  
  /** Currently focused subject for cross-view navigation */
  const [focusedSubject, setFocusedSubject] = useState<RbacSubject | null>(null)
  
  /** Active tab in the main navigation */
  const [tab, setTab] = useState("analysis")

  // === Global Data Hooks ===
  // These hooks manage global RBAC data and provide loading/error states
  
  /**
   * Primary data hook that loads bindings and findings.
   * Also provides derived state like unique subjects and loading indicators.
   */
  const { 
    bindings, 
    findings, 
    isInitialLoading, 
    hasErrors, 
    bindingsError,
    findingsError
  } = useRbacData()

  /**
   * Policy rules hook that automatically loads rules for all subjects
   * using optimized batch requests.
   */
  const { 
    allPolicyRules,
    isInitialLoading: isPolicyRulesLoading,
    policyRulesError 
  } = usePolicyRules()

  // === Loading State Handling ===
  
  /** True if any critical data is still loading */
  const isLoadingAll = isInitialLoading || isPolicyRulesLoading
  
  /**
   * Display loading screen while initial data is being fetched.
   * Shows a spinner and informative message to the user.
   */
  if (isLoadingAll) {
    return (
      <main className="min-h-screen bg-background text-foreground px-6 md:px-12 py-10">
        <div className="container mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading RBAC data...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // === Error State Handling ===
  
  /** True if any errors occurred during data loading */
  const allErrors = hasErrors || !!policyRulesError
  
  /**
   * Display error screen if any critical errors occurred.
   * Shows specific error messages and provides a retry option.
   */
  if (allErrors) {
    return (
      <main className="min-h-screen bg-background text-foreground px-6 md:px-12 py-10">
        <div className="container mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-red-500 text-4xl">⚠️</div>
              <h2 className="text-xl font-semibold">Error Loading Data</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                {bindingsError && <p>Bindings: {bindingsError}</p>}
                {findingsError && <p>Findings: {findingsError}</p>}
                {policyRulesError && <p>Policy Rules: {policyRulesError}</p>}
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // === Main Application UI ===
  
  /**
   * Render the main application interface with:
   * - Header with application title and statistics
   * - Tab navigation for different views
   * - Content areas for each view
   * - Cross-view navigation handlers
   */
  return (
    <main className="min-h-screen bg-background text-foreground px-6 md:px-12 py-10">
      <div className="container mx-auto">
        {/* Application Header */}
        <header className="border-b border-border pb-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Kube-Guard RBAC Viewer</h1>
          <p className="text-muted-foreground text-xl mt-1">
            Visualize roles, bindings, graphs and analysis results.
          </p>
          {/* Real-time Statistics Display */}
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span>📋 {bindings.length} bindings</span>
            <span>⚠️ {findings.length} findings</span>
            <span>📜 {allPolicyRules.length} policy rules</span>
          </div>
        </header>

        {/* Main Navigation and Content */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="space-x-2">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="bindings">Bindings</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="rules">Policy Rules</TabsTrigger>
          </TabsList>

          {/* Security Analysis View */}
          <TabsContent value="analysis" className="space-y-6">
            <SeverityChart findings={findings} />
            <FindingsTable
              findings={findings}
              onSubjectSelect={(s: RbacSubject) => { setFocusedSubject(s); setTab("graph"); }}
              onViewPolicyRules={(s: RbacSubject) => { setFocusedSubject(s); setTab("rules") }}
            />
          </TabsContent>

          {/* RBAC Bindings View */}
          <TabsContent value="bindings">
            <BindingTable />
          </TabsContent>

          {/* Graph Visualization View */}
          <TabsContent value="graph">
            <RbacGraphRefactored data={bindings} findings={findings} focusSubject={focusedSubject} />
          </TabsContent>

          {/* Policy Rules View */}
          <TabsContent value="rules">
            <PolicyRulesView data={allPolicyRules} initialSubject={focusedSubject ?? undefined} />
          </TabsContent>
        </Tabs> 
      </div>
    </main>
  )
}
