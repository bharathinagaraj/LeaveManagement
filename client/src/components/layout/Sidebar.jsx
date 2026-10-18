import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarPlus,
  ClipboardList,
  Inbox,
  History,
  Briefcase,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const EMPLOYEE_LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/apply", label: "Apply Leave", icon: CalendarPlus },
  { to: "/my-requests", label: "My Requests", icon: ClipboardList },
];

const MANAGER_LINKS = [
  { to: "/manager", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/manager/pending", label: "Pending Requests", icon: Inbox },
  { to: "/manager/processed", label: "Processed", icon: History },
  { to: "/manager/team", label: "Manage Team", icon: Users },
];

export default function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const links = user?.role === "manager" ? MANAGER_LINKS : EMPLOYEE_LINKS;

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex items-center gap-2 px-2 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Briefcase className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Leave Manager</p>
          <p className="text-xs text-muted-foreground">HR portal</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}