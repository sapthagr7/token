import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Package, ShoppingCart, Users, FileText, Coins, History } from "lucide-react";
import { Link } from "wouter";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button data-testid="button-empty-state-action">{action.label}</Button>
          </Link>
        ) : (
          <Button onClick={action.onClick} data-testid="button-empty-state-action">
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}

export function EmptyPortfolio() {
  return (
    <EmptyState
      icon={Coins}
      title="No tokens yet"
      description="You don't own any tokens. Browse the marketplace to start investing in real-world assets."
      action={{ label: "Browse Marketplace", href: "/marketplace" }}
    />
  );
}

export function EmptyMarketplace() {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="No orders available"
      description="There are no open orders in the marketplace right now. Check back later or create your own sell order."
    />
  );
}

export function EmptyUsers() {
  return (
    <EmptyState
      icon={Users}
      title="No users found"
      description="No users match your current filters. Try adjusting your search criteria."
    />
  );
}

export function EmptyAssets() {
  return (
    <EmptyState
      icon={Package}
      title="No assets created"
      description="Create your first asset to start tokenizing real-world assets."
      action={{ label: "Create Asset", href: "/admin/assets/new" }}
    />
  );
}

export function EmptyAuditLog() {
  return (
    <EmptyState
      icon={History}
      title="No activity yet"
      description="Transfer and compliance activity will appear here as transactions occur."
    />
  );
}
