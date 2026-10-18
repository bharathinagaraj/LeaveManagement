import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import LeaveBalanceCard from "@/components/employee/LeaveBalanceCard";
import LeaveHistoryTable from "@/components/employee/LeaveHistoryTable";
import { getLeaveBalance, getMyLeaves } from "@/services/leaveService";

export default function EmployeeDashboard() {
  const [balances, setBalances] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [balanceData, leaveList] = await Promise.all([
        getLeaveBalance(),
        getMyLeaves(),
      ]);
      setBalances(balanceData);
      setLeaves(leaveList);
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

  if (loading && !balances) {
    return <LoadingSpinner />;
  }

  const recent = leaves.slice(0, 5);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">My leave</h2>
          <p className="text-sm text-muted-foreground">
            View your balance and apply for time off.
          </p>
        </div>
        <Button asChild>
          <Link to="/apply">
            <CalendarPlus className="h-4 w-4" />
            Apply for leave
          </Link>
        </Button>
      </div>

      <LeaveBalanceCard balances={balances} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Recent requests</CardTitle>
          <Button variant="link" asChild className="px-0">
            <Link to="/my-requests">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner label="Loading requests..." />
          ) : (
            <LeaveHistoryTable leaves={recent} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}