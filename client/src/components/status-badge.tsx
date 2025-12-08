import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, XCircle, Lock, Unlock } from "lucide-react";

type KycStatus = "PENDING" | "APPROVED" | "REJECTED";
type OrderStatus = "OPEN" | "FILLED" | "CANCELLED";

interface KycBadgeProps {
  status: KycStatus;
  className?: string;
}

export function KycBadge({ status, className }: KycBadgeProps) {
  const config = {
    PENDING: {
      label: "Pending",
      variant: "outline" as const,
      className: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
      icon: Clock,
    },
    APPROVED: {
      label: "Approved",
      variant: "outline" as const,
      className: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
      icon: CheckCircle,
    },
    REJECTED: {
      label: "Rejected",
      variant: "outline" as const,
      className: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
      icon: XCircle,
    },
  };

  const { label, className: badgeClassName, icon: Icon } = config[status];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", badgeClassName, className)}
      data-testid={`badge-kyc-${status.toLowerCase()}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

interface FrozenBadgeProps {
  isFrozen: boolean;
  className?: string;
}

export function FrozenBadge({ isFrozen, className }: FrozenBadgeProps) {
  if (!isFrozen) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium border-red-500/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
        className
      )}
      data-testid="badge-frozen"
    >
      <Lock className="h-3 w-3" />
      Frozen
    </Badge>
  );
}

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = {
    OPEN: {
      label: "Open",
      className: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    },
    FILLED: {
      label: "Filled",
      className: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    },
    CANCELLED: {
      label: "Cancelled",
      className: "border-gray-500/50 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/30",
    },
  };

  const { label, className: badgeClassName } = config[status];

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", badgeClassName, className)}
      data-testid={`badge-order-${status.toLowerCase()}`}
    >
      {label}
    </Badge>
  );
}

interface AssetTypeBadgeProps {
  type: "real_estate" | "commodity" | "loan";
  className?: string;
}

export function AssetTypeBadge({ type, className }: AssetTypeBadgeProps) {
  const config = {
    real_estate: {
      label: "Real Estate",
      className: "border-violet-500/50 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30",
    },
    commodity: {
      label: "Commodity",
      className: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    },
    loan: {
      label: "Loan",
      className: "border-cyan-500/50 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30",
    },
  };

  const { label, className: badgeClassName } = config[type];

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", badgeClassName, className)}
      data-testid={`badge-asset-${type}`}
    >
      {label}
    </Badge>
  );
}

interface RoleBadgeProps {
  role: "ADMIN" | "INVESTOR";
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = {
    ADMIN: {
      label: "Admin",
      className: "border-purple-500/50 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
    },
    INVESTOR: {
      label: "Investor",
      className: "border-sky-500/50 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30",
    },
  };

  const { label, className: badgeClassName } = config[role];

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", badgeClassName, className)}
      data-testid={`badge-role-${role.toLowerCase()}`}
    >
      {label}
    </Badge>
  );
}
