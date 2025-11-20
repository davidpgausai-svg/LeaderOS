import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateOutcomeModal } from "@/components/modals/create-outcome-modal";
import { EditOutcomeModal } from "@/components/modals/edit-outcome-modal";
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
  Target, 
  TrendingUp, 
  MoreVertical, 
  Trash2,
  Filter,
  ChevronDown,
  ChevronRight,
  Calendar,
  BarChart3
} from "lucide-react";

type Strategy = {
  id: string;
  title: string;
  description: string;
  colorCode: string;
  status: string;
};

type Tactic = {
  id: string;
  title: string;
  strategyId: string;
};

type Outcome = {
  id: string;
  title: string;
  description: string;
  strategyId: string;
  tacticId?: string;
  targetValue?: string;
  currentValue?: string;
  measurementUnit?: string;
  status: string;
  dueDate?: string;
  isArchived: string;
  createdBy: string;
  createdAt: string;
  strategy?: Strategy;
  tactic?: Tactic;
};

export default function Actions() {
  const { currentRole, currentUser, canCreateTactics } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [collapsedStrategies, setCollapsedStrategies] = useState<Set<string>>(new Set());
  const [projectFilterByStrategy, setProjectFilterByStrategy] = useState<Record<string, string>>({});
  const [isCreateOutcomeOpen, setIsCreateOutcomeOpen] = useState(false);
  const [isEditOutcomeOpen, setIsEditOutcomeOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);

  const { data: outcomes, isLoading: outcomesLoading } = useQuery({
    queryKey: ["/api/outcomes"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: tactics } = useQuery({
    queryKey: ["/api/tactics"],
  });

  // Initialize all strategies as collapsed by default when strategies data loads
  const [hasInitializedCollapsed, setHasInitializedCollapsed] = useState(false);
  
  useEffect(() => {
    if (strategies && !hasInitializedCollapsed) {
      setCollapsedStrategies(new Set((strategies as Strategy[]).map(s => s.id)));
      setHasInitializedCollapsed(true);
    }
  }, [strategies, hasInitializedCollapsed]);

  // Enhance outcomes with strategy and tactic data
  const outcomesWithDetails = (outcomes as Outcome[])?.map((outcome) => ({
    ...outcome,
    strategy: (strategies as Strategy[])?.find((s) => s.id === outcome.strategyId),
    tactic: (tactics as Tactic[])?.find((t) => t.id === outcome.tacticId),
  })) || [];

  const deleteOutcomeMutation = useMutation({
    mutationFn: async (outcomeId: string) => {
      await apiRequest("DELETE", `/api/outcomes/${outcomeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outcomes"] });
      toast({
        title: "Success",
        description: "Action deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete action",
        variant: "destructive",
      });
    },
  });

  const handleEditOutcome = (outcome: Outcome) => {
    setSelectedOutcome(outcome);
    setIsEditOutcomeOpen(true);
  };

  const handleDeleteOutcome = (outcomeId: string) => {
    deleteOutcomeMutation.mutate(outcomeId);
  };

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      'achieved': { label: 'Achieved', color: 'bg-green-500', textColor: 'text-green-700' },
      'in_progress': { label: 'In Progress', color: 'bg-blue-500', textColor: 'text-blue-700' },
      'at_risk': { label: 'At Risk', color: 'bg-red-500', textColor: 'text-red-700' },
      'not_started': { label: 'Not Started', color: 'bg-gray-500', textColor: 'text-gray-700' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap['not_started'];
  };

  // Calculate days until/past due date (timezone-agnostic)
  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    
    // Use UTC dates to avoid timezone issues
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const dueUTC = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
    
    const diffTime = dueUTC - todayUTC;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get due date display info with color gradient
  const getDueDateDisplay = (dueDate: string) => {
    const days = getDaysUntilDue(dueDate);
    
    // Determine color based on days
    let bgColor = '';
    let textColor = '';
    
    if (days >= 30) {
      // 30+ days: Dark green
      bgColor = 'bg-green-600 dark:bg-green-700';
      textColor = 'text-white';
    } else if (days >= 21) {
      // 21-29 days: Green
      bgColor = 'bg-green-500 dark:bg-green-600';
      textColor = 'text-white';
    } else if (days >= 14) {
      // 14-20 days: Light green
      bgColor = 'bg-green-400 dark:bg-green-500';
      textColor = 'text-white';
    } else if (days >= 7) {
      // 7-13 days: Yellow-green
      bgColor = 'bg-yellow-400 dark:bg-yellow-500';
      textColor = 'text-gray-900 dark:text-white';
    } else if (days >= 3) {
      // 3-6 days: Yellow
      bgColor = 'bg-yellow-500 dark:bg-yellow-600';
      textColor = 'text-gray-900 dark:text-white';
    } else if (days >= 1) {
      // 1-2 days: Orange
      bgColor = 'bg-orange-500 dark:bg-orange-600';
      textColor = 'text-white';
    } else if (days === 0) {
      // Due today: Dark orange
      bgColor = 'bg-orange-600 dark:bg-orange-700';
      textColor = 'text-white';
    } else if (days >= -1) {
      // 1 day overdue: Red-orange
      bgColor = 'bg-red-500 dark:bg-red-600';
      textColor = 'text-white';
    } else if (days >= -7) {
      // 2-7 days overdue: Red
      bgColor = 'bg-red-600 dark:bg-red-700';
      textColor = 'text-white';
    } else if (days >= -14) {
      // 8-14 days overdue: Dark red
      bgColor = 'bg-red-700 dark:bg-red-800';
      textColor = 'text-white';
    } else if (days >= -30) {
      // 15-30 days overdue: Darker red
      bgColor = 'bg-red-800 dark:bg-red-900';
      textColor = 'text-white';
    } else if (days >= -45) {
      // 31-45 days overdue: Very dark red
      bgColor = 'bg-red-900 dark:bg-red-950';
      textColor = 'text-white';
    } else if (days >= -60) {
      // 46-60 days overdue: Almost black red
      bgColor = 'bg-red-950 dark:bg-red-950';
      textColor = 'text-white';
    } else {
      // 61+ days overdue: Black-red
      bgColor = 'bg-red-950 dark:bg-red-950';
      textColor = 'text-white';
    }
    
    // Format label
    let label = '';
    if (days > 0) {
      label = `Due in ${days} day${days === 1 ? '' : 's'}`;
    } else if (days === 0) {
      label = 'Due today';
    } else {
      label = `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
    }
    
    return { label, bgColor, textColor };
  };

  // Filter outcomes
  const filteredOutcomes = outcomesWithDetails.filter((outcome) => {
    const matchesSearch = outcome.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         outcome.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         outcome.strategy?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || outcome.status === statusFilter;
    const matchesStrategy = strategyFilter === "all" || outcome.strategyId === strategyFilter;
    
    // Filter out archived outcomes and outcomes from archived strategies
    const isNotArchived = outcome.isArchived !== 'true' && outcome.strategy?.status !== 'Archived';
    
    return matchesSearch && matchesStatus && matchesStrategy && isNotArchived;
  });

  // Group outcomes by strategy
  const outcomesByStrategy = filteredOutcomes.reduce((groups, outcome) => {
    const strategyId = outcome.strategyId;
    if (!groups[strategyId]) {
      groups[strategyId] = [];
    }
    groups[strategyId].push(outcome);
    return groups;
  }, {} as Record<string, Outcome[]>);

  const toggleStrategyCollapse = (strategyId: string) => {
    const newCollapsed = new Set(collapsedStrategies);
    if (newCollapsed.has(strategyId)) {
      newCollapsed.delete(strategyId);
    } else {
      newCollapsed.add(strategyId);
    }
    setCollapsedStrategies(newCollapsed);
  };

  const handleProjectFilterChange = (strategyId: string, projectId: string) => {
    setProjectFilterByStrategy(prev => ({
      ...prev,
      [strategyId]: projectId
    }));
  };

  const getFilteredOutcomesForStrategy = (strategyId: string, outcomes: Outcome[]) => {
    const projectFilter = projectFilterByStrategy[strategyId] || "all";
    if (projectFilter === "all") {
      return outcomes;
    }
    return outcomes.filter(outcome => outcome.tacticId === projectFilter);
  };

  const getProjectsForStrategy = (strategyId: string) => {
    return (tactics as Tactic[])?.filter(t => t.strategyId === strategyId) || [];
  };

  if (outcomesLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg">Loading actions...</div>
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Actions</h1>
              <p className="text-gray-600 dark:text-gray-400">Track measurable results and achievements</p>
            </div>
            {canCreateTactics() && (
              <Button onClick={() => setIsCreateOutcomeOpen(true)} data-testid="button-create-outcome">
                <Plus className="w-4 h-4 mr-2" />
                New Action
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
                  placeholder="Search actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-outcomes"
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
                <SelectItem value="achieved">Achieved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
              </SelectContent>
            </Select>

            <Select value={strategyFilter} onValueChange={setStrategyFilter}>
              <SelectTrigger className="w-48" data-testid="select-strategy-filter">
                <Target className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
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
          {Object.entries(outcomesByStrategy).length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No outcomes found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter !== "all" || strategyFilter !== "all" 
                  ? "Try adjusting your filters to see more outcomes."
                  : "Get started by creating your first outcome."
                }
              </p>
              {canCreateTactics() && !searchTerm && statusFilter === "all" && strategyFilter === "all" && (
                <Button onClick={() => setIsCreateOutcomeOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Outcome
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(outcomesByStrategy).map(([strategyId, strategyOutcomes]) => {
                const strategy = (strategies as Strategy[])?.find((s) => s.id === strategyId);
                const isCollapsed = collapsedStrategies.has(strategyId);
                const strategyProjects = getProjectsForStrategy(strategyId);
                const filteredOutcomes = getFilteredOutcomesForStrategy(strategyId, strategyOutcomes);
                const currentProjectFilter = projectFilterByStrategy[strategyId] || "all";
                
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
                              {strategyOutcomes.length} action{strategyOutcomes.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {strategyProjects.length > 0 && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select 
                                value={currentProjectFilter} 
                                onValueChange={(value) => handleProjectFilterChange(strategyId, value)}
                              >
                                <SelectTrigger className="w-48" data-testid={`select-project-filter-${strategyId}`}>
                                  <Filter className="w-4 h-4 mr-2" />
                                  <SelectValue placeholder="Filter by project" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Projects</SelectItem>
                                  {strategyProjects.map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                      {project.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <Badge variant="outline" style={{ color: strategy.colorCode }}>
                            {strategy.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    {!isCollapsed && (
                      <CardContent className="p-0">
                        <div className="space-y-4 p-6 pt-0">
                          {filteredOutcomes.map((outcome) => {
                            const statusInfo = getStatusDisplay(outcome.status);
                            const dueDateInfo = outcome.dueDate ? getDueDateDisplay(outcome.dueDate) : null;
                            
                            return (
                              <Card key={outcome.id} className="border border-gray-200 dark:border-gray-700">
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                          {outcome.title}
                                        </h3>
                                        <Badge 
                                          className={`${statusInfo.color} text-white`}
                                          data-testid={`badge-status-${outcome.id}`}
                                        >
                                          {statusInfo.label}
                                        </Badge>
                                        {dueDateInfo && (
                                          <Badge 
                                            className={`${dueDateInfo.bgColor} ${dueDateInfo.textColor}`}
                                            data-testid={`badge-due-date-${outcome.id}`}
                                          >
                                            {dueDateInfo.label}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        {outcome.description}
                                      </p>
                                    </div>
                                    
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" data-testid={`menu-outcome-${outcome.id}`}>
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                          onClick={() => handleEditOutcome(outcome)}
                                          data-testid={`button-edit-${outcome.id}`}
                                        >
                                          Edit Action
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <DropdownMenuItem 
                                              className="text-red-600 focus:text-red-600"
                                              onSelect={(e) => e.preventDefault()}
                                              data-testid={`button-delete-${outcome.id}`}
                                            >
                                              <Trash2 className="w-4 h-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Outcome</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete "{outcome.title}"? This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => handleDeleteOutcome(outcome.id)}
                                                className="bg-red-600 hover:bg-red-700"
                                                data-testid={`button-confirm-delete-${outcome.id}`}
                                              >
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  {/* Outcome Details Grid */}
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                    {/* Target vs Current */}
                                    {(outcome.targetValue || outcome.currentValue) && (
                                      <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                          <TrendingUp className="w-4 h-4 text-green-500" />
                                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Performance
                                          </span>
                                        </div>
                                        {outcome.targetValue && (
                                          <div className="text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Target: </span>
                                            <span className="font-medium">{outcome.targetValue}</span>
                                            {outcome.measurementUnit && (
                                              <span className="text-gray-500"> {outcome.measurementUnit}</span>
                                            )}
                                          </div>
                                        )}
                                        {outcome.currentValue && (
                                          <div className="text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Current: </span>
                                            <span className="font-medium">{outcome.currentValue}</span>
                                            {outcome.measurementUnit && (
                                              <span className="text-gray-500"> {outcome.measurementUnit}</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Linked Project */}
                                    {outcome.tactic && (
                                      <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                          <Target className="w-4 h-4 text-blue-500" />
                                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Linked Project
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                          {outcome.tactic.title}
                                        </p>
                                      </div>
                                    )}

                                    {/* Due Date */}
                                    {outcome.dueDate && (
                                      <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                          <Calendar className="w-4 h-4 text-orange-500" />
                                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Due Date
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                          {new Date(outcome.dueDate).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>
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

      <CreateOutcomeModal 
        open={isCreateOutcomeOpen} 
        onOpenChange={setIsCreateOutcomeOpen} 
      />
      <EditOutcomeModal
        open={isEditOutcomeOpen}
        onOpenChange={setIsEditOutcomeOpen}
        outcome={selectedOutcome}
      />
    </div>
  );
}