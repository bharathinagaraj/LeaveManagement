import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/common/ConfirmDialog";

export default function ApprovalActions({ status, onApprove, onReject }) {
  const [dialog, setDialog] = useState(null); // 'approve' | 'reject'
  const [busy, setBusy] = useState(false);

  if (status !== "pending") return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      if (dialog === "approve") await onApprove();
      else if (dialog === "reject") await onReject();
    } finally {
      setBusy(false);
      setDialog(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="default"
        onClick={() => setDialog("approve")}
        disabled={busy}
      >
        <Check className="h-4 w-4" />
        Approve
      </Button>
      <Button
        variant="destructive"
        onClick={() => setDialog("reject")}
        disabled={busy}
      >
        <X className="h-4 w-4" />
        Reject
      </Button>

      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Approve leave request?"
        description="Approving will reduce the employee's leave balance by the requested number of working days."
        confirmLabel="Approve request"
        destructive
        loading={busy}
        onConfirm={handleConfirm}
      />
      <ConfirmDialog
        open={dialog === "reject"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Reject leave request?"
        description="The employee's leave balance will not be affected."
        confirmLabel="Reject request"
        destructive
        loading={busy}
        onConfirm={handleConfirm}
      />
    </div>
  );
}