import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateTacticModal } from "@/components/modals/create-tactic-modal";
import { EditTacticModal } from "@/components/modals/edit-tactic-modal";
import { ViewTacticModal } from "@/components/modals/view-tactic-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  Target, 
  TrendingUp, 
  MoreVertical, 
  Trash2,
  Filter,
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  ExternalLink,
  CheckCircle2,
  Circle
} from "lucide-react";

type Strategy = {
  id: string;
  title: string;
  description: string;
  colorCode: string;
  status: string;
  startDate: string;
  targetDate: string;
  metrics: string;
};

type User = {
  id: string;
  name: string;
  initials: string;
  role: string;
};

type Tactic = {
  id: string;
  title: string;
  description: string;
  strategyId: string;
  kpi: string;
  kpiTracking?: string;
  accountableLeaders: string; // JSON array of user IDs
  resourcesRequired?: string;
  documentFolderUrl?: string | null;
  startDate: string;
  dueDate: string;
  status: string; // C, OT, OH, B, NYS
  progress: number;
  createdBy: string;
  createdAt: string;
  isArchived?: string;
  strategy?: Strategy;
};

type Milestone = {
  id: string;
  tacticId: string;
  milestoneNumber: number;
  status: string;
  startDate?: string;
  completionDate?: string;
  notes?: string;
  createdAt: string;
};

export default function Tactics() {
  const { currentRole, currentUser, canCreateTactics, canEditTactics } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateTacticOpen, setIsCreateTacticOpen] = useState(false);
  const [isEditTacticOpen, setIsEditTacticOpen] = useState(false);
  const [isViewTacticOpen, setIsViewTacticOpen] = useState(false);
  const [editingTactic, setEditingTactic] = useState<Tactic | null>(null);
  const [viewingTactic, setViewingTactic] = useState<Tactic | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [collapsedStrategies, setCollapsedStrategies] = useState<Set<string>>(new Set());

  const { data: tactics, isLoading: tacticsLoading } = useQuery({
    queryKey: ["/api/tactics"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: milestones } = useQuery({
    queryKey: ["/api/milestones"],
  });

  // Initialize all strategies as collapsed by default when strategies data loads
  const [hasInitializedCollapsed, setHasInitializedCollapsed] = useState(false);
  
  useEffect(() => {
    if (strategies && !hasInitializedCollapsed) {
      setCollapsedStrategies(new Set((strategies as Strategy[]).map(s => s.id)));
      setHasInitializedCollapsed(true);
    }
  }, [strategies, hasInitializedCollapsed]);

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

  const deleteTacticMutation = useMutation({
    mutationFn: async (tacticId: string) => {
      const response = await apiRequest("DELETE", `/api/tactics/${tacticId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tactics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Tactic deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tactic",
        variant: "destructive",
      });
    },
  });

  // Enhance tactics with strategy data
  const tacticsWithDetails = (tactics as Tactic[])?.map((tactic) => ({
    ...tactic,
    strategy: (strategies as Strategy[])?.find((s) => s.id === tactic.strategyId),
  })) || [];

  // Helper functions
  const getMilestoneTitle = (milestoneNumber: number): string => {
    const titles = {
      1: "Stakeholder & Readiness Assessment",
      2: "Executive Governance Review",
      3: "Directors Meeting Authorization",
      4: "Strategic Communication Deployment",
      5: "Staff Meetings & Huddles Activation",
      6: "Education & Enablement Completion",
      7: "Operational Feedback + Governance Close-Out"
    };
    return titles[milestoneNumber as keyof typeof titles] || `Milestone ${milestoneNumber}`;
  };

  const getTacticMilestones = (tacticId: string): Milestone[] => {
    return (milestones as Milestone[])?.filter(m => m.tacticId === tacticId) || [];
  };

  const getAccountableLeaders = (tactic: Tactic): User[] => {
    try {
      const leaderIds = JSON.parse(tactic.accountableLeaders);
      return (users as User[])?.filter((user) => leaderIds.includes(user.id)) || [];
    } catch {
      return [];
    }
  };

  const canEditTactic = (tactic: Tactic) => {
    if (currentRole === 'administrator' || currentRole === 'executive') return true;
    
    // Leaders can edit tactics where they are accountable
    try {
      const leaderIds = JSON.parse(tactic.accountableLeaders);
      return leaderIds.includes(currentUser?.id);
    } catch {
      return false;
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      'C': { label: 'Completed', color: 'bg-green-500', textColor: 'text-green-700' },
      'OT': { label: 'On Track', color: 'bg-blue-500', textColor: 'text-blue-700' },
      'OH': { label: 'On Hold', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
      'B': { label: 'Behind', color: 'bg-red-500', textColor: 'text-red-700' },
      'NYS': { label: 'Not Yet Started', color: 'bg-gray-500', textColor: 'text-gray-700' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap['NYS'];
  };

  // Filter tactics
  const filteredTactics = tacticsWithDetails.filter((tactic) => {
    const matchesSearch = tactic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tactic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tactic.strategy?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tactic.status === statusFilter;
    const matchesStrategy = strategyFilter === "all" || tactic.strategyId === strategyFilter;
    
    // Filter out archived tactics and tactics from archived strategies
    const isNotArchived = tactic.isArchived !== 'true' && tactic.strategy?.status !== 'Archived';
    
    // Role-based filtering
    let matchesRole = true;
    if (currentRole === 'leader') {
      try {
        const leaderIds = JSON.parse(tactic.accountableLeaders);
        matchesRole = leaderIds.includes(currentUser?.id);
      } catch {
        matchesRole = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesStrategy && isNotArchived && matchesRole;
  });

  // Group tactics by strategy
  const tacticsByStrategy = filteredTactics.reduce((groups, tactic) => {
    const strategyId = tactic.strategyId;
    if (!groups[strategyId]) {
      groups[strategyId] = [];
    }
    groups[strategyId].push(tactic);
    return groups;
  }, {} as Record<string, Tactic[]>);

  // Toggle strategy collapse/expand - start with all strategies collapsed
  const toggleStrategyCollapse = (strategyId: string) => {
    setCollapsedStrategies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(strategyId)) {
        newSet.delete(strategyId);
      } else {
        newSet.add(strategyId);
      }
      return newSet;
    });
  };

  const handleStatusChange = (tacticId: string, newStatus: string) => {
    updateTacticMutation.mutate({
      id: tacticId,
      updates: { status: newStatus }
    });
  };

  const handleDeleteTactic = (tacticId: string) => {
    deleteTacticMutation.mutate(tacticId);
  };

  const handleEditTactic = (tactic: Tactic) => {
    setEditingTactic(tactic);
    setIsEditTacticOpen(true);
  };

  const handleViewTactic = (tactic: Tactic) => {
    setViewingTactic(tactic);
    setIsViewTacticOpen(true);
  };

  const closeEditModal = () => {
    setIsEditTacticOpen(false);
    setEditingTactic(null);
  };

  const closeViewModal = () => {
    setIsViewTacticOpen(false);
    setViewingTactic(null);
  };

  // Mutation for updating milestone status
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, status }: { milestoneId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/milestones/${milestoneId}`, { 
        status, 
        completionDate: status === 'completed' ? new Date().toISOString() : null 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      toast({
        title: "Milestone updated",
        description: "Milestone status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update milestone status.",
        variant: "destructive",
      });
    },
  });

  const handleMilestoneClick = (tacticId: string, milestoneNum: number) => {
    const tacticMilestones = getTacticMilestones(tacticId);
    const milestone = tacticMilestones.find(m => m.milestoneNumber === milestoneNum);
    
    if (!milestone) return;

    // Toggle between not_started and completed for simplicity
    const newStatus = milestone.status === 'completed' ? 'not_started' : 'completed';
    updateMilestoneMutation.mutate({ 
      milestoneId: milestone.id, 
      status: newStatus 
    });
  };

  if (tacticsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg">Loading tactics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
              <p className="text-gray-600 dark:text-gray-400">Track your assigned projects and progress</p>
            </div>
            {canCreateTactics() && (
              <Button onClick={() => setIsCreateTacticOpen(true)} data-testid="button-create-tactic">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            )}
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 border-b px-6 py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tactics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-tactics"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="C">Completed</SelectItem>
                <SelectItem value="OT">On Track</SelectItem>
                <SelectItem value="OH">On Hold</SelectItem>
                <SelectItem value="B">Behind</SelectItem>
                <SelectItem value="NYS">Not Yet Started</SelectItem>
              </SelectContent>
            </Select>

            <Select value={strategyFilter} onValueChange={setStrategyFilter}>
              <SelectTrigger className="w-48" data-testid="select-strategy-filter">
                <Target className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {(strategies as Strategy[])?.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    {strategy.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {Object.entries(tacticsByStrategy).length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No strategies found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter !== "all" || strategyFilter !== "all" 
                  ? "Try adjusting your filters to see more strategies."
                  : "Get started by creating your first tactic."
                }
              </p>
              {canCreateTactics() && !searchTerm && statusFilter === "all" && strategyFilter === "all" && (
                <Button onClick={() => setIsCreateTacticOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Tactic
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(tacticsByStrategy).map(([strategyId, strategyTactics]) => {
                const strategy = (strategies as Strategy[])?.find((s) => s.id === strategyId);
                const isCollapsed = collapsedStrategies.has(strategyId);
                
                if (!strategy) return null;

                return (
                  <Card key={strategyId} className="overflow-hidden">
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => toggleStrategyCollapse(strategyId)}
                      style={{ borderLeft: `4px solid ${strategy.colorCode}` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isCollapsed ? (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                          <div>
                            <CardTitle className="text-lg font-semibold">
                              {strategy.title}
                            </CardTitle>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {strategyTactics.length} tactic{strategyTactics.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" style={{ color: strategy.colorCode }}>
                            {strategy.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    {!isCollapsed && (
                      <CardContent className="p-0">
                        <div className="space-y-4 p-6 pt-0">
                          {strategyTactics.map((tactic) => {
                            const statusInfo = getStatusDisplay(tactic.status);
                            const accountableLeaders = getAccountableLeaders(tactic);
                            
                            return (
                              <Card key={tactic.id} className="border border-gray-200 dark:border-gray-700">
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                          {tactic.title}
                                        </h3>
                                        <Badge 
                                          className={`${statusInfo.color} text-white`}
                                          data-testid={`badge-status-${tactic.id}`}
                                        >
                                          {statusInfo.label}
                                        </Badge>
                                      </div>
                                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        {tactic.description}
                                      </p>
                                    </div>
                                    
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" data-testid={`menu-tactic-${tactic.id}`}>
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                          onClick={() => handleViewTactic(tactic)}
                                          data-testid={`button-view-${tactic.id}`}
                                        >
                                          <Eye className="w-4 h-4 mr-2" />
                                          View Details
                                        </DropdownMenuItem>
                                        {canEditTactic(tactic) && (
                                          <>
                                            <DropdownMenuItem 
                                              onClick={() => handleEditTactic(tactic)}
                                              data-testid={`button-edit-${tactic.id}`}
                                            >
                                              <Edit className="w-4 h-4 mr-2" />
                                              Edit Tactic
                                            </DropdownMenuItem>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <DropdownMenuItem 
                                                  onSelect={(e) => e.preventDefault()}
                                                  className="text-red-600"
                                                  data-testid={`button-delete-${tactic.id}`}
                                                >
                                                  <Trash2 className="w-4 h-4 mr-2" />
                                                  Delete
                                                </DropdownMenuItem>
                                              </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Tactic</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Are you sure you want to delete "{tactic.title}"? This action cannot be undone.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => handleDeleteTactic(tactic.id)}
                                                  className="bg-red-600 hover:bg-red-700"
                                                >
                                                  Delete
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  {/* Component Grid */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                    {/* KPI Component */}
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <Target className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Key Performance Indicator
                                        </span>
                                      </div>
                                      <p className="text-gray-900 dark:text-white font-medium">{tactic.kpi}</p>
                                      {tactic.kpiTracking && (
                                        <div className="flex items-center space-x-2">
                                          <TrendingUp className="w-4 h-4 text-green-500" />
                                          <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {tactic.kpiTracking}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Accountable Leaders Component */}
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <Users className="w-4 h-4 text-purple-500" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Accountable Leaders
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {accountableLeaders.map((leader) => (
                                          <Badge key={leader.id} variant="secondary" className="text-xs">
                                            {leader.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Timeline Component */}
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Timeline
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        <div>Start: {new Date(tactic.startDate).toLocaleDateString()}</div>
                                        <div>Due: {new Date(tactic.dueDate).toLocaleDateString()}</div>
                                      </div>
                                    </div>

                                    {/* Resources Component */}
                                    {tactic.resourcesRequired && (
                                      <div className="space-y-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Resources Required
                                        </span>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                          {tactic.resourcesRequired}
                                        </p>
                                      </div>
                                    )}

                                    {tactic.documentFolderUrl && (
                                      <div className="space-y-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Document Folder
                                        </span>
                                        <a
                                          href={tactic.documentFolderUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                          data-testid="link-document-folder"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                          Open Project Documents
                                        </a>
                                      </div>
                                    )}
                                  </div>

                                  {/* Milestones Component */}
                                  <div className="space-y-3 mb-4">
                                    <div className="flex items-center space-x-2 mb-3">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Milestones
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {[1, 2, 3, 4, 5, 6, 7].map((milestoneNum) => {
                                        const tacticMilestones = getTacticMilestones(tactic.id);
                                        const milestone = tacticMilestones.find(m => m.milestoneNumber === milestoneNum);
                                        const isCompleted = milestone?.status === 'completed';
                                        
                                        return (
                                          <div 
                                            key={milestoneNum} 
                                            className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded transition-colors"
                                            onClick={() => handleMilestoneClick(tactic.id, milestoneNum)}
                                            title="Click to toggle completion status"
                                            data-testid={`milestone-${tactic.id}-${milestoneNum}`}
                                          >
                                            <div className="flex items-center space-x-2">
                                              {isCompleted ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                              ) : (
                                                <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                              )}
                                              <span className={isCompleted ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}>
                                                {getMilestoneTitle(milestoneNum)}
                                              </span>
                                            </div>
                                            {isCompleted && milestone?.completionDate && (
                                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                                {format(new Date(milestone.completionDate), 'MMM d, yyyy h:mm a')}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Action Controls */}
                                  {canEditTactic(tactic) && (
                                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                      <Select
                                        value={tactic.status}
                                        onValueChange={(value) => handleStatusChange(tactic.id, value)}
                                      >
                                        <SelectTrigger className="w-40" data-testid={`select-status-${tactic.id}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="NYS">Not Yet Started</SelectItem>
                                          <SelectItem value="OT">On Track</SelectItem>
                                          <SelectItem value="OH">On Hold</SelectItem>
                                          <SelectItem value="B">Behind</SelectItem>
                                          <SelectItem value="C">Completed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      
                                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Progress:</span>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{tactic.progress}%</span>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <CreateTacticModal 
        isOpen={isCreateTacticOpen} 
        onClose={() => setIsCreateTacticOpen(false)} 
      />
      <EditTacticModal 
        isOpen={isEditTacticOpen} 
        onClose={closeEditModal}
        tactic={editingTactic}
      />
      <ViewTacticModal 
        isOpen={isViewTacticOpen} 
        onClose={closeViewModal}
        tactic={viewingTactic}
      />
    </div>
  );
}