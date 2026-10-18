import { useState } from "react";
import { AlertCircle, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { countWorkingDays, todayInput } from "@/utils/dateUtils";

const today = todayInput();

const LEAVE_TYPES = [
  { value: "earned", label: "Earned Leave (12 days/yr)" },
  { value: "sick", label: "Sick Leave (10 days/yr)" },
];

export default function LeaveApplicationForm({ balances, onSubmit }) {
  const [form, setForm] = useState({
    leaveType: "",
    startDate: today,
    endDate: today,
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const days = countWorkingDays(form.startDate, form.endDate);
  const available =
    form.leaveType === "earned"
      ? balances?.earnedLeave
      : form.leaveType === "sick"
        ? balances?.sickLeave
        : null;

  const insufficient =
    available !== null && days > 0 && days > available;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.leaveType) {
      setError("Please choose a leave type.");
      return;
    }
    if (form.startDate > form.endDate) {
      setError("Start date cannot be after end date.");
      return;
    }
    if (days === 0) {
      setError("The selected range does not include any working days.");
      return;
    }
    if (insufficient) {
      setError(
        `Insufficient balance: you need ${days} day(s) but only ${available} remain.`
      );
      return;
    }
    if (!form.reason.trim()) {
      setError("Please provide a reason.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ ...form, reason: form.reason.trim() });
      setForm({
        leaveType: "",
        startDate: today,
        endDate: today,
        reason: "",
      });
    } catch (err) {
      setError(err.message || "Failed to submit the request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Apply for Leave
        </CardTitle>
        <CardDescription>
          Leave is counted in full working days (Mon–Fri). Your balance is only
          reduced after a manager approves the request.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cannot submit</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave type</Label>
            <Select
              value={form.leaveType}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, leaveType: value }))
              }
            >
              <SelectTrigger id="leaveType" className="w-full">
                <SelectValue placeholder="Select a leave type" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                min={today}
                onChange={handleChange("startDate")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={handleChange("endDate")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Briefly describe the reason for your leave"
              value={form.reason}
              onChange={handleChange("reason")}
              rows={3}
            />
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            {days > 0 ? (
              <p>
                <span className="font-semibold">{days}</span> working
                day{days > 1 ? "s" : ""} requested.{" "}
                {typeof available === "number" && (
                  <>
                    <span className="font-semibold">{available}</span>{" "}
                    available.
                  </>
                )}
              </p>
            ) : (
              <p className="text-muted-foreground">
                Select a date range to see the number of working days.
              </p>
            )}
            {insufficient && (
              <p className="mt-1 font-medium text-destructive">
                This exceeds your available balance.
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}