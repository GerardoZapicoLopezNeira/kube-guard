/**
 * Policy Rules Management Hooks
 * 
 * This module provides specialized hooks for managing RBAC policy rules with
 * intelligent loading strategies and optimized performance. It includes both
 * batch loading for multiple subjects and individual subject loading.
 * 
 * Key features:
 * - Automatic batch loading of policy rules for all unique subjects
 * - Individual subject policy rule loading with caching
 * - Optimized re-render prevention through memoization
 * - Comprehensive loading state management
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import { useEffect, useMemo } from 'react'
import { useRbacStore } from '../stores/rbacStore'

/**
 * Primary hook for managing policy rules intelligently.
 * 
 * This hook automatically loads policy rules for all unique subjects found
 * in the current bindings using batch requests for optimal performance.
 * It provides a complete interface for accessing policy rules data.
 * 
 * Features:
 * - Automatic extraction of unique subjects from bindings
 * - Batch loading of missing policy rules
 * - Memoized calculations to prevent unnecessary re-renders
 * - Comprehensive state tracking
 * 
 * @returns Object containing policy rules data, loading states, and utility functions
 */
export const usePolicyRules = () => {
  const bindings = useRbacStore((state) => state.bindings)
  const policyRules = useRbacStore((state) => state.policyRules)
  const isLoadingPolicyRules = useRbacStore((state) => state.isLoadingPolicyRules)
  const policyRulesError = useRbacStore((state) => state.policyRulesError)
  const loadBatchPolicyRules = useRbacStore((state) => state.loadBatchPolicyRules)

  /**
   * Extract unique subjects from bindings with memoization.
   * This calculation only updates when bindings change, improving performance.
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
   * Get all loaded policy rules with memoization.
   * Combines policy rules from all subjects into a single array.
   * Only includes rules for subjects that are already loaded.
   */
  const allPolicyRules = useMemo(() => {
    const result = []
    for (const subject of uniqueSubjects) {
      const rules = policyRules.get(subject)
      if (rules) {
        result.push(...rules)
      }
    }
    return result
  }, [uniqueSubjects, policyRules])
  
  /**
   * Check if any subject is currently loading.
   * Memoized for performance optimization.
   */
  const isLoadingAny = useMemo(() => {
    return uniqueSubjects.some(subject => isLoadingPolicyRules.has(subject))
  }, [uniqueSubjects, isLoadingPolicyRules])

  /**
   * 🚀 OPTIMIZATION: Load policy rules in batch instead of individually
   * 
   * This effect automatically triggers when new subjects are discovered
   * and loads their policy rules using a single batch request.
   * This dramatically reduces the number of API calls and improves performance.
   */
  useEffect(() => {
    if (uniqueSubjects.length === 0) return

    // Identify subjects that need to be loaded
    const missingSubjects = uniqueSubjects.filter(subject => 
      !policyRules.has(subject) && !isLoadingPolicyRules.has(subject)
    )

    if (missingSubjects.length > 0) {
      console.log(`🚀 Loading ${missingSubjects.length} policy rules in batch:`, missingSubjects)
      loadBatchPolicyRules(missingSubjects)
    }
  }, [uniqueSubjects, policyRules, isLoadingPolicyRules, loadBatchPolicyRules])

  /**
   * Derived state to know if we have all necessary policy rules.
   * This is useful for determining when the component is ready to display data.
   */
  const hasAllPolicyRules = useMemo(() => {
    return uniqueSubjects.every(subject => policyRules.has(subject))
  }, [uniqueSubjects, policyRules])
  
  /**
   * Indicates if we're in the initial loading phase.
   * True when we have subjects but don't have all their policy rules yet.
   */
  const isInitialLoading = uniqueSubjects.length > 0 && !hasAllPolicyRules && isLoadingAny

  return {
    // === Core Data ===
    /** Combined array of all policy rules from all subjects */
    allPolicyRules,
    
    /** Array of unique subject names from current bindings */
    uniqueSubjects,
    
    // === Loading States ===
    /** True if we're loading policy rules for the first time */
    isInitialLoading,
    
    /** True if any policy rules are currently being loaded */
    isLoadingAny,
    
    /** True if we have policy rules for all unique subjects */
    hasAllPolicyRules,
    
    // === Error State ===
    /** Error message for policy rules loading, null if no error */
    policyRulesError,
    
    // === Actions ===
    /** Function to manually trigger batch loading of policy rules */
    loadBatchPolicyRules,
    
    /**
     * Get policy rules for a specific subject.
     * @param subject - The subject name to get policy rules for
     * @returns Array of policy rules for the subject, empty if not loaded
     */
    getPolicyRulesForSubject: (subject: string) => policyRules.get(subject) || [],
    
    /**
     * Check if a specific subject is currently loading.
     * @param subject - The subject name to check
     * @returns True if the subject is currently being loaded
     */
    isSubjectLoading: (subject: string) => isLoadingPolicyRules.has(subject),
  }
}

/**
 * Simplified hook for getting policy rules for a specific subject.
 * 
 * This hook is useful when you only need policy rules for one specific subject
 * rather than all subjects. It handles the loading automatically and provides
 * a simple interface for accessing the data.
 * 
 * @param subject - The subject name to load policy rules for, or null to skip loading
 * @returns Object containing rules, loading state, and availability flag
 */
export const usePolicyRulesForSubject = (subject: string | null) => {
  const policyRules = useRbacStore((state) => state.policyRules)
  const isLoadingPolicyRules = useRbacStore((state) => state.isLoadingPolicyRules)
  const loadPolicyRulesForSubject = useRbacStore((state) => state.loadPolicyRulesForSubject)

  /**
   * Effect to automatically load policy rules for the subject.
   * Only triggers if the subject exists, rules aren't cached, and not already loading.
   */
  useEffect(() => {
    if (subject && !policyRules.has(subject) && !isLoadingPolicyRules.has(subject)) {
      loadPolicyRulesForSubject(subject)
    }
  }, [subject, policyRules, isLoadingPolicyRules, loadPolicyRulesForSubject])

  // Handle null subject case
  if (!subject) {
    return {
      rules: [],
      isLoading: false,
      hasRules: false,
    }
  }

  return {
    /** Array of policy rules for the subject */
    rules: policyRules.get(subject) || [],
    
    /** True if policy rules for this subject are currently loading */
    isLoading: isLoadingPolicyRules.has(subject),
    
    /** True if policy rules for this subject have been loaded */
    hasRules: policyRules.has(subject),
  }
}
