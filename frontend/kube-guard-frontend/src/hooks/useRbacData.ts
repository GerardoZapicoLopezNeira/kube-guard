/**
 * RBAC Data Management Hook
 * 
 * This custom hook manages the initial loading and state of all RBAC data
 * including bindings and findings. It provides a convenient interface for
 * components to access RBAC data with proper loading states and error handling.
 * 
 * Key features:
 * - Automatic initial data loading
 * - Optimized re-render prevention using specific selectors
 * - Derived state calculations (unique subjects, loading states)
 * - Comprehensive error handling
 * 
 * Usage:
 * This hook should be used in the root component (App.tsx) to ensure
 * RBAC data is loaded when the application starts.
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import { useEffect, useMemo } from 'react'
import { useRbacStore } from '../stores/rbacStore'

/**
 * Custom hook that manages the initial loading of all RBAC data.
 * 
 * This hook handles:
 * - Loading bindings and findings from the API
 * - Computing derived state like unique subjects
 * - Managing loading and error states
 * - Preventing unnecessary re-renders through selective subscriptions
 * 
 * @returns Object containing RBAC data, loading states, errors, and actions
 */
export const useRbacData = () => {
  // Use specific selectors to avoid unnecessary re-renders
  const bindings = useRbacStore((state) => state.bindings)
  const findings = useRbacStore((state) => state.findings)
  const isLoadingBindings = useRbacStore((state) => state.isLoadingBindings)
  const isLoadingFindings = useRbacStore((state) => state.isLoadingFindings)
  const bindingsError = useRbacStore((state) => state.bindingsError)
  const findingsError = useRbacStore((state) => state.findingsError)
  const loadBindings = useRbacStore((state) => state.loadBindings)
  const loadFindings = useRbacStore((state) => state.loadFindings)

  /**
   * Calculate unique subjects from bindings with memoization.
   * This prevents recalculation on every render and only updates
   * when the bindings array actually changes.
   */
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>()
    bindings.forEach(binding => {
      binding.subjects.forEach(subject => {
        subjects.add(subject.name)
      })
    })
    return Array.from(subjects)
  }, [bindings])

  /**
   * Effect to handle initial data loading.
   * 
   * This effect triggers the loading of bindings and findings when:
   * - The component mounts and no data exists
   * - No loading is already in progress
   * - No previous errors occurred
   * 
   * The effect dependencies ensure it runs when needed but doesn't
   * create infinite loops.
   */
  useEffect(() => {
    // Only load if we don't have data and aren't already loading
    if (bindings.length === 0 && !isLoadingBindings && !bindingsError) {
      loadBindings()
    }
    
    if (findings.length === 0 && !isLoadingFindings && !findingsError) {
      loadFindings()
    }
  }, [
    bindings.length,
    findings.length,
    isLoadingBindings,
    isLoadingFindings,
    bindingsError,
    findingsError,
    loadBindings,
    loadFindings
  ])

  // === Derived State Calculations ===
  
  /** True if we're loading data for the first time (no data exists yet) */
  const isInitialLoading = (bindings.length === 0 && isLoadingBindings) || 
                          (findings.length === 0 && isLoadingFindings)
  
  /** True if any errors occurred during data loading */
  const hasErrors = !!bindingsError || !!findingsError
  
  /** True if all initial data has been loaded successfully */
  const isReady = bindings.length > 0 && findings.length > 0 && !isInitialLoading

  return {
    // === Core Data ===
    /** Array of RBAC bindings loaded from the API */
    bindings,
    
    /** Array of RBAC findings/security issues */
    findings,
    
    /** Array of unique subject names extracted from bindings */
    uniqueSubjects,
    
    // === Loading States ===
    /** True if this is the first time loading data (no data exists yet) */
    isInitialLoading,
    
    /** True if bindings are currently being loaded */
    isLoadingBindings,
    
    /** True if findings are currently being loaded */
    isLoadingFindings,
    
    /** True if any errors occurred during loading */
    hasErrors,
    
    /** True if all initial data has been loaded successfully */
    isReady,
    
    // === Error States ===
    /** Error message for bindings loading, null if no error */
    bindingsError,
    
    /** Error message for findings loading, null if no error */
    findingsError,
    
    // === Actions ===
    /** Function to manually trigger bindings loading */
    loadBindings,
    
    /** Function to manually trigger findings loading */
    loadFindings,
  }
}
