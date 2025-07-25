/**
 * RBAC Store - Zustand Global State Management
 * 
 * This module implements a centralized state management system for RBAC data using Zustand.
 * It manages bindings, findings, and policy rules with optimized caching and batch loading
 * capabilities to improve application performance and reduce API calls.
 * 
 * Key features:
 * - Global state for RBAC bindings, findings, and policy rules
 * - Intelligent caching system to avoid duplicate API requests
 * - Batch loading optimization for policy rules
 * - Comprehensive error handling and loading states
 * - DevTools integration for debugging
 * 
 * @author Gerardo Zapico
 * @version 1.0.0
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { RbacBinding, RbacFinding, RbacPolicyRule } from '../types/rbac'
import { fetchBindings, fetchFindings, fetchPolicyRules, fetchBatchPolicyRules } from '../services/api'

/**
 * Interface defining the complete RBAC store state and actions.
 * 
 * The store is organized into three main sections:
 * 1. Data state: Contains the actual RBAC data
 * 2. Loading states: Tracks ongoing API requests
 * 3. Error states: Manages error information
 * 4. Actions: Methods to manipulate state and trigger API calls
 */
interface RbacState {
  // === Data State ===
  /** Array of RBAC bindings loaded from the API */
  bindings: RbacBinding[]
  
  /** Array of RBAC security findings */
  findings: RbacFinding[]
  
  /** 
   * Map of policy rules cached by subject name.
   * Key: subject name, Value: array of policy rules for that subject
   */
  policyRules: Map<string, RbacPolicyRule[]>
  
  // === Loading States ===
  /** Indicates if bindings are currently being loaded */
  isLoadingBindings: boolean
  
  /** Indicates if findings are currently being loaded */
  isLoadingFindings: boolean
  
  /** 
   * Set of subject names that are currently being loaded.
   * Used to prevent duplicate requests for the same subject
   */
  isLoadingPolicyRules: Set<string>
  
  // === Error States ===
  /** Error message for bindings loading, null if no error */
  bindingsError: string | null
  
  /** Error message for findings loading, null if no error */
  findingsError: string | null
  
  /** Error message for policy rules loading, null if no error */
  policyRulesError: string | null
  
  // === Basic Actions ===
  /** 
   * Directly sets the bindings array in the store.
   * @param bindings - Array of RBAC bindings to set
   */
  setBindings: (bindings: RbacBinding[]) => void
  
  /** 
   * Directly sets the findings array in the store.
   * @param findings - Array of RBAC findings to set
   */
  setFindings: (findings: RbacFinding[]) => void
  
  /** 
   * Adds policy rules for a specific subject to the cache.
   * @param subject - The subject name to cache rules for
   * @param rules - Array of policy rules for the subject
   */
  addPolicyRules: (subject: string, rules: RbacPolicyRule[]) => void
  
  // === Async Actions ===
  /** 
   * Loads RBAC bindings from the API with error handling.
   * Prevents duplicate requests if already loading.
   */
  loadBindings: () => Promise<void>
  
  /** 
   * Loads RBAC findings from the API with error handling.
   * Prevents duplicate requests if already loading.
   */
  loadFindings: () => Promise<void>
  
  /** 
   * Loads policy rules for a single subject from the API.
   * Implements caching to avoid duplicate requests for the same subject.
   * @param subject - The subject name to load policy rules for
   */
  loadPolicyRulesForSubject: (subject: string) => Promise<void>
  
  /** 
   * Loads policy rules for multiple subjects in a single batch request.
   * This is more efficient than multiple individual requests.
   * @param subjects - Array of subject names to load policy rules for
   */
  loadBatchPolicyRules: (subjects: string[]) => Promise<void>
  
  // === Utility Actions ===
  /** Clears all error states */
  clearErrors: () => void
  
  /** Resets the entire store to its initial state */
  reset: () => void
}

/**
 * Initial state configuration for the RBAC store.
 * All arrays and maps are empty, loading flags are false, and errors are null.
 */
const initialState = {
  bindings: [],
  findings: [],
  policyRules: new Map<string, RbacPolicyRule[]>(),
  isLoadingBindings: false,
  isLoadingFindings: false,
  isLoadingPolicyRules: new Set<string>(),
  bindingsError: null,
  findingsError: null,
  policyRulesError: null,
}

/**
 * Creates the main RBAC store using Zustand with DevTools integration.
 * 
 * The store implements optimized state management with:
 * - Duplicate request prevention
 * - Comprehensive error handling
 * - Efficient batch loading
 * - DevTools integration for debugging
 */
export const useRbacStore = create<RbacState>()(
  devtools(
    (set, get) => ({
      // Initialize with default state
      ...initialState,
      
      // === Basic State Setters ===
      setBindings: (bindings) =>
        set({ bindings }, false, 'setBindings'),
      
      setFindings: (findings) =>
        set({ findings }, false, 'setFindings'),
      
      addPolicyRules: (subject, rules) =>
        set((state) => {
          const newPolicyRules = new Map(state.policyRules)
          newPolicyRules.set(subject, rules)
          return { policyRules: newPolicyRules }
        }, false, `addPolicyRules:${subject}`),
      
      // === Async Data Loading Actions ===
      
      /**
       * Loads RBAC bindings from the API.
       * 
       * Features:
       * - Prevents duplicate requests if already loading
       * - Sets loading state during request
       * - Handles errors gracefully
       * - Updates state with loaded data
       */
      loadBindings: async () => {
        const state = get()
        if (state.isLoadingBindings) return // Prevent duplicate requests
        
        set({ isLoadingBindings: true, bindingsError: null }, false, 'loadBindings:start')
        
        try {
          const bindings = await fetchBindings()
          set({ 
            bindings, 
            isLoadingBindings: false 
          }, false, 'loadBindings:success')
        } catch (error) {
          set({ 
            isLoadingBindings: false, 
            bindingsError: error instanceof Error ? error.message : 'Failed to load bindings'
          }, false, 'loadBindings:error')
          console.error('Error loading bindings:', error)
        }
      },
      
      /**
       * Loads RBAC findings from the API.
       * 
       * Features:
       * - Prevents duplicate requests if already loading
       * - Sets loading state during request
       * - Handles errors gracefully
       * - Updates state with loaded data
       */
      loadFindings: async () => {
        const state = get()
        if (state.isLoadingFindings) return
        
        set({ isLoadingFindings: true, findingsError: null }, false, 'loadFindings:start')
        
        try {
          const findings = await fetchFindings()
          set({ 
            findings, 
            isLoadingFindings: false 
          }, false, 'loadFindings:success')
        } catch (error) {
          set({ 
            isLoadingFindings: false, 
            findingsError: error instanceof Error ? error.message : 'Failed to load findings'
          }, false, 'loadFindings:error')
          console.error('Error loading findings:', error)
        }
      },
      
      /**
       * Loads policy rules for a specific subject.
       * 
       * This method implements intelligent caching:
       * - Checks if data already exists in cache
       * - Prevents duplicate requests for the same subject
       * - Updates loading state appropriately
       * - Handles errors and cleanup
       * 
       * @param subject - The subject name to load policy rules for
       */
      loadPolicyRulesForSubject: async (subject) => {
        const state = get()
        
        // Skip if data already exists or is being loaded
        if (state.policyRules.has(subject) || state.isLoadingPolicyRules.has(subject)) {
          return
        }
        
        // Mark subject as loading
        set((state) => ({
          isLoadingPolicyRules: new Set([...state.isLoadingPolicyRules, subject]),
          policyRulesError: null
        }), false, `loadPolicyRulesForSubject:start:${subject}`)
        
        try {
          const rules = await fetchPolicyRules(subject)
          
          set((state) => {
            const newPolicyRules = new Map(state.policyRules)
            newPolicyRules.set(subject, rules)
            
            const newLoading = new Set(state.isLoadingPolicyRules)
            newLoading.delete(subject)
            
            return {
              policyRules: newPolicyRules,
              isLoadingPolicyRules: newLoading
            }
          }, false, `loadPolicyRulesForSubject:success:${subject}`)
          
        } catch (error) {
          set((state) => {
            const newLoading = new Set(state.isLoadingPolicyRules)
            newLoading.delete(subject)
            
            return {
              isLoadingPolicyRules: newLoading,
              policyRulesError: error instanceof Error ? error.message : 'Failed to load policy rules'
            }
          }, false, `loadPolicyRulesForSubject:error:${subject}`)
          
          console.error(`Error loading policy rules for ${subject}:`, error)
        }
      },
      
      /**
       * Loads policy rules for multiple subjects in a single batch request.
       * 
       * This is the most efficient way to load policy rules for multiple subjects
       * as it reduces the number of API calls and improves performance.
       * 
       * Features:
       * - Filters out subjects that are already cached or loading
       * - Makes a single batch API request for all missing subjects
       * - Updates cache with all received data
       * - Handles partial failures gracefully
       * 
       * @param subjects - Array of subject names to load policy rules for
       */
      loadBatchPolicyRules: async (subjects) => {
        const state = get()
        
        // Filter subjects that we don't have and aren't loading
        const missingSubjects = subjects.filter(subject => 
          !state.policyRules.has(subject) && !state.isLoadingPolicyRules.has(subject)
        )
        
        if (missingSubjects.length === 0) return
        
        // Mark all missing subjects as loading
        set((state) => ({
          isLoadingPolicyRules: new Set([...state.isLoadingPolicyRules, ...missingSubjects]),
          policyRulesError: null
        }), false, `loadBatchPolicyRules:start`)
        
        try {
          const batchResults = await fetchBatchPolicyRules(missingSubjects)
          
          set((state) => {
            const newPolicyRules = new Map(state.policyRules)
            const newLoading = new Set(state.isLoadingPolicyRules)
            
            // Add all received policy rules to cache
            Object.entries(batchResults).forEach(([subject, rules]) => {
              newPolicyRules.set(subject, rules)
              newLoading.delete(subject)
            })
            
            return {
              policyRules: newPolicyRules,
              isLoadingPolicyRules: newLoading
            }
          }, false, `loadBatchPolicyRules:success`)
          
        } catch (error) {
          set((state) => {
            const newLoading = new Set(state.isLoadingPolicyRules)
            
            // Remove all attempted subjects from loading state
            missingSubjects.forEach(subject => newLoading.delete(subject))
            
            return {
              isLoadingPolicyRules: newLoading,
              policyRulesError: error instanceof Error ? error.message : 'Failed to load batch policy rules'
            }
          }, false, `loadBatchPolicyRules:error`)
          
          console.error('Error loading batch policy rules:', error)
        }
      },
      
      // === Utility Actions ===
      
      /** Clears all error states in the store */
      clearErrors: () =>
        set({ 
          bindingsError: null, 
          findingsError: null, 
          policyRulesError: null 
        }, false, 'clearErrors'),
      
      /** Resets the entire store to its initial state */
      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'rbac-store', // Store name for DevTools
    }
  )
)

// === Selector Helper Functions ===
// These are convenience functions for deriving computed state from the store

/**
 * Hook to get all unique subject names from the current bindings.
 * 
 * This selector extracts all unique subject names from the loaded bindings,
 * which is useful for determining which subjects need policy rules loaded.
 * 
 * @returns Array of unique subject names from all bindings
 */
export const useUniqueSubjects = () => 
  useRbacStore((state) => {
    const subjects = new Set<string>()
    state.bindings.forEach(binding => {
      binding.subjects.forEach(subject => {
        subjects.add(subject.name)
      })
    })
    return Array.from(subjects)
  })

/**
 * Hook to get policy rules for multiple subjects.
 * 
 * This selector combines policy rules from multiple subjects into a single array.
 * Only returns rules for subjects that are already loaded in the cache.
 * 
 * @param subjects - Array of subject names to get policy rules for
 * @returns Combined array of policy rules for all specified subjects
 */
export const usePolicyRulesForSubjects = (subjects: string[]) =>
  useRbacStore((state) => {
    const result: RbacPolicyRule[] = []
    subjects.forEach(subject => {
      const rules = state.policyRules.get(subject)
      if (rules) {
        result.push(...rules)
      }
    })
    return result
  })

/**
 * Hook to check if any of the specified subjects are currently loading.
 * 
 * This is useful for showing loading indicators when multiple subjects
 * are being loaded simultaneously.
 * 
 * @param subjects - Array of subject names to check loading status for
 * @returns True if any of the subjects are currently loading
 */
export const useIsLoadingAnyPolicyRules = (subjects: string[]) =>
  useRbacStore((state) => 
    subjects.some(subject => state.isLoadingPolicyRules.has(subject))
  )
