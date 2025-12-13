import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Search,
  Eye,
  History,
  Crown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Shield
} from "lucide-react";
import { format } from "date-fns";

interface OrganizationStats {
  totalOrganizations: number;
  organizationsByPlan: Record<string, number>;
  organizationsByStatus: Record<string, number>;
  totalUsers: number;
  legacyOrganizations: number;
  mrr: number;
  activeTrials: number;
  churnedThisMonth: number;
}

interface OrganizationWithDetails {
  id: string;
  name: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  billingInterval: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: string;
  pendingDowngradePlan: string | null;
  maxUsers: number;
  extraSeats: number;
  isLegacy: string;
  paymentFailedAt: string | null;
  createdAt: string;
  userCount: number;
  adminEmails: string[];
}

interface BillingHistoryItem {
  id: string;
  organizationId: string;
  eventType: string;
  description: string;
  amountCents: number | null;
  currency: string;
  planBefore: string | null;
  planAfter: string | null;
  createdAt: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function getPlanBadgeColor(plan: string): string {
  switch (plan) {
    case 'starter': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    case 'leaderpro': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'team': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'legacy': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'trialing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'past_due': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'canceled': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    case 'suspended': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'trialing': return <Clock className="h-4 w-4 text-blue-500" />;
    case 'past_due': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'canceled': return <XCircle className="h-4 w-4 text-gray-500" />;
    case 'suspended': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default: return null;
  }
}

export default function SuperAdmin() {
  const { isSuperAdmin } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithDetails | null>(null);
  const [billingHistoryOrg, setBillingHistoryOrg] = useState<OrganizationWithDetails | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<OrganizationStats>({
    queryKey: ["/api/super-admin/stats"],
    enabled: isSuperAdmin(),
  });

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<OrganizationWithDetails[]>({
    queryKey: ["/api/super-admin/organizations"],
    enabled: isSuperAdmin(),
  });

  const { data: billingHistory = [] } = useQuery<BillingHistoryItem[]>({
    queryKey: ["/api/super-admin/organizations", billingHistoryOrg?.id, "billing-history"],
    enabled: !!billingHistoryOrg,
  });

  const markLegacyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/super-admin/mark-legacy");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Migration Complete",
        description: data.message || "All organizations marked as legacy",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Migration Failed",
        description: error.message || "Failed to mark organizations as legacy",
        variant: "destructive",
      });
    },
  });

  if (!isSuperAdmin()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">You do not have permission to access this page. Super Admin access is required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.adminEmails || []).some(email => email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isLoading = statsLoading || orgsLoading;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Crown className="h-6 w-6 text-amber-500" />
                Super Admin Dashboard
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage all organizations, billing, and system metrics
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  disabled={markLegacyMutation.isPending}
                  data-testid="button-mark-legacy"
                >
                  {markLegacyMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <History className="h-4 w-4" />
                  )}
                  Mark All as Legacy
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark All Organizations as Legacy?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark all existing organizations as "legacy" customers with free Team-level access. 
                    This is a one-time migration for existing customers before the billing system goes live.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => markLegacyMutation.mutate()}
                    data-testid="button-confirm-mark-legacy"
                  >
                    Confirm Migration
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-mrr">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Monthly Recurring Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats?.mrr || 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    From {(stats?.totalOrganizations || 0) - (stats?.legacyOrganizations || 0)} paying orgs
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-organizations">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Organizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {Object.entries(stats?.organizationsByPlan || {}).map(([plan, count]) => (
                      <Badge key={plan} variant="secondary" className={getPlanBadgeColor(plan)}>
                        {plan}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-users">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.legacyOrganizations || 0} legacy orgs
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-trials-churn">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Trials & Churn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-lg font-bold text-blue-600">{stats?.activeTrials || 0}</div>
                      <p className="text-xs text-gray-500">Active Trials</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-600 flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" />
                        {stats?.churnedThisMonth || 0}
                      </div>
                      <p className="text-xs text-gray-500">Churned (30d)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organizations</CardTitle>
                  <CardDescription>
                    All organizations with billing and usage details
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-orgs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Billing</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrgs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No organizations match your search" : "No organizations found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrgs.map((org) => (
                        <TableRow key={org.id} data-testid={`row-org-${org.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {org.name}
                                {org.isLegacy === 'true' && (
                                  <Badge variant="outline" className="text-xs">Legacy</Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {org.adminEmails?.length > 0 ? org.adminEmails[0] : 'No admin'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPlanBadgeColor(org.subscriptionPlan)}>
                              {org.subscriptionPlan}
                            </Badge>
                            {org.billingInterval === 'annual' && (
                              <span className="ml-1 text-xs text-gray-500">(annual)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(org.subscriptionStatus)}
                              <Badge variant="secondary" className={getStatusBadgeColor(org.subscriptionStatus)}>
                                {org.subscriptionStatus}
                              </Badge>
                            </div>
                            {org.pendingDowngradePlan && (
                              <div className="text-xs text-orange-600 mt-1">
                                ↓ {org.pendingDowngradePlan}
                              </div>
                            )}
                            {org.paymentFailedAt && (
                              <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Payment failed
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {org.userCount} / {org.maxUsers + org.extraSeats}
                            </div>
                            {org.extraSeats > 0 && (
                              <div className="text-xs text-gray-500">
                                +{org.extraSeats} seats
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {org.currentPeriodEnd ? (
                              <div className="text-sm">
                                {org.cancelAtPeriodEnd === 'true' ? (
                                  <span className="text-red-600">Cancels {format(new Date(org.currentPeriodEnd), 'MMM d')}</span>
                                ) : (
                                  <span>Renews {format(new Date(org.currentPeriodEnd), 'MMM d')}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">
                              {org.createdAt ? format(new Date(org.createdAt), 'MMM d, yyyy') : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOrg(org)}
                                data-testid={`button-view-org-${org.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setBillingHistoryOrg(org)}
                                data-testid={`button-history-org-${org.id}`}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!selectedOrg} onOpenChange={() => setSelectedOrg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedOrg?.name}
            </DialogTitle>
            <DialogDescription>Organization details and configuration</DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Subscription</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getPlanBadgeColor(selectedOrg.subscriptionPlan)}>
                      {selectedOrg.subscriptionPlan}
                    </Badge>
                    <Badge variant="secondary" className={getStatusBadgeColor(selectedOrg.subscriptionStatus)}>
                      {selectedOrg.subscriptionStatus}
                    </Badge>
                  </div>
                  <p className="text-sm">Billing: {selectedOrg.billingInterval}</p>
                  {selectedOrg.isLegacy === 'true' && (
                    <Badge variant="outline">Legacy Customer</Badge>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Users</h4>
                <p className="text-lg font-medium">{selectedOrg.userCount} / {selectedOrg.maxUsers + selectedOrg.extraSeats}</p>
                {selectedOrg.extraSeats > 0 && (
                  <p className="text-sm text-gray-500">+{selectedOrg.extraSeats} extra seats</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Billing Period</h4>
                {selectedOrg.currentPeriodStart && selectedOrg.currentPeriodEnd ? (
                  <p className="text-sm">
                    {format(new Date(selectedOrg.currentPeriodStart), 'MMM d, yyyy')} - {format(new Date(selectedOrg.currentPeriodEnd), 'MMM d, yyyy')}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Not set</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Admin Emails</h4>
                {(selectedOrg.adminEmails || []).length > 0 ? (
                  <div className="space-y-1">
                    {(selectedOrg.adminEmails || []).map((email, i) => (
                      <p key={i} className="text-sm">{email}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No admins</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Stripe Customer ID</h4>
                <p className="text-sm font-mono">{selectedOrg.stripeCustomerId || 'Not set'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Stripe Subscription ID</h4>
                <p className="text-sm font-mono">{selectedOrg.stripeSubscriptionId || 'Not set'}</p>
              </div>
              {selectedOrg.pendingDowngradePlan && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-orange-600 mb-1">Pending Downgrade</h4>
                  <p className="text-sm">Will downgrade to <strong>{selectedOrg.pendingDowngradePlan}</strong> at period end</p>
                </div>
              )}
              {selectedOrg.paymentFailedAt && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-red-600 mb-1">Payment Failed</h4>
                  <p className="text-sm">Failed on {format(new Date(selectedOrg.paymentFailedAt), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!billingHistoryOrg} onOpenChange={() => setBillingHistoryOrg(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Billing History - {billingHistoryOrg?.name}
            </DialogTitle>
            <DialogDescription>All billing events for this organization</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No billing history
                    </TableCell>
                  </TableRow>
                ) : (
                  billingHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {format(new Date(item.createdAt), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.eventType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-right text-sm">
                        {item.amountCents ? formatCurrency(item.amountCents) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
