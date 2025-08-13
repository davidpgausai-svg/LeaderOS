import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateTacticModal } from "@/components/modals/create-tactic-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Plus, Search, Clock, CheckCircle, AlertTriangle } from "lucide-react";

export default function Tactics() {
  const { currentRole, currentUser, canCreateTactics, canEditTactics } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateTacticOpen, setIsCreateTacticOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: tactics, isLoading: tacticsLoading } = useQuery({
    queryKey: ["/api/tactics"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const updateTacticMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/tactics/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tactics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Tactic updated successfully",
      });
    },
  });

  // Enhance tactics with strategy and user data
  const tacticsWithDetails = (tactics as any[])?.map((tactic: any) => ({
    ...tactic,
    strategy: (strategies as any[])?.find((s: any) => s.id === tactic.strategyId),
    assignee: (users as any[])?.find((u: any) => u.id === tactic.assignedTo),
    creator: (users as any[])?.find((u: any) => u.id === tactic.createdBy)
  })) || [];

  // Filter tactics based on role
  const filteredTactics = tacticsWithDetails.filter((tactic: any) => {
    const matchesSearch = tactic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tactic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tactic.strategy?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tactic.status === statusFilter;
    
    // If user is a leader, only show tactics assigned to them
    const matchesRole = currentRole === 'executive' || tactic.assignedTo === currentUser?.id;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEditTactic = (tactic: any) => {
    // Executives can edit all tactics, leaders can only edit tactics assigned to them
    if (currentRole === 'executive') return true;
    return tactic.assignedTo === currentUser?.id;
  };

  const handleStatusChange = (tacticId: string, newStatus: string) => {
    updateTacticMutation.mutate({
      id: tacticId,
      updates: { status: newStatus }
    });
  };

  const handleProgressChange = (tacticId: string, newProgress: number) => {
    const status = newProgress === 100 ? 'completed' : 
                  newProgress > 0 ? 'in-progress' : 
                  'not-started';
    
    updateTacticMutation.mutate({
      id: tacticId,
      updates: { progress: newProgress, status }
    });
  };

  if (tacticsLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-black">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tactics</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentRole === 'executive' 
                  ? 'Manage and assign tactical initiatives'
                  : 'Track your assigned tactics and progress'
                }
              </p>
            </div>
            {canCreateTactics() && (
              <Button onClick={() => setIsCreateTacticOpen(true)} data-testid="button-create-tactic">
                <Plus className="mr-2 h-4 w-4" />
                New Tactic
              </Button>
            )}
          </div>
        </header>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tactics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-tactics"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tactics List */}
        <div className="p-6">
          {filteredTactics.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tactics found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : currentRole === 'executive' 
                    ? "Get started by creating your first tactic"
                    : "No tactics have been assigned to you yet"
                }
              </p>
              {canCreateTactics() && (
                <Button onClick={() => setIsCreateTacticOpen(true)} data-testid="button-create-first-tactic">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tactic
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTactics.map((tactic: any) => (
                <Card key={tactic.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(tactic.status)}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {tactic.title}
                        </h3>
                        <Badge className={getStatusColor(tactic.status)}>
                          {tactic.status.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{tactic.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <div>
                          <span className="font-medium">Strategy:</span>
                          <span className="ml-2">{tactic.strategy?.title}</span>
                        </div>
                        <div>
                          <span className="font-medium">Assigned to:</span>
                          <span className="ml-2">{tactic.assignee?.name || 'Unassigned'}</span>
                        </div>
                        <div>
                          <span className="font-medium">Due:</span>
                          <span className="ml-2">
                            {new Date(tactic.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Progress</span>
                          <span className="font-medium">{tactic.progress}%</span>
                        </div>
                        <Progress value={tactic.progress} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="ml-6 flex flex-col space-y-2">
                      {canEditTactic(tactic) && (
                        <>
                          <Select
                            value={tactic.status}
                            onValueChange={(value) => handleStatusChange(tactic.id, value)}
                          >
                            <SelectTrigger className="w-40" data-testid={`select-status-${tactic.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not-started">Not Started</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={tactic.progress.toString()}
                            onValueChange={(value) => handleProgressChange(tactic.id, parseInt(value))}
                          >
                            <SelectTrigger className="w-40" data-testid={`select-progress-${tactic.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="25">25%</SelectItem>
                              <SelectItem value="50">50%</SelectItem>
                              <SelectItem value="75">75%</SelectItem>
                              <SelectItem value="100">100%</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateTacticModal
        open={isCreateTacticOpen}
        onOpenChange={setIsCreateTacticOpen}
      />
    </div>
  );
}
