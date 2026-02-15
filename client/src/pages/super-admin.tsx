import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, 
  Users, 
  Search,
  Eye,
  Crown,
  Shield
} from "lucide-react";
import { format } from "date-fns";

interface OrganizationStats {
  totalOrganizations: number;
  totalUsers: number;
}

interface OrganizationWithDetails {
  id: string;
  name: string;
  maxUsers: number;
  createdAt: string;
  userCount: number;
  adminEmails: string[];
}


export default function SuperAdmin() {
  const { isSuperAdmin } = useRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithDetails | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<OrganizationStats>({
    queryKey: ["/api/super-admin/stats"],
    enabled: isSuperAdmin(),
  });

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<OrganizationWithDetails[]>({
    queryKey: ["/api/super-admin/organizations"],
    enabled: isSuperAdmin(),
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
                Manage all organizations and system metrics
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card data-testid="card-organizations">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Organizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
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
                    All organizations and usage details
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
                      <TableHead>Users</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrgs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No organizations match your search" : "No organizations found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrgs.map((org) => (
                        <TableRow key={org.id} data-testid={`row-org-${org.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {org.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {org.adminEmails?.length > 0 ? org.adminEmails[0] : 'No admin'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {org.userCount} / {org.maxUsers}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">
                              {org.createdAt ? format(new Date(org.createdAt), 'MMM d, yyyy') : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOrg(org)}
                              data-testid={`button-view-org-${org.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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
                <h4 className="text-sm font-medium text-gray-500 mb-1">Users</h4>
                <p className="text-lg font-medium">{selectedOrg.userCount} / {selectedOrg.maxUsers}</p>
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
                <h4 className="text-sm font-medium text-gray-500 mb-1">Created</h4>
                <p className="text-sm">{selectedOrg.createdAt ? format(new Date(selectedOrg.createdAt), 'MMM d, yyyy') : '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
