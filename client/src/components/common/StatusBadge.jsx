import { Badge } from "@/components/ui/badge";

const STATUS_MAP = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || STATUS_MAP.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}