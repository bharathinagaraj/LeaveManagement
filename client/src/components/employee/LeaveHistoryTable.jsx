import { XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate, formatDateTime } from "@/utils/dateUtils";

const LEAVE_TYPE_LABEL = { earned: "Earned", sick: "Sick" };

export default function LeaveHistoryTable({ leaves, onCancel, cancellingId }) {
  if (!leaves || leaves.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No leave requests yet. Apply for your first leave to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead className="text-right">Days</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaves.map((leave) => (
          <TableRow key={leave.id}>
            <TableCell className="font-medium">
              {LEAVE_TYPE_LABEL[leave.leaveType] || leave.leaveType}
            </TableCell>
            <TableCell>
              <span className="whitespace-nowrap">
                {formatDate(leave.startDate)}
              </span>
              {" – "}
              <span className="whitespace-nowrap">
                {formatDate(leave.endDate)}
              </span>
            </TableCell>
            <TableCell className="text-right">{leave.days}</TableCell>
            <TableCell className="max-w-[220px] truncate" title={leave.reason}>
              {leave.reason}
            </TableCell>
            <TableCell>
              <StatusBadge status={leave.status} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDateTime(leave.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              {leave.status === "pending" && onCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancellingId === leave.id}
                  onClick={() => onCancel(leave)}
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}