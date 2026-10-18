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
import { getProcessed } from "@/services/managerService";

export default function ProcessedRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRequests(await getProcessed());
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
          Processed requests
        </h2>
        <p className="text-sm text-muted-foreground">
          Leave requests you have already approved or rejected.
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
            <LoadingSpinner label="Loading processed requests..." />
          ) : (
            <RequestTable
              requests={requests}
              emptyMessage="No processed requests yet."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}