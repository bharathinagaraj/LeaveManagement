import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import RequestTable from "@/components/manager/RequestTable";
import { getRequests } from "@/services/managerService";

export default function PendingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRequests(await getRequests("pending"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Pending requests
        </h2>
        <p className="text-sm text-muted-foreground">
          Leave requests from your team waiting for a decision.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Awaiting review</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner label="Loading requests..." />
          ) : (
            <RequestTable
              requests={requests}
              emptyMessage="No pending requests. You're all caught up!"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}