import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import {
  Package,
  Plus,
  Building2,
  Wheat,
  FileText,
  Loader2,
  Edit,
  Coins,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { AssetTypeBadge } from "@/components/status-badge";
import { CardSkeleton } from "@/components/loading-states";
import { EmptyAssets } from "@/components/empty-states";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Asset } from "@shared/schema";

const assetIcons = {
  real_estate: Building2,
  commodity: Wheat,
  loan: FileText,
};

const createAssetSchema = z.object({
  type: z.enum(["real_estate", "commodity", "loan"], {
    required_error: "Please select an asset type",
  }),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  totalSupply: z.coerce.number().int().positive("Supply must be positive"),
  navPrice: z.coerce.number().positive("Price must be positive"),
});

type CreateAssetForm = z.infer<typeof createAssetSchema>;

export default function AdminAssetsPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: assets, isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const form = useForm<CreateAssetForm>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      type: undefined,
      title: "",
      description: "",
      totalSupply: 1000,
      navPrice: 100,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateAssetForm) => {
      return await apiRequest("POST", "/api/assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Asset created",
        description: "The new asset has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateAssetForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage tokenized real-world assets
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-asset">
              <Plus className="h-4 w-4" />
              Create Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Asset</DialogTitle>
              <DialogDescription>
                Define a new real-world asset for tokenization
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-asset-type">
                            <SelectValue placeholder="Select asset type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="real_estate">Real Estate</SelectItem>
                          <SelectItem value="commodity">Commodity</SelectItem>
                          <SelectItem value="loan">Loan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Downtown Office Building"
                          data-testid="input-asset-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the asset..."
                          className="resize-none"
                          data-testid="input-asset-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalSupply"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Token Supply</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            data-testid="input-total-supply"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Number of tokens to create</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="navPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NAV Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min={0.01}
                            data-testid="input-nav-price"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Price per token</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-asset"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Asset"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : !assets || assets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyAssets />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => {
            const Icon = assetIcons[asset.type];
            const distributedPercent =
              ((asset.totalSupply - asset.remainingSupply) / asset.totalSupply) * 100;
            const totalValue = asset.totalSupply * parseFloat(asset.navPrice);

            return (
              <Card key={asset.id} data-testid={`asset-card-${asset.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-muted p-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{asset.title}</CardTitle>
                        <CardDescription className="mt-1">
                          <AssetTypeBadge type={asset.type} />
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {asset.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {asset.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">NAV Price</p>
                      <p className="font-semibold font-mono">
                        ${parseFloat(asset.navPrice).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Value</p>
                      <p className="font-semibold font-mono">
                        ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Token Distribution</span>
                      <span className="font-medium">
                        {asset.totalSupply - asset.remainingSupply} / {asset.totalSupply}
                      </span>
                    </div>
                    <Progress value={distributedPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {asset.remainingSupply} tokens available to mint
                    </p>
                  </div>

                  <Link href={`/admin/tokens?assetId=${asset.id}`}>
                    <Button variant="outline" className="w-full gap-2" data-testid={`button-manage-tokens-${asset.id}`}>
                      <Coins className="h-4 w-4" />
                      Manage Tokens
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
