import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShoppingCart,
  Plus,
  Building,
  Building2,
  Wheat,
  FileText,
  Loader2,
  AlertCircle,
  X,
  TrendingUp,
  BarChart3,
  Send,
  Package,
  DollarSign,
  Lock,
  Percent,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetTypeBadge, OrderStatusBadge, ApprovalStatusBadge, TokenRequestStatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/loading-states";
import { EmptyMarketplace } from "@/components/empty-states";
import { PriceChart } from "@/components/price-chart";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth-store";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Order, Asset, User, Token } from "@shared/schema";

interface MarketData {
  assetId: string;
  asset: Asset;
  bestBid: string | null;
  bestAsk: string | null;
  lastPrice: string | null;
  volume24h: number;
}

type OrderWithDetails = Order & { seller: User; asset: Asset };
type TokenWithAsset = Token & { asset: Asset };

const assetIcons = {
  real_estate: Building2,
  commodity: Wheat,
  loan: FileText,
};

const createOrderSchema = z.object({
  assetId: z.string().min(1, "Select an asset"),
  tokenAmount: z.coerce.number().int().positive("Amount must be positive"),
  pricePerToken: z.coerce.number().positive("Price must be positive"),
});

type CreateOrderForm = z.infer<typeof createOrderSchema>;

const tokenRequestSchema = z.object({
  assetId: z.string().min(1, "Select an asset"),
  amount: z.coerce.number().int().positive("Amount must be positive"),
});

type TokenRequestForm = z.infer<typeof tokenRequestSchema>;

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
}

export default function MarketplacePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  const { data: openOrders, isLoading: ordersLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/marketplace/orders"],
  });

  const { data: myOrders, isLoading: myOrdersLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/marketplace/my-orders"],
  });

  const { data: myTokens } = useQuery<TokenWithAsset[]>({
    queryKey: ["/api/tokens/my-portfolio"],
  });

  const { data: marketData } = useQuery<MarketData[]>({
    queryKey: ["/api/market-data"],
  });

  const { data: allAssets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: myTokenRequests, isLoading: tokenRequestsLoading } = useQuery<TokenRequest[]>({
    queryKey: ["/api/marketplace/my-token-requests"],
  });

  const [selectedAssetForChart, setSelectedAssetForChart] = useState<string | null>(null);

  const form = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      assetId: "",
      tokenAmount: 0,
      pricePerToken: 0,
    },
  });

  const requestForm = useForm<TokenRequestForm>({
    resolver: zodResolver(tokenRequestSchema),
    defaultValues: {
      assetId: "",
      amount: 0,
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: CreateOrderForm) => {
      return await apiRequest("POST", "/api/marketplace/order", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/my-portfolio"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Order created",
        description: "Your sell order has been submitted and is pending admin approval.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fillOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("POST", `/api/marketplace/order/${orderId}/fill`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/my-portfolio"] });
      setBuyDialogOpen(false);
      setSelectedOrder(null);
      toast({
        title: "Order filled",
        description: "Tokens have been transferred to your portfolio.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to fill order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("POST", `/api/marketplace/order/${orderId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/my-portfolio"] });
      toast({
        title: "Order cancelled",
        description: "Your sell order has been cancelled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const tokenRequestMutation = useMutation({
    mutationFn: async (data: TokenRequestForm) => {
      return await apiRequest("POST", "/api/marketplace/token-request", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-token-requests"] });
      setRequestDialogOpen(false);
      requestForm.reset();
      toast({
        title: "Request submitted",
        description: "Your token request has been submitted and is pending admin approval.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitOrder = (data: CreateOrderForm) => {
    createOrderMutation.mutate(data);
  };

  const onSubmitRequest = (data: TokenRequestForm) => {
    tokenRequestMutation.mutate(data);
  };

  const handleBuyClick = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setBuyDialogOpen(true);
  };

  const handleConfirmBuy = () => {
    if (selectedOrder) {
      fillOrderMutation.mutate(selectedOrder.id);
    }
  };

  const orders = openOrders || [];
  const userOrders = myOrders || [];
  const tokens = myTokens || [];
  const assets = allAssets || [];
  const tokenRequests = myTokenRequests || [];
  const kycApproved = user?.kycStatus === "APPROVED";
  const isFrozen = user?.isFrozen;

  const selectedAsset = tokens.find((t) => t.assetId === form.watch("assetId"));
  const maxTokens = selectedAsset?.amount || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Buy and sell tokens from other verified investors
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                disabled={!kycApproved || isFrozen || assets.length === 0}
                data-testid="button-request-tokens"
              >
                <Send className="h-4 w-4" />
                Request Tokens
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Tokens</DialogTitle>
                <DialogDescription>
                  Submit a request to purchase tokens. An admin will review and mint tokens to your account.
                </DialogDescription>
              </DialogHeader>
              <Form {...requestForm}>
                <form onSubmit={requestForm.handleSubmit(onSubmitRequest)} className="space-y-4">
                  <FormField
                    control={requestForm.control}
                    name="assetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-request-asset">
                              <SelectValue placeholder="Select an asset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assets.filter(a => a.remainingSupply > 0).map((asset) => (
                              <SelectItem key={asset.id} value={asset.id}>
                                {asset.title} ({asset.remainingSupply} available)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Tokens</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="Enter amount"
                            data-testid="input-request-amount"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={tokenRequestMutation.isPending} data-testid="button-submit-request">
                      {tokenRequestMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="gap-2"
                disabled={!kycApproved || isFrozen || tokens.length === 0}
                data-testid="button-create-order"
              >
                <Plus className="h-4 w-4" />
                Create Sell Order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Sell Order</DialogTitle>
              <DialogDescription>
                List your tokens for sale on the marketplace
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitOrder)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-asset">
                            <SelectValue placeholder="Select an asset to sell" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tokens.map((token) => (
                            <SelectItem key={token.assetId} value={token.assetId}>
                              {token.asset.title} ({token.amount} available)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tokenAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Tokens</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={maxTokens}
                          placeholder="Enter amount"
                          data-testid="input-token-amount"
                          {...field}
                        />
                      </FormControl>
                      {maxTokens > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Max: {maxTokens} tokens
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricePerToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Token ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          data-testid="input-price"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={createOrderMutation.isPending}
                    data-testid="button-submit-order"
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Order"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {(!kycApproved || isFrozen) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!kycApproved
              ? "Your KYC verification is pending. You cannot trade until approved."
              : "Your account is frozen. You cannot trade until an administrator unfreezes it."}
          </AlertDescription>
        </Alert>
      )}

      {/* Market Data Summary */}
      {marketData && marketData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketData.map((data) => {
              const Icon = assetIcons[data.asset.type];
              const tokenValue = parseFloat(data.asset.navPrice);
              const minInvestment = data.asset.minimumInvestment ? parseFloat(data.asset.minimumInvestment) : 100;
              const lockInDays = data.asset.lockInPeriodDays ?? 0;
              const expectedReturn = data.asset.expectedReturnPercent ? parseFloat(data.asset.expectedReturnPercent) : 0;
              
              return (
                <Card key={data.assetId} className="hover-elevate cursor-pointer" onClick={() => setSelectedAssetForChart(data.assetId === selectedAssetForChart ? null : data.assetId)} data-testid={`market-card-${data.assetId}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-muted p-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{data.asset.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <AssetTypeBadge type={data.asset.type} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Token Value</p>
                          <p className="font-semibold font-mono" data-testid={`token-value-${data.assetId}`}>${tokenValue.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Min Investment</p>
                          <p className="font-semibold font-mono" data-testid={`min-investment-${data.assetId}`}>${minInvestment.toFixed(0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Lock-in Period</p>
                          <p className="font-semibold" data-testid={`lock-in-${data.assetId}`}>
                            {lockInDays === 0 ? "None" : lockInDays >= 365 ? `${Math.floor(lockInDays / 365)}y` : lockInDays >= 30 ? `${Math.floor(lockInDays / 30)}mo` : `${lockInDays}d`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Expected Return</p>
                          <p className="font-semibold text-emerald-600" data-testid={`expected-return-${data.assetId}`}>
                            {expectedReturn > 0 ? `${expectedReturn.toFixed(1)}%` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Best Ask: {data.bestAsk ? `$${parseFloat(data.bestAsk).toFixed(2)}` : "—"}</span>
                      <span>24h Vol: {data.volume24h.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {selectedAssetForChart && (
            <div className="mt-4">
              <PriceChart 
                assetId={selectedAssetForChart} 
                assetTitle={marketData.find(d => d.assetId === selectedAssetForChart)?.asset.title || "Asset"} 
              />
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse" data-testid="tab-browse">
            Browse Orders
          </TabsTrigger>
          <TabsTrigger value="my-orders" data-testid="tab-my-orders">
            My Orders
          </TabsTrigger>
          <TabsTrigger value="my-requests" data-testid="tab-my-requests">
            My Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {ordersLoading ? (
            <TableSkeleton rows={5} />
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyMarketplace />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map((order) => {
                const Icon = assetIcons[order.asset.type];
                const totalPrice = order.tokenAmount * parseFloat(order.pricePerToken);
                const isOwn = order.sellerId === user?.id;

                return (
                  <Card key={order.id} data-testid={`order-${order.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-muted p-2">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{order.asset.title}</CardTitle>
                            <CardDescription className="mt-1">
                              <AssetTypeBadge type={order.asset.type} />
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-semibold font-mono">{order.tokenAmount} tokens</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Price/Token</p>
                          <p className="font-semibold font-mono">${parseFloat(order.pricePerToken).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold font-mono">${totalPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Seller</p>
                          <p className="font-medium truncate">{order.seller.name}</p>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        disabled={isOwn || !kycApproved || isFrozen}
                        onClick={() => handleBuyClick(order)}
                        data-testid={`button-buy-${order.id}`}
                      >
                        {isOwn ? "Your Order" : "Buy Now"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-orders" className="space-y-6">
          {myOrdersLoading ? (
            <TableSkeleton rows={5} />
          ) : userOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No orders yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Create a sell order to list your tokens on the marketplace.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {userOrders.map((order) => {
                const Icon = assetIcons[order.asset.type];
                const totalPrice = order.tokenAmount * parseFloat(order.pricePerToken);

                return (
                  <Card key={order.id} data-testid={`my-order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="rounded-md bg-muted p-2">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{order.asset.title}</p>
                              <OrderStatusBadge status={order.status} />
                              {order.status === "OPEN" && (
                                <ApprovalStatusBadge status={order.approvalStatus} />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {order.tokenAmount} tokens @ ${parseFloat(order.pricePerToken).toFixed(2)} = ${totalPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {order.status === "OPEN" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelOrderMutation.mutate(order.id)}
                            disabled={cancelOrderMutation.isPending}
                            data-testid={`button-cancel-${order.id}`}
                          >
                            {cancelOrderMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="mr-1 h-4 w-4" />
                                Cancel
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-requests" className="space-y-6">
          {tokenRequestsLoading ? (
            <TableSkeleton rows={5} />
          ) : tokenRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Send className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No token requests yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Request tokens from assets to have them minted to your account.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tokenRequests.map((request) => {
                const asset = assets.find(a => a.id === request.assetId);
                const Icon = asset ? assetIcons[asset.type] : Building;

                return (
                  <Card key={request.id} data-testid={`token-request-${request.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="rounded-md bg-muted p-2">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{asset?.title || "Unknown Asset"}</p>
                              <TokenRequestStatusBadge status={request.status} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Requested {request.amount} tokens
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase tokens from another investor
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset</span>
                  <span className="font-medium">{selectedOrder.asset.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tokens</span>
                  <span className="font-mono font-medium">{selectedOrder.tokenAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per Token</span>
                  <span className="font-mono font-medium">${parseFloat(selectedOrder.pricePerToken).toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-medium">Total Cost</span>
                  <span className="font-mono font-semibold">
                    ${(selectedOrder.tokenAmount * parseFloat(selectedOrder.pricePerToken)).toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                By confirming, the tokens will be transferred to your portfolio.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBuy}
              disabled={fillOrderMutation.isPending}
              data-testid="button-confirm-buy"
            >
              {fillOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Purchase"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
