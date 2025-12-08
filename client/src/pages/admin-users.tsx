import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  Lock, 
  Unlock,
  Loader2,
  Filter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KycBadge, FrozenBadge, RoleBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/loading-states";
import { EmptyUsers } from "@/components/empty-states";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState<string>("all");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User approved", description: "KYC status has been updated to approved." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User rejected", description: "KYC status has been updated to rejected." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
    },
  });

  const freezeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/freeze`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Account frozen", description: "User can no longer make transactions." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to freeze", description: error.message, variant: "destructive" });
    },
  });

  const unfreezeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/unfreeze`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Account unfrozen", description: "User can now make transactions." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to unfreeze", description: error.message, variant: "destructive" });
    },
  });

  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesKyc = kycFilter === "all" || user.kycStatus === kycFilter;
    return matchesSearch && matchesKyc;
  });

  const isActionPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    freezeMutation.isPending ||
    unfreezeMutation.isPending;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage user accounts, KYC verification, and account freezing
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">All Users</CardTitle>
              <CardDescription>
                {users?.length || 0} registered users
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-kyc-filter">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by KYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : filteredUsers.length === 0 ? (
            <EmptyUsers />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>KYC Status</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium">
                              {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell>
                        <KycBadge status={user.kycStatus} />
                      </TableCell>
                      <TableCell>
                        {user.isFrozen ? (
                          <FrozenBadge isFrozen={true} />
                        ) : (
                          <span className="text-sm text-muted-foreground">Active</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isActionPending || user.role === "ADMIN"}
                              data-testid={`button-actions-${user.id}`}
                            >
                              {isActionPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Actions"
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.kycStatus === "PENDING" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => approveMutation.mutate(user.id)}
                                  className="text-emerald-600"
                                  data-testid={`menu-approve-${user.id}`}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve KYC
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => rejectMutation.mutate(user.id)}
                                  className="text-red-600"
                                  data-testid={`menu-reject-${user.id}`}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject KYC
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {user.isFrozen ? (
                              <DropdownMenuItem
                                onClick={() => unfreezeMutation.mutate(user.id)}
                                data-testid={`menu-unfreeze-${user.id}`}
                              >
                                <Unlock className="mr-2 h-4 w-4" />
                                Unfreeze Account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => freezeMutation.mutate(user.id)}
                                className="text-red-600"
                                data-testid={`menu-freeze-${user.id}`}
                              >
                                <Lock className="mr-2 h-4 w-4" />
                                Freeze Account
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
