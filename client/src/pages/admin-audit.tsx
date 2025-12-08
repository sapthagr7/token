import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Filter,
  Building2,
  Wheat,
  FileText,
  ArrowRight,
  Coins,
  UserCheck,
  Lock,
  Unlock,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/loading-states";
import { EmptyAuditLog } from "@/components/empty-states";
import { cn } from "@/lib/utils";
import type { Transfer, Asset, User } from "@shared/schema";

type TransferWithDetails = Transfer & { 
  asset: Asset; 
  fromUser?: User; 
  toUser?: User;
};

const assetIcons = {
  real_estate: Building2,
  commodity: Wheat,
  loan: FileText,
};

const reasonConfig = {
  MINT: {
    label: "Mint",
    icon: Coins,
    className: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
  },
  TRANSFER: {
    label: "Transfer",
    icon: ArrowRight,
    className: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
  },
  TRADE: {
    label: "Trade",
    icon: ShoppingCart,
    className: "border-purple-500/50 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
  },
  FREEZE: {
    label: "Freeze",
    icon: Lock,
    className: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
  },
  UNFREEZE: {
    label: "Unfreeze",
    icon: Unlock,
    className: "border-sky-500/50 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30",
  },
  ADMIN_REVOKE: {
    label: "Revoke",
    icon: Trash2,
    className: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
  },
};

export default function AdminAuditPage() {
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  const { data: transfers, isLoading } = useQuery<TransferWithDetails[]>({
    queryKey: ["/api/transfers"],
  });

  const filteredTransfers = (transfers || []).filter((t) => {
    return reasonFilter === "all" || t.reason === reasonFilter;
  });

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  };

  const getDescription = (transfer: TransferWithDetails) => {
    switch (transfer.reason) {
      case "MINT":
        return `${transfer.tokenAmount} tokens minted to ${transfer.toUser?.name || "user"}`;
      case "TRANSFER":
        return `${transfer.tokenAmount} tokens transferred from ${transfer.fromUser?.name || "user"} to ${transfer.toUser?.name || "user"}`;
      case "TRADE":
        return `${transfer.tokenAmount} tokens traded from ${transfer.fromUser?.name || "seller"} to ${transfer.toUser?.name || "buyer"}`;
      case "FREEZE":
        return `${transfer.tokenAmount} tokens frozen for ${transfer.fromUser?.name || "user"}`;
      case "UNFREEZE":
        return `${transfer.tokenAmount} tokens unfrozen for ${transfer.toUser?.name || "user"}`;
      case "ADMIN_REVOKE":
        return `${transfer.tokenAmount} tokens revoked from ${transfer.fromUser?.name || "user"}`;
      default:
        return `${transfer.tokenAmount} tokens`;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground mt-1">
          Complete history of all token transfers and compliance actions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Transfer History</CardTitle>
              <CardDescription>
                {transfers?.length || 0} total transactions
              </CardDescription>
            </div>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-reason-filter">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="MINT">Mint</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
                <SelectItem value="TRADE">Trade</SelectItem>
                <SelectItem value="FREEZE">Freeze</SelectItem>
                <SelectItem value="UNFREEZE">Unfreeze</SelectItem>
                <SelectItem value="ADMIN_REVOKE">Revoke</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={8} />
          ) : filteredTransfers.length === 0 ? (
            <EmptyAuditLog />
          ) : (
            <div className="space-y-4">
              {filteredTransfers.map((transfer) => {
                const AssetIcon = assetIcons[transfer.asset.type];
                const config = reasonConfig[transfer.reason];
                const ReasonIcon = config.icon;

                return (
                  <div
                    key={transfer.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                    data-testid={`audit-row-${transfer.id}`}
                  >
                    <div className="hidden sm:flex h-10 w-10 rounded-full bg-background items-center justify-center flex-shrink-0">
                      <ReasonIcon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn("gap-1", config.className)}
                            >
                              <ReasonIcon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                            <span className="font-medium">{transfer.asset.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getDescription(transfer)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-mono font-semibold">
                            {transfer.tokenAmount.toLocaleString()} tokens
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transfer.timestamp)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                        {transfer.fromUser && (
                          <div className="flex items-center gap-1">
                            <span>From:</span>
                            <span className="font-medium text-foreground">
                              {transfer.fromUser.name}
                            </span>
                          </div>
                        )}
                        {transfer.fromUser && transfer.toUser && (
                          <ArrowRight className="h-4 w-4" />
                        )}
                        {transfer.toUser && (
                          <div className="flex items-center gap-1">
                            <span>To:</span>
                            <span className="font-medium text-foreground">
                              {transfer.toUser.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
