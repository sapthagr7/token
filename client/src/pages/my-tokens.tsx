import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Wheat,
  FileText,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssetTypeBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth-store";
import type { Token, Asset, NavHistory } from "@shared/schema";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

type TokenWithAsset = Token & { asset: Asset };

const sellOrderSchema = z.object({
  tokenAmount: z.coerce.number().int("Must be a whole number").min(1, "Must sell at least 1 token"),
  pricePerToken: z.coerce.number().min(0.01, "Price must be at least $0.01"),
});

type SellOrderForm = z.infer<typeof sellOrderSchema>;

const assetIcons = {
  real_estate: Building2,
  commodity: Wheat,
  loan: FileText,
};

function TokenHistoryChart({ assetId }: { assetId: string }) {
  const { data: history, isLoading } = useQuery<NavHistory[]>({
    queryKey: [`/api/analytics/asset/${assetId}/nav-history`],
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!history || history.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
        No price history available yet
      </div>
    );
  }

  const chartData = history
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((entry) => ({
      date: format(new Date(entry.timestamp), "MMM d"),
      price: parseFloat(entry.navPrice),
      fullDate: format(new Date(entry.timestamp), "MMM d, yyyy h:mm a"),
    }));

  const firstPrice = chartData.length > 0 ? chartData[0].price : 0;
  const lastPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {priceChange > 0 ? (
          <>
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600">
              +${priceChange.toFixed(2)} (+{priceChangePercent.toFixed(1)}%)
            </span>
          </>
        ) : priceChange < 0 ? (
          <>
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">
              ${priceChange.toFixed(2)} ({priceChangePercent.toFixed(1)}%)
            </span>
          </>
        ) : (
          <>
            <Minus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No change</span>
          </>
        )}
        <span className="text-xs text-muted-foreground">since first record</span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
              width={50}
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, "NAV Price"]}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.fullDate || ""
              }
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={priceChange >= 0 ? "#16a34a" : "#dc2626"}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function MyTokensPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenWithAsset | null>(null);

  const { data: portfolio, isLoading } = useQuery<TokenWithAsset[]>({
    queryKey: ["/api/tokens/my-portfolio"],
  });

  const form = useForm<SellOrderForm>({
    resolver: zodResolver(sellOrderSchema),
    defaultValues: {
      tokenAmount: 1,
      pricePerToken: 0,
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: { assetId: string; tokenAmount: number; pricePerToken: number }) => {
      return await apiRequest("POST", "/api/marketplace/order", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/my-portfolio"] });
      setSellDialogOpen(false);
      setSelectedToken(null);
      form.reset();
      toast({
        title: "Sell order created",
        description: "Your sell order has been submitted and is pending admin approval.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create sell order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSellClick = (token: TokenWithAsset) => {
    setSelectedToken(token);
    form.setValue("tokenAmount", 1);
    form.setValue("pricePerToken", parseFloat(token.asset.navPrice));
    setSellDialogOpen(true);
  };

  const onSubmitSellOrder = (data: SellOrderForm) => {
    if (!selectedToken) return;
    if (data.tokenAmount > selectedToken.amount) {
      toast({
        title: "Invalid amount",
        description: `You only have ${selectedToken.amount} tokens available to sell.`,
        variant: "destructive",
      });
      return;
    }
    if (data.tokenAmount <= 0 || data.pricePerToken <= 0) {
      toast({
        title: "Invalid values",
        description: "Token amount and price must be greater than zero.",
        variant: "destructive",
      });
      return;
    }
    createOrderMutation.mutate({
      assetId: selectedToken.assetId,
      tokenAmount: data.tokenAmount,
      pricePerToken: data.pricePerToken,
    });
  };

  const kycApproved = user?.kycStatus === "APPROVED";
  const isFrozen = user?.isFrozen;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const tokens = portfolio || [];

  const totalValue = tokens.reduce((sum, token) => {
    const price = parseFloat(token.asset.navPrice);
    return sum + token.amount * price;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Tokens</h1>
            <p className="text-muted-foreground">
              View all your token holdings and historical value
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1 px-3">
            Total Value: ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </Badge>
        </div>
      </div>

      {tokens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tokens yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start investing by browsing the marketplace
            </p>
            <Link href="/marketplace">
              <Button data-testid="button-browse-marketplace">Browse Marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tokens.map((token) => {
            const Icon = assetIcons[token.asset.type];
            const value = token.amount * parseFloat(token.asset.navPrice);
            const pricePerToken = parseFloat(token.asset.navPrice);

            return (
              <Card key={token.id} data-testid={`token-detail-card-${token.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-muted p-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{token.asset.title}</CardTitle>
                        <CardDescription className="mt-1">
                          <AssetTypeBadge type={token.asset.type} />
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {token.frozen && (
                        <Badge variant="destructive">Frozen</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSellClick(token)}
                        disabled={!kycApproved || isFrozen || token.frozen || token.amount === 0}
                        data-testid={`button-sell-token-${token.id}`}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Sell
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Tokens Owned</p>
                      <p className="text-lg font-semibold font-mono">
                        {token.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Value</p>
                      <p className="text-lg font-semibold font-mono">
                        ${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">NAV Price</p>
                      <p className="font-mono">
                        ${pricePerToken.toFixed(2)}/token
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Supply</p>
                      <p className="font-mono">
                        {token.asset.totalSupply.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Price History</p>
                    <TokenHistoryChart assetId={token.assetId} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sell Dialog */}
      <Dialog open={sellDialogOpen} onOpenChange={(open) => {
        setSellDialogOpen(open);
        if (!open) {
          setSelectedToken(null);
          form.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell Tokens</DialogTitle>
            <DialogDescription>
              Create a sell order for {selectedToken?.asset.title}. Your order will be reviewed by an admin before becoming visible on the marketplace.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitSellOrder)} className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available Tokens:</span>
                  <span className="font-mono font-medium">{selectedToken?.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current NAV:</span>
                  <span className="font-mono">${parseFloat(selectedToken?.asset.navPrice || "0").toFixed(2)}/token</span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="tokenAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Tokens to Sell</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={selectedToken?.amount || 1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-sell-token-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricePerToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Token ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0.01}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-sell-price-per-token"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-lg bg-muted p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Order Value:</span>
                  <span className="font-mono font-semibold">
                    ${(form.watch("tokenAmount") * form.watch("pricePerToken")).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSellDialogOpen(false)}
                  data-testid="button-cancel-sell"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createOrderMutation.isPending || form.watch("tokenAmount") > (selectedToken?.amount || 0)}
                  data-testid="button-confirm-sell"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Sell Order"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
