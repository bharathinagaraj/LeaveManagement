import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import LeaveHistoryTable from "@/components/employee/LeaveHistoryTable";
import { getMyLeaves, cancelLeave } from "@/services/leaveService";

export default function MyRequests() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toCancel, setToCancel] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLeaves(await getMyLeaves());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancellingId(toCancel.id);
    try {
      const cancelled = await cancelLeave(toCancel.id);
      setLeaves((prev) =>
        prev.map((leave) =>
          leave.id === cancelled.id ? { ...leave, status: cancelled.status } : leave
        )
      );
      setToCancel(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My requests</h2>
        <p className="text-sm text-muted-foreground">
          Track the status of your leave applications.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner label="Loading requests..." />
          ) : (
            <LeaveHistoryTable
              leaves={leaves}
              onCancel={(leave) => setToCancel(leave)}
              cancellingId={cancellingId}
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(toCancel)}
        onOpenChange={(open) => !open && setToCancel(null)}
        title="Cancel leave request?"
        description={
          toCancel
            ? `This will cancel your ${toCancel.leaveType} leave for ${toCancel.days} working day(s). This action cannot be undone.`
            : ""
        }
        confirmLabel="Yes, cancel request"
        destructive
        loading={cancellingId !== null}
        onConfirm={confirmCancel}
      />
    </div>
  );
}