import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import LeaveBalanceCard from "@/components/employee/LeaveBalanceCard";
import LeaveApplicationForm from "@/components/employee/LeaveApplicationForm";
import { getLeaveBalance, applyLeave } from "@/services/leaveService";

export default function ApplyLeave() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setBalances(await getLeaveBalance());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    const leave = await applyLeave(payload);
    setSuccess(
      `Leave request submitted (${leave.days} working days). It's now pending approval.`
    );
    setTimeout(() => navigate("/my-requests"), 1200);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Apply for leave</h2>
        <p className="text-sm text-muted-foreground">
          Pick a leave type, choose your dates, and explain the reason.
        </p>
      </div>

      {success && (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <LeaveBalanceCard balances={balances} />

      {loading ? (
        <LoadingSpinner label="Loading your balance..." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <LeaveApplicationForm balances={balances} onSubmit={handleSubmit} />
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              <h3 className="mb-2 font-semibold text-foreground">Good to know</h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>Earned leave: 12 days per year.</li>
                <li>Sick leave: 10 days per year.</li>
                <li>Leave is counted in full working days (Mon–Fri).</li>
                <li>Your balance only reduces after approval.</li>
                <li>Requests that overlap a pending or approved leave are rejected.</li>
                <li>You can cancel a request while it is still pending.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}