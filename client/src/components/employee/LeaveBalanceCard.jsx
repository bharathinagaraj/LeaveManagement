import { CalendarDays, HeartPulse } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function LeaveBalanceCard({ balances, className }) {
  const earned = balances?.earnedLeave ?? 0;
  const sick = balances?.sickLeave ?? 0;

  const stats = [
    {
      label: "Earned Leave",
      value: earned,
      sub: "12 days / year",
      icon: CalendarDays,
      iconClass: "bg-green-100 text-green-700",
    },
    {
      label: "Sick Leave",
      value: sick,
      sub: "10 days / year",
      icon: HeartPulse,
      iconClass: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {stats.map(({ label, value, sub, icon: Icon, iconClass }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                iconClass
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">days remaining · {sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}