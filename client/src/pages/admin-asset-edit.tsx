import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Wheat,
  FileText,
  Coins,
  Save,
  User,
  Edit2,
  X,
  Check,
  History,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Asset, Token, User as UserType, NavHistory } from "@shared/schema";

type TokenWithOwner = Token & { owner: UserType };

const assetIcons = {
  real_estate: Building2,
  commodity: Wheat,
  loan: FileText,
};

export default function AdminAssetEditPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [navPrice, setNavPrice] = useState("");
  const [reason, setReason] = useState("");
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const { data: assetData, isLoading } = useQuery<{ asset: Asset; tokens: TokenWithOwner[] }>({
    queryKey: [`/api/admin/assets/${id}/tokens`],
    enabled: !!id,
  });

  const navHistoryKey = id ? `/api/analytics/asset/${id}/nav-history` : null;
  const { data: navHistory } = useQuery<NavHistory[]>({
    queryKey: [navHistoryKey],
    enabled: !!id && !!navHistoryKey,
  });

  const updateNavMutation = useMutation({
    mutationFn: async (data: { navPrice: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/assets/${id}/nav`, data);
    },
    onSuccess: () => {
      toast({ title: "Token value updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/assets/${id}/tokens`] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/analytics/asset/${id}/nav-history`] });
      setNavPrice("");
      setReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTokenMutation = useMutation({
    mutationFn: async (data: { tokenId: string; amount: number; reason: string }) => {
      return await apiRequest("PATCH", `/api/admin/tokens/${data.tokenId}`, { amount: data.amount, reason: data.reason });
    },
    onSuccess: () => {
      toast({ title: "Token amount updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/assets/${id}/tokens`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
      setEditingTokenId(null);
      setEditAmount("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleUpdateNav = () => {
    if (!navPrice || isNaN(parseFloat(navPrice))) {
      toast({ title: "Please enter a valid price", variant: "destructive" });
      return;
    }
    updateNavMutation.mutate({ navPrice, reason: reason || "Admin revaluation" });
  };

  const handleUpdateToken = (tokenId: string) => {
    const amount = parseInt(editAmount);
    if (isNaN(amount) || amount < 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    updateTokenMutation.mutate({ tokenId, amount, reason: "Admin adjustment" });
  };

  const startEdit = (token: TokenWithOwner) => {
    setEditingTokenId(token.id);
    setEditAmount(token.amount.toString());
  };

  const cancelEdit = () => {
    setEditingTokenId(null);
    setEditAmount("");
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/tokens">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!assetData?.asset) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Asset not found</p>
        <Link href="/admin/tokens">
          <Button variant="outline" className="mt-4">Back to Assets</Button>
        </Link>
      </div>
    );
  }

  const { asset, tokens } = assetData;
  const AssetIcon = assetIcons[asset.type] || Building2;
  const totalDistributed = asset.totalSupply - asset.remainingSupply;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/tokens">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <AssetIcon className="h-8 w-8" />
            {asset.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            Edit token value and distribution
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Value</CardTitle>
            <CardDescription>Token price per unit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-current-nav">
              ${parseFloat(asset.navPrice).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Supply</CardTitle>
            <CardDescription>Maximum tokens available</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-supply">
              {asset.totalSupply.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribution</CardTitle>
            <CardDescription>Tokens allocated vs remaining</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-distribution">
              {totalDistributed.toLocaleString()} / {asset.totalSupply.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {asset.remainingSupply.toLocaleString()} remaining
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Update Token Value
          </CardTitle>
          <CardDescription>
            Change the price per token. This will be reflected in all user portfolios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="navPrice">New Price (USD)</Label>
              <Input
                id="navPrice"
                type="number"
                step="0.01"
                placeholder="e.g., 150.00"
                value={navPrice}
                onChange={(e) => setNavPrice(e.target.value)}
                data-testid="input-nav-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., Quarterly revaluation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-testid="input-reason"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleUpdateNav} 
                disabled={updateNavMutation.isPending}
                className="gap-2 w-full"
                data-testid="button-update-nav"
              >
                <Save className="h-4 w-4" />
                {updateNavMutation.isPending ? "Updating..." : "Update Value"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Token Value History
            </CardTitle>
            <CardDescription>
              Historical record of all token value changes
            </CardDescription>
          </div>
          {navHistory && navHistory.length > 0 && (
            <Badge variant="secondary">{navHistory.length} entries</Badge>
          )}
        </CardHeader>
        <CardContent>
          {!navHistory || navHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No value history recorded yet.
            </div>
          ) : (
            <div className="rounded-md border max-h-80 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {navHistory
                    .slice()
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((entry, idx, arr) => {
                      const currentPrice = parseFloat(entry.navPrice);
                      const prevEntry = arr[idx + 1];
                      const prevPrice = prevEntry ? parseFloat(prevEntry.navPrice) : currentPrice;
                      const change = currentPrice - prevPrice;
                      const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;
                      
                      return (
                        <TableRow key={entry.id} data-testid={`nav-history-row-${entry.id}`}>
                          <TableCell className="text-sm">
                            {format(new Date(entry.timestamp), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            ${currentPrice.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {idx < arr.length - 1 && (
                              <div className="flex items-center gap-1">
                                {change > 0 ? (
                                  <>
                                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                                    <span className="text-sm text-emerald-600">
                                      +${change.toFixed(2)} (+{changePercent.toFixed(1)}%)
                                    </span>
                                  </>
                                ) : change < 0 ? (
                                  <>
                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                    <span className="text-sm text-red-600">
                                      ${change.toFixed(2)} ({changePercent.toFixed(1)}%)
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">No change</span>
                                )}
                              </div>
                            )}
                            {idx === arr.length - 1 && (
                              <Badge variant="outline" className="text-xs">Initial</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                            {entry.reason || "—"}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Token Distribution
          </CardTitle>
          <CardDescription>
            Manage how tokens are distributed among investors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tokens have been distributed yet.
              <div className="mt-2">
                <Link href="/admin/tokens">
                  <Button variant="outline" size="sm">Go to Token Management</Button>
                </Link>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id} data-testid={`row-token-${token.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {token.owner.name}
                        {token.frozen && (
                          <Badge variant="outline" className="text-amber-600">Frozen</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {token.owner.email}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingTokenId === token.id ? (
                        <Input
                          type="number"
                          min="0"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-24 text-right ml-auto"
                          data-testid="input-edit-amount"
                        />
                      ) : (
                        <span data-testid={`text-amount-${token.id}`}>
                          {token.amount.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(token.amount * parseFloat(asset.navPrice)).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingTokenId === token.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleUpdateToken(token.id)}
                            disabled={updateTokenMutation.isPending}
                            data-testid="button-confirm-edit"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={cancelEdit}
                            data-testid="button-cancel-edit"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(token)}
                          data-testid={`button-edit-${token.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
