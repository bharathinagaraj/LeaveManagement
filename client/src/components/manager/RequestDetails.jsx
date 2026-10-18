import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate, formatDateTime } from "@/utils/dateUtils";

const LEAVE_TYPE_LABEL = { earned: "Earned", sick: "Sick" };

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export default function RequestDetails({ request }) {
  if (!request) return null;

  const { employeeBalances, employeeName, employeeEmail } = request;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Request details</CardTitle>
          <StatusBadge status={request.status} />
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row
              label="Leave type"
              value={LEAVE_TYPE_LABEL[request.leaveType] || request.leaveType}
            />
            <Row
              label="Period"
              value={`${formatDate(request.startDate)} – ${formatDate(request.endDate)}`}
            />
            <Row label="Working days" value={request.days} />
            <Row label="Applied on" value={formatDateTime(request.createdAt)} />
            {request.reviewedAt && (
              <Row label="Reviewed on" value={formatDateTime(request.reviewedAt)} />
            )}
          </dl>
          <Separator className="my-4" />
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Reason</p>
            <p className="text-sm leading-relaxed">{request.reason}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row label="Name" value={employeeName} />
            <Row label="Email" value={employeeEmail} />
          </dl>
          <Separator className="my-4" />
          <p className="mb-2 text-sm text-muted-foreground">
            Current leave balance
          </p>
          <div className="flex gap-2">
            <Badge variant="success">
              Earned: {employeeBalances?.earnedLeave ?? "—"} days
            </Badge>
            <Badge variant="warning">
              Sick: {employeeBalances?.sickLeave ?? "—"} days
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}