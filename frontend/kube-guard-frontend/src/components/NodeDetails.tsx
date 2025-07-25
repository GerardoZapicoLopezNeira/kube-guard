// src/components/NodeDetails.tsx
import { useEffect, useState } from "react"
import type {
  RbacPolicyRule,
  K8sPolicyRule,
} from "../types/rbac"
import type { GraphNode } from "./RbacGraph/types"
import { fetchPolicyRules, fetchRoleRules } from "@/services/api"
import { Badge } from "@/components/ui/badge"

interface NodeDetailsProps {
  node: GraphNode
}

export function NodeDetails({ node }: NodeDetailsProps) {
  const { label, type, namespace, roleKind } = node

  // For subjects (users, groups, service accounts)
  const [rules, setRules] = useState<RbacPolicyRule[] | null>(null)
  // For roles (Role, ClusterRole)
  const [roleRules, setRoleRules] = useState<K8sPolicyRule[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = `${type}/${label}`

  useEffect(() => {
    setLoading(true)
    setError(null)
    setRules(null)
    setRoleRules(null)

    if (type === "role") {
      // Use the roleKind from the node data
      const kind = roleKind || 'ClusterRole' // Default to ClusterRole if not specified
      
      fetchRoleRules(label, kind, namespace === 'cluster' ? undefined : namespace)
        .then(setRoleRules)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    } else {
      // For subjects (user, group, serviceaccount)
      fetchPolicyRules(label)
        .then(setRules)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [subjectId, type, label, namespace, roleKind])

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/30">
      <h3 className="text-xl font-semibold">
        Type: {type.charAt(0).toUpperCase() + type.slice(1)}
      </h3>
      <h4 className="font-light break-words">Name: {label}</h4>

      <p className="text-m">
        <span className="font-medium">Namespace:</span> {namespace || "-"}
      </p>

      {loading && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading {type === "role" ? "role" : "policy"} rules…
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive">Error: {error}</p>
      )}

      {/* Role rules display (for roles) */}
      {!loading && type === "role" && roleRules && roleRules.length > 0 && (
        <div className="space-y-3 mt-4">
          <h4 className="text-lg font-semibold">Role Policy Rules</h4>
          {roleRules.map((rule, i) => (
            <div key={i} className="border border-border rounded-md p-3 bg-background/70 space-y-2">
              <div className="font-medium mb-2">
                🔐 Rule #{i + 1}
              </div>
              
              {/* Resources */}
              {rule.resources && rule.resources.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Resources:</div>
                  <div className="flex flex-wrap gap-1">
                    {rule.resources.map(resource => (
                      <Badge key={resource} variant="secondary" className="text-xs">
                        📦 {resource}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* API Groups */}
              {rule.apiGroups && rule.apiGroups.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">API Groups:</div>
                  <div className="flex flex-wrap gap-1">
                    {rule.apiGroups.map(group => (
                      <Badge key={group} variant="outline" className="text-xs">
                        🌐 {group || "core"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Verbs */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Allowed Verbs:</div>
                <div className="flex flex-wrap gap-1">
                  {rule.verbs.map(verb => (
                    <Badge key={verb} variant="default" className="text-xs">
                      ⚡ {verb}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Non-resource URLs */}
              {rule.nonResourceURLs && rule.nonResourceURLs.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Non-Resource URLs:</div>
                  <div className="flex flex-wrap gap-1">
                    {rule.nonResourceURLs.map(url => (
                      <Badge key={url} variant="outline" className="text-xs">
                        🔗 {url}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Resource Names */}
              {rule.resourceNames && rule.resourceNames.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Resource Names:</div>
                  <div className="flex flex-wrap gap-1">
                    {rule.resourceNames.map(name => (
                      <Badge key={name} variant="outline" className="text-xs">
                        📝 {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Subject policy rules display (for users, groups, service accounts) */}
      {!loading && type !== "role" && rules && rules.length > 0 && (
        <div className="space-y-3 mt-4">
          <h4 className="text-lg font-semibold">Subject Policy Rules</h4>
          {rules.map((rule, i) => {
            const grouped = new Map<string, string[]>()

            rule.allowedTo.forEach(a => {
              const key = a.resource ?? a.nonResourceURI ?? "<unknown>"
              if (!grouped.has(key)) grouped.set(key, [])
              grouped.get(key)!.push(a.verb)
            })

            return (
              <div key={i} className="border border-border rounded-md p-3 bg-background/70 space-y-2">
                {Array.from(grouped.entries()).map(([resource, verbs]) => (
                  <div key={resource}>
                    <div className="font-medium mb-1">
                      📦 <code>{resource}</code>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {verbs.map(v => (
                        <Badge key={v} variant="outline">{v}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* No rules found */}
      {!loading && type === "role" && roleRules && roleRules.length === 0 && (
        <p className="text-sm text-muted-foreground">No policy rules found for this role.</p>
      )}

      {!loading && type !== "role" && rules && rules.length === 0 && (
        <p className="text-sm text-muted-foreground">No policy rules found for this subject.</p>
      )}
    </div>
  )
}
