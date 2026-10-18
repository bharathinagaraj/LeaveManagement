import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate, formatDateTime } from "@/utils/dateUtils";

const LEAVE_TYPE_LABEL = { earned: "Earned", sick: "Sick" };

export default function RequestTable({ requests, emptyMessage }) {
  if (!requests || requests.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {emptyMessage || "No requests found."}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead className="text-right">Days</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead className="text-right">Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell>
              <div className="font-medium">{request.employeeName}</div>
              <div className="text-xs text-muted-foreground">
                {request.employeeEmail}
              </div>
            </TableCell>
            <TableCell>
              {LEAVE_TYPE_LABEL[request.leaveType] || request.leaveType}
            </TableCell>
            <TableCell>
              <span className="whitespace-nowrap">
                {formatDate(request.startDate)}
              </span>
              {" – "}
              <span className="whitespace-nowrap">
                {formatDate(request.endDate)}
              </span>
            </TableCell>
            <TableCell className="text-right">{request.days}</TableCell>
            <TableCell>
              <StatusBadge status={request.status} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDateTime(request.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <Link
                to={`/manager/requests/${request.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Review
                <ChevronRight className="h-4 w-4" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}