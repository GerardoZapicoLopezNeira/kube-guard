import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { RbacBinding } from "../types/rbac"

interface Props {
  binding: RbacBinding
  onClose: () => void
}

function BindingModal({ binding, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-muted text-white rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {binding.kind}: {binding.name}
          </DialogTitle>
        </DialogHeader>
        <pre className="bg-gray-900 text-sm text-gray-200 p-4 rounded-md overflow-auto max-h-[60vh] whitespace-pre-wrap font-mono">
          {binding.raw || "No YAML available"}
        </pre>
      </DialogContent>
    </Dialog>
  )
}

export default BindingModal
