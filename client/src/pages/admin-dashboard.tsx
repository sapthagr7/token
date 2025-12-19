import { useQuery, useMutation } from "@tanstack/react-query";
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
  CheckCircle,
  XCircle,
  ShoppingCart,
  Send,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { KycBadge, FrozenBadge, AssetTypeBadge } from "@/components/status-badge";
import { DashboardSkeleton } from "@/components/loading-states";
import { EmptyUsers } from "@/components/empty-states";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Asset, Transfer, Order } from "@shared/schema";

type TransferWithDetails = Transfer & { 
  asset: Asset; 
  fromUser?: User; 
  toUser?: User;
};

type OrderWithDetails = Order & {
  seller: User;
  asset: Asset;
};

interface TokenRequest {
  id: string;
  userId: string;
  assetId: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  asset: Asset;
  user: User;
}

interface PurchaseRequest {
  id: string;
  buyerId: string;
  orderId: string;
  quantity: number;
  totalPrice: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  buyer: User;
  order: OrderWithDetails;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { toast } = useToast();

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
    queryKey: ["/api/admin/transfers", { limit: 5 }],
  });

  const { data: pendingOrders } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/admin/pending-orders"],
  });

  const { data: pendingTokenRequests } = useQuery<TokenRequest[]>({
    queryKey: ["/api/admin/token-requests"],
  });

  const { data: pendingPurchaseRequests } = useQuery<PurchaseRequest[]>({
    queryKey: ["/api/admin/purchase-requests"],
  });

  const approveOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("POST", `/api/admin/orders/${orderId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/orders"] });
      toast({ title: "Order approved", description: "The sell order is now visible to buyers." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve order", description: error.message, variant: "destructive" });
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("POST", `/api/admin/orders/${orderId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-orders"] });
      toast({ title: "Order rejected", description: "The sell order has been rejected." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject order", description: error.message, variant: "destructive" });
    },
  });

  const fulfillTokenRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("POST", `/api/admin/token-requests/${requestId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/token-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Request fulfilled", description: "Tokens have been minted to the user." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to fulfill request", description: error.message, variant: "destructive" });
    },
  });

  const rejectTokenRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("POST", `/api/admin/token-requests/${requestId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/token-requests"] });
      toast({ title: "Request rejected", description: "The token request has been rejected." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject request", description: error.message, variant: "destructive" });
    },
  });

  const approvePurchaseRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("POST", `/api/admin/purchase-requests/${requestId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Purchase approved", description: "Tokens have been transferred to the buyer." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve purchase", description: error.message, variant: "destructive" });
    },
  });

  const rejectPurchaseRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("POST", `/api/admin/purchase-requests/${requestId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/purchase-requests"] });
      toast({ title: "Purchase rejected", description: "The purchase request has been rejected." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject purchase", description: error.message, variant: "destructive" });
    },
  });

  if (statsLoading || usersLoading || transfersLoading) {
    return <DashboardSkeleton />;
  }

  const pending = pendingUsers || [];
  const transfers = recentTransfers || [];
  const ordersToApprove = pendingOrders || [];
  const tokenRequestsToProcess = (pendingTokenRequests || []).filter(r => r.status === "PENDING");
  const purchaseRequestsToProcess = (pendingPurchaseRequests || []).filter(r => r.status === "PENDING");

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

      {/* Pending Orders and Token Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">Pending Orders</CardTitle>
              <CardDescription>Sell orders awaiting approval</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {ordersToApprove.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 p-4 mb-4">
                  <ShoppingCart className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No pending orders</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  All sell orders have been reviewed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {ordersToApprove.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50"
                    data-testid={`pending-order-${order.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{order.asset.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.tokenAmount} tokens @ ${parseFloat(order.pricePerToken).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Seller: {order.seller.name}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveOrderMutation.mutate(order.id)}
                        disabled={approveOrderMutation.isPending}
                        data-testid={`button-approve-order-${order.id}`}
                      >
                        {approveOrderMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectOrderMutation.mutate(order.id)}
                        disabled={rejectOrderMutation.isPending}
                        data-testid={`button-reject-order-${order.id}`}
                      >
                        {rejectOrderMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
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
              <CardTitle className="text-lg">Token Requests</CardTitle>
              <CardDescription>Users requesting token allocation</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {tokenRequestsToProcess.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 p-4 mb-4">
                  <Send className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No pending requests</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  All token requests have been processed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tokenRequestsToProcess.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50"
                    data-testid={`pending-request-${request.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{request.asset.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.amount} tokens requested
                      </p>
                      <p className="text-xs text-muted-foreground">
                        By: {request.user.name}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fulfillTokenRequestMutation.mutate(request.id)}
                        disabled={fulfillTokenRequestMutation.isPending}
                        data-testid={`button-fulfill-request-${request.id}`}
                      >
                        {fulfillTokenRequestMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectTokenRequestMutation.mutate(request.id)}
                        disabled={rejectTokenRequestMutation.isPending}
                        data-testid={`button-reject-request-${request.id}`}
                      >
                        {rejectTokenRequestMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchase Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Purchase Requests</CardTitle>
            <CardDescription>Users requesting to buy tokens from marketplace</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {purchaseRequestsToProcess.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 p-4 mb-4">
                <ShoppingCart className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No pending purchases</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                All purchase requests have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchaseRequestsToProcess.slice(0, 10).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50"
                  data-testid={`pending-purchase-${request.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{request.order?.asset?.title || "Unknown Asset"}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.quantity} tokens at ${parseFloat(request.order?.pricePerToken || "0").toFixed(2)}/token
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Buyer: {request.buyer?.name || "Unknown"} | Total: ${parseFloat(request.totalPrice).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approvePurchaseRequestMutation.mutate(request.id)}
                      disabled={approvePurchaseRequestMutation.isPending}
                      data-testid={`button-approve-purchase-${request.id}`}
                    >
                      {approvePurchaseRequestMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectPurchaseRequestMutation.mutate(request.id)}
                      disabled={rejectPurchaseRequestMutation.isPending}
                      data-testid={`button-reject-purchase-${request.id}`}
                    >
                      {rejectPurchaseRequestMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
