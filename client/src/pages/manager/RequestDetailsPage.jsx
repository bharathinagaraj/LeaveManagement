import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import RequestDetails from "@/components/manager/RequestDetails";
import ApprovalActions from "@/components/manager/ApprovalActions";
import {
  getRequest,
  approveRequest,
  rejectRequest,
} from "@/services/managerService";

export default function RequestDetailsPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRequest(await getRequest(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async () => {
    const updated = await approveRequest(id);
    setRequest((prev) => ({ ...prev, status: updated.status }));
  };

  const handleReject = async () => {
    const updated = await rejectRequest(id);
    setRequest((prev) => ({ ...prev, status: updated.status }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Request #{id}
          </h2>
          <p className="text-sm text-muted-foreground">
            Review the details before making a decision.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/manager/pending">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <LoadingSpinner label="Loading request..." />
      ) : request ? (
        <>
          <RequestDetails request={request} />
          <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
            <span className="text-sm font-medium">Decision</span>
            <ApprovalActions
              status={request.status}
              onApprove={handleApprove}
              onReject={handleReject}
            />
            {request.status !== "pending" && (
              <p className="text-sm text-muted-foreground">
                This request has already been {request.status}.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}