import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users,
  Package,
  Coins,
  History,
  ArrowRight,
  UserCheck,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { KycBadge, FrozenBadge } from "@/components/status-badge";
import { DashboardSkeleton } from "@/components/loading-states";
import { EmptyUsers } from "@/components/empty-states";
import { useAuthStore } from "@/lib/auth-store";
import type { User, Asset, Transfer } from "@shared/schema";

type TransferWithDetails = Transfer & { 
  asset: Asset; 
  fromUser?: User; 
  toUser?: User;
};

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalUsers: number;
    pendingKyc: number;
    totalAssets: number;
    totalTokensMinted: number;
  }>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: pendingUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users", { kycStatus: "PENDING" }],
  });

  const { data: recentTransfers, isLoading: transfersLoading } = useQuery<TransferWithDetails[]>({
    queryKey: ["/api/transfers", { limit: 5 }],
  });

  if (statsLoading || usersLoading || transfersLoading) {
    return <DashboardSkeleton />;
  }

  const pending = pendingUsers || [];
  const transfers = recentTransfers || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, assets, and monitor platform activity
          </p>
        </div>
        <Link href="/admin/assets/new">
          <Button className="gap-2" data-testid="button-create-asset">
            <Package className="h-4 w-4" />
            Create Asset
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
        />
        <StatCard
          title="Pending KYC"
          value={stats?.pendingKyc || 0}
          description="Awaiting review"
          icon={Clock}
          valueClassName={stats?.pendingKyc ? "text-amber-600 dark:text-amber-400" : ""}
        />
        <StatCard
          title="Total Assets"
          value={stats?.totalAssets || 0}
          icon={Package}
        />
        <StatCard
          title="Tokens Minted"
          value={(stats?.totalTokensMinted || 0).toLocaleString()}
          icon={Coins}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">KYC Queue</CardTitle>
              <CardDescription>Users awaiting verification</CardDescription>
            </div>
            <Link href="/admin/users?filter=pending">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-kyc">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 p-4 mb-4">
                  <UserCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1">All caught up!</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  No users are currently waiting for KYC approval.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pending.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50"
                    data-testid={`user-card-${user.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium">
                          {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <KycBadge status={user.kycStatus} />
                      <Link href={`/admin/users?id=${user.id}`}>
                        <Button size="sm" variant="outline" data-testid={`button-review-${user.id}`}>
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest transfers and actions</CardDescription>
            </div>
            <Link href="/admin/audit">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-audit">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {transfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <History className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No activity yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Transfer activity will appear here as transactions occur.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50"
                    data-testid={`transfer-card-${transfer.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {transfer.reason === "MINT" && "Tokens Minted"}
                        {transfer.reason === "TRANSFER" && "Token Transfer"}
                        {transfer.reason === "TRADE" && "Marketplace Trade"}
                        {transfer.reason === "ADMIN_REVOKE" && "Admin Revoke"}
                        {transfer.reason === "FREEZE" && "Account Frozen"}
                        {transfer.reason === "UNFREEZE" && "Account Unfrozen"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {transfer.asset.title} - {transfer.tokenAmount} tokens
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(transfer.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
