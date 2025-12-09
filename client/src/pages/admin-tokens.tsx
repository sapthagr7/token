import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearch, Link } from "wouter";
import {
  Coins,
  Plus,
  Trash2,
  Building2,
  Wheat,
  FileText,
  Loader2,
  AlertTriangle,
  Edit2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetTypeBadge, FrozenBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/loading-states";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Token, Asset, User } from "@shared/schema";

type TokenWithDetails = Token & { asset: Asset; owner: User };

const assetIcons = {
  real_estate: Building2,
  commodity: Wheat,
  loan: FileText,
};

const mintSchema = z.object({
  assetId: z.string().min(1, "Select an asset"),
  userId: z.string().min(1, "Select a user"),
  amount: z.coerce.number().int().positive("Amount must be positive"),
});

type MintForm = z.infer<typeof mintSchema>;

export default function AdminTokensPage() {
  const { toast } = useToast();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedAssetId = params.get("assetId") || "";

  const [mintDialogOpen, setMintDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenWithDetails | null>(null);
  const [revokeAmount, setRevokeAmount] = useState("");

  const { data: tokens, isLoading: tokensLoading } = useQuery<TokenWithDetails[]>({
    queryKey: ["/api/admin/tokens"],
  });

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const form = useForm<MintForm>({
    resolver: zodResolver(mintSchema),
    defaultValues: {
      assetId: preselectedAssetId,
      userId: "",
      amount: 100,
    },
  });

  const mintMutation = useMutation({
    mutationFn: async (data: MintForm) => {
      return await apiRequest("POST", "/api/tokens/mint", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tokens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setMintDialogOpen(false);
      form.reset({ assetId: preselectedAssetId, userId: "", amount: 100 });
      toast({
        title: "Tokens minted",
        description: "Tokens have been minted and assigned to the user.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mint tokens",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ tokenId, amount }: { tokenId: string; amount: number }) => {
      return await apiRequest("POST", "/api/tokens/revoke", { tokenId, amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tokens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setRevokeDialogOpen(false);
      setSelectedToken(null);
      setRevokeAmount("");
      toast({
        title: "Tokens revoked",
        description: "Tokens have been revoked from the user.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to revoke tokens",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitMint = (data: MintForm) => {
    mintMutation.mutate(data);
  };

  const handleRevokeClick = (token: TokenWithDetails) => {
    setSelectedToken(token);
    setRevokeAmount(token.amount.toString());
    setRevokeDialogOpen(true);
  };

  const handleConfirmRevoke = () => {
    if (selectedToken) {
      revokeMutation.mutate({
        tokenId: selectedToken.id,
        amount: parseInt(revokeAmount) || 0,
      });
    }
  };

  const selectedAsset = assets?.find((a) => a.id === form.watch("assetId"));
  const maxMintable = selectedAsset?.remainingSupply || 0;
  const approvedUsers = users?.filter((u) => u.kycStatus === "APPROVED" && u.role === "INVESTOR");

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Token Management</h1>
          <p className="text-muted-foreground mt-1">
            Mint and revoke tokens for verified investors
          </p>
        </div>
        <Dialog open={mintDialogOpen} onOpenChange={setMintDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-mint-tokens">
              <Plus className="h-4 w-4" />
              Mint Tokens
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mint New Tokens</DialogTitle>
              <DialogDescription>
                Mint tokens from an asset's supply and assign to a user
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitMint)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="assetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-mint-asset">
                            <SelectValue placeholder="Select an asset" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assets?.map((asset) => (
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
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-mint-user">
                            <SelectValue placeholder="Select a verified user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {approvedUsers?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only KYC-approved investors are shown
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={maxMintable}
                          data-testid="input-mint-amount"
                          {...field}
                        />
                      </FormControl>
                      {maxMintable > 0 && (
                        <FormDescription>
                          Max: {maxMintable} tokens available
                        </FormDescription>
                      )}
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
                    disabled={mintMutation.isPending}
                    data-testid="button-confirm-mint"
                  >
                    {mintMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Minting...
                      </>
                    ) : (
                      "Mint Tokens"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Token Holdings</CardTitle>
          <CardDescription>
            View and manage token ownership across all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokensLoading ? (
            <TableSkeleton rows={5} />
          ) : !tokens || tokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Coins className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No tokens minted</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Mint tokens to users to start distributing asset ownership.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => {
                    const Icon = assetIcons[token.asset.type];
                    const value = token.amount * parseFloat(token.asset.navPrice);

                    return (
                      <TableRow key={token.id} data-testid={`token-row-${token.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="rounded-md bg-muted p-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{token.asset.title}</p>
                              <AssetTypeBadge type={token.asset.type} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{token.owner.name}</p>
                            <p className="text-sm text-muted-foreground">{token.owner.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {token.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono">
                          ${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {token.frozen ? (
                            <FrozenBadge isFrozen={true} />
                          ) : (
                            <span className="text-sm text-muted-foreground">Active</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/admin/assets/${token.asset.id}/edit`}>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`button-edit-${token.id}`}
                              >
                                <Edit2 className="mr-1 h-4 w-4" />
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRevokeClick(token)}
                              data-testid={`button-revoke-${token.id}`}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Revoke
                            </Button>
                          </div>
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

      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revoke Tokens
            </DialogTitle>
            <DialogDescription>
              This action will permanently remove tokens from the user's portfolio
            </DialogDescription>
          </DialogHeader>
          {selectedToken && (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This is an administrative action that will be logged in the audit trail.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset</span>
                  <span className="font-medium">{selectedToken.asset.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-medium">{selectedToken.owner.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="font-mono font-medium">{selectedToken.amount} tokens</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Amount to Revoke</label>
                <Input
                  type="number"
                  min={1}
                  max={selectedToken.amount}
                  value={revokeAmount}
                  onChange={(e) => setRevokeAmount(e.target.value)}
                  data-testid="input-revoke-amount"
                />
                <p className="text-sm text-muted-foreground">
                  Max: {selectedToken.amount} tokens
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRevoke}
              disabled={revokeMutation.isPending || !revokeAmount}
              data-testid="button-confirm-revoke"
            >
              {revokeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Tokens"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
