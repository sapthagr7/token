import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  ArrowRight,
  Building2,
  Wheat,
  FileText,
  DollarSign,
  History,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { AssetTypeBadge, OrderStatusBadge } from "@/components/status-badge";
import { DashboardSkeleton } from "@/components/loading-states";
import { EmptyPortfolio } from "@/components/empty-states";
import { KycDocumentUpload } from "@/components/kyc-documents";
import { useAuthStore } from "@/lib/auth-store";
import type { Token, Asset, Order, Transfer, User } from "@shared/schema";

type TokenWithAsset = Token & { asset: Asset };
type OrderWithAsset = Order & { asset: Asset };
type TransferWithDetails = Transfer & { asset: Asset; fromUser?: User; toUser?: User };

const assetIcons = {
  real_estate: Building2,
  commodity: Wheat,
  loan: FileText,
};

const reasonLabels: Record<string, string> = {
  TRADE: "Trade",
  MINT: "Tokens Received",
  TRANSFER: "Transfer",
  ADMIN_REVOKE: "Admin Revoked",
};

export default function InvestorDashboard() {
  const { user } = useAuthStore();

  const { data: portfolio, isLoading: portfolioLoading } = useQuery<TokenWithAsset[]>({
    queryKey: ["/api/tokens/my-portfolio"],
  });

  const { data: myOrders, isLoading: ordersLoading } = useQuery<OrderWithAsset[]>({
    queryKey: ["/api/marketplace/my-orders"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<TransferWithDetails[]>({
    queryKey: ["/api/transactions/history"],
  });

  if (portfolioLoading || ordersLoading || transactionsLoading) {
    return <DashboardSkeleton />;
  }

  const tokens = portfolio || [];
  const orders = myOrders || [];
  const history = transactions || [];
  const openOrders = orders.filter((o) => o.status === "OPEN");

  const totalMarketValue = tokens.reduce((sum, token) => {
    const price = parseFloat(token.asset.navPrice);
    return sum + token.amount * price;
  }, 0);

  const totalBookValue = tokens.reduce((sum, token) => {
    return sum + parseFloat(token.costBasis || "0");
  }, 0);

  const totalTokens = tokens.reduce((sum, token) => sum + token.amount, 0);

  const gainLoss = totalMarketValue - totalBookValue;
  const gainLossPercent = totalBookValue > 0 ? ((gainLoss / totalBookValue) * 100) : 0;
  const isGain = gainLoss >= 0;

  const getTransactionType = (transfer: TransferWithDetails) => {
    if (transfer.toUserId === user?.id) {
      return "buy";
    } else if (transfer.fromUserId === user?.id) {
      return "sell";
    }
    return "transfer";
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your investment portfolio
          </p>
        </div>
        <Link href="/marketplace">
          <Button className="gap-2" data-testid="button-browse-marketplace">
            <ShoppingCart className="h-4 w-4" />
            Browse Marketplace
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Book Value"
          value={`$${totalBookValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          description="Total cost basis"
          icon={DollarSign}
          data-testid="stat-book-value"
        />
        <StatCard
          title="Market Value"
          value={`$${totalMarketValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          description="Current NAV value"
          icon={Coins}
          data-testid="stat-market-value"
        />
        <StatCard
          title="Total Gain/Loss"
          value={`${isGain ? "+" : ""}$${gainLoss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          description={`${isGain ? "+" : ""}${gainLossPercent.toFixed(2)}%`}
          icon={isGain ? TrendingUp : TrendingDown}
          valueClassName={isGain ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
          data-testid="stat-gain-loss"
        />
        <StatCard
          title="Active Orders"
          value={openOrders.length}
          description={`${totalTokens.toLocaleString()} tokens owned`}
          icon={ShoppingCart}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">My Tokens</CardTitle>
              <CardDescription>Your current token holdings</CardDescription>
            </div>
            {tokens.length > 0 && (
              <Link href="/my-tokens">
                <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-tokens">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {tokens.length === 0 ? (
              <EmptyPortfolio />
            ) : (
              <div className="space-y-4">
                {tokens.slice(0, 4).map((token) => {
                  const Icon = assetIcons[token.asset.type];
                  const value = token.amount * parseFloat(token.asset.navPrice);

                  return (
                    <div
                      key={token.id}
                      className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50"
                      data-testid={`token-card-${token.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-background p-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{token.asset.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <AssetTypeBadge type={token.asset.type} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold font-mono">
                          {token.amount.toLocaleString()} tokens
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">My Orders</CardTitle>
              <CardDescription>Your marketplace activity</CardDescription>
            </div>
            {orders.length > 0 && (
              <Link href="/marketplace?tab=my-orders">
                <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-orders">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No orders yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  You haven't placed any sell orders. Own tokens first to start selling.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 4).map((order) => {
                  const Icon = assetIcons[order.asset.type];
                  const totalPrice = order.tokenAmount * parseFloat(order.pricePerToken);

                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50"
                      data-testid={`order-card-${order.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-background p-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{order.asset.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <OrderStatusBadge status={order.status} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold font-mono">
                          {order.tokenAmount.toLocaleString()} @ ${parseFloat(order.pricePerToken).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total: ${totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Transaction History</CardTitle>
            <CardDescription>Your buy and sell activity</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No transactions yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your buy and sell history will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.slice(0, 8).map((transfer) => {
                const Icon = assetIcons[transfer.asset.type];
                const txType = getTransactionType(transfer);
                const isBuy = txType === "buy";

                return (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50"
                    data-testid={`transaction-${transfer.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-md p-2 ${isBuy ? "bg-emerald-100 dark:bg-emerald-950" : "bg-red-100 dark:bg-red-950"}`}>
                        {isBuy ? (
                          <ArrowDownLeft className={`h-5 w-5 ${isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{transfer.asset.title}</p>
                          <Badge variant="outline" className={isBuy ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" : "border-red-500/50 text-red-600 dark:text-red-400"}>
                            {isBuy ? "Buy" : "Sell"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {reasonLabels[transfer.reason] || transfer.reason}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold font-mono ${isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {isBuy ? "+" : "-"}{transfer.tokenAmount.toLocaleString()} tokens
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transfer.timestamp), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {user?.kycStatus !== "APPROVED" && (
        <KycDocumentUpload />
      )}
    </div>
  );
}
