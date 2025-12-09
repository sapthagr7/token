import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Wheat,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/loading-states";
import type { Transfer, Asset, User } from "@shared/schema";

type TransferWithDetails = Transfer & { asset: Asset; fromUser?: User; toUser?: User };

interface UserTransactionsResponse {
  user: { id: string; name: string; email: string };
  transfers: TransferWithDetails[];
}

const assetIcons = {
  real_estate: Building2,
  commodity: Wheat,
  loan: FileText,
};

const reasonLabels: Record<string, string> = {
  TRADE: "Marketplace Trade",
  MINT: "Token Mint",
  TRANSFER: "Transfer",
  ADMIN_REVOKE: "Admin Revoked",
};

export default function AdminUserTransactionsPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const { data, isLoading } = useQuery<UserTransactionsResponse>({
    queryKey: ["/api/admin/users", userId, "transactions"],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">User Transaction History</h1>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  const userInfo = data?.user;
  const transfers = data?.transfers || [];

  const getTransactionType = (transfer: TransferWithDetails) => {
    if (transfer.toUserId === userId) {
      return "buy";
    } else if (transfer.fromUserId === userId) {
      return "sell";
    }
    return "transfer";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Transaction History
          </h1>
          <p className="text-muted-foreground mt-1">
            {userInfo?.name} ({userInfo?.email})
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">All Transactions</CardTitle>
            <CardDescription>Complete buy and sell history for this user</CardDescription>
          </div>
          <Badge variant="secondary">{transfers.length} transactions</Badge>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No transactions</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                This user has no transaction history yet.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => {
                    const Icon = assetIcons[transfer.asset.type];
                    const txType = getTransactionType(transfer);
                    const isBuy = txType === "buy";
                    
                    const counterparty = isBuy
                      ? transfer.fromUser?.name || "System"
                      : transfer.toUser?.name || "System";

                    return (
                      <TableRow key={transfer.id} data-testid={`transaction-row-${transfer.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`rounded-md p-1.5 ${isBuy ? "bg-emerald-100 dark:bg-emerald-950" : "bg-red-100 dark:bg-red-950"}`}>
                              {isBuy ? (
                                <ArrowDownLeft className={`h-4 w-4 text-emerald-600 dark:text-emerald-400`} />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={isBuy ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" : "border-red-500/50 text-red-600 dark:text-red-400"}
                            >
                              {isBuy ? "Buy" : "Sell"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{transfer.asset.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {reasonLabels[transfer.reason] || transfer.reason}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-mono font-semibold ${isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {isBuy ? "+" : "-"}{transfer.tokenAmount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{counterparty}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(transfer.timestamp), "MMM d, yyyy HH:mm")}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
