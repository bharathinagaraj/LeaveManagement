
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Inbox, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import RequestTable from "@/components/manager/RequestTable";
import { getRequests, getProcessed } from "@/services/managerService";

export default function ManagerDashboard() {
  const [pending, setPending] = useState([]);
  const [processed, setProcessed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [pendingList, processedList] = await Promise.all([
        getRequests("pending"),
        getProcessed(),
      ]);
      setPending(pendingList);
      setProcessed(processedList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const approvedCount = processed.filter((r) => r.status === "approved").length;
  const rejectedCount = processed.filter((r) => r.status === "rejected").length;

  const stats = [
    {
      label: "Pending requests",
      value: pending.length,
      icon: Inbox,
      iconClass: "bg-amber-100 text-amber-700",
      link: "/manager/pending",
    },
    {
      label: "Approved",
      value: approvedCount,
      icon: CheckCircle2,
      iconClass: "bg-green-100 text-green-700",
      link: "/manager/processed",
    },
    {
      label: "Rejected",
      value: rejectedCount,
      icon: XCircle,
      iconClass: "bg-red-100 text-red-700",
      link: "/manager/processed",
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Review and act on your team's leave requests.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, iconClass, link }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
              <Button variant="link" asChild className="mt-1 h-auto p-0 text-xs">
                <Link to={link}>
                  View
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Awaiting your review</CardTitle>
          <Button variant="link" asChild className="px-0">
            <Link to="/manager/pending">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <RequestTable
            requests={pending.slice(0, 5)}
            emptyMessage="No pending requests. You're all caught up!"
          />
        </CardContent>
      </Card>
    </div>
  );
}