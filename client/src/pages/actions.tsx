import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateActionModal } from "@/components/modals/create-action-modal";
import { EditActionModal } from "@/components/modals/edit-action-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { DependencyTags } from "@/components/dependencies/dependency-tags";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProgressRing } from "@/components/ui/progress-ring";
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
  BarChart3,
  ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";

type Strategy = {
  id: string;
  title: string;
  description: string;
  colorCode: string;
  status: string;
  displayOrder?: number;
};

type Project = {
  id: string;
  title: string;
  strategyId: string;
  createdAt: string;
  accountableLeaders: string; // JSON array of user IDs
};

type User = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
};

type Action = {
  id: string;
  title: string;
  description: string;
  strategyId: string;
  projectId?: string;
  targetValue?: string;
  currentValue?: string;
  measurementUnit?: string;
  status: string;
  dueDate?: string;
  isArchived: string;
  createdBy: string;
  createdAt: string;
  strategy?: Strategy;
  project?: Project;
};

export default function Actions() {
  const { currentRole, currentUser, canCreateProjects } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [collapsedStrategies, setCollapsedStrategies] = useState<Set<string>>(new Set());
  const [projectFilterByStrategy, setProjectFilterByStrategy] = useState<Record<string, string>>({});
  const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
  const [isEditActionOpen, setIsEditActionOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [collapsedActions, setCollapsedActions] = useState<Set<string>>(new Set());
  
  // Deep-link navigation state
  const [highlightedActionId, setHighlightedActionId] = useState<string | null>(null);
  const lastAppliedActionId = useRef<string | null>(null);

  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ["/api/actions"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const navigateToProjects = (strategyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/projects?strategyId=${strategyId}`);
  };

  // Navigate to Projects page with deep-link to specific project
  const navigateToProject = (projectId: string) => {
    setLocation(`/projects?projectId=${projectId}`);
  };

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // Check URL for strategyId param to auto-filter to that strategy
  // Note: wouter's location only includes pathname, so we use window.location.search for query params
  // The location dependency ensures this re-runs when navigating between pages
  const urlStrategyId = useMemo(() => 
    new URLSearchParams(window.location.search).get('strategyId'),
    [location]
  );
  const lastAppliedUrlParam = useRef<string | null>(null);
  const hasInitializedCollapse = useRef(false);
  
  useEffect(() => {
    if (strategies && urlStrategyId && urlStrategyId !== lastAppliedUrlParam.current) {
      const validStrategyIds = new Set((strategies as Strategy[]).map(s => s.id));
      
      if (validStrategyIds.has(urlStrategyId)) {
        // Set the strategy filter to show only the target strategy
        setStrategyFilter(urlStrategyId);
        // Expand all strategies when filtered (since there's only one showing)
        setCollapsedStrategies(new Set());
        // Track that we've applied this URL param
        lastAppliedUrlParam.current = urlStrategyId;
      }
    }
  }, [strategies, urlStrategyId]);

  // Check URL for actionId param to auto-scroll and highlight specific action
  const urlActionId = useMemo(() => 
    new URLSearchParams(window.location.search).get('actionId'),
    [location]
  );
  
  // Deep-link navigation for actionId
  useEffect(() => {
    if (actions && urlActionId && urlActionId !== lastAppliedActionId.current) {
      lastAppliedActionId.current = urlActionId;
      setHighlightedActionId(urlActionId);
      
      // Auto-filter to show the action's strategy and expand it
      const action = (actions as Action[]).find(a => a.id === urlActionId);
      if (action) {
        setStrategyFilter(action.strategyId);
        setCollapsedStrategies(new Set());
        // Make sure the action is not collapsed
        setCollapsedActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(urlActionId);
          return newSet;
        });
      }
      
      // Scroll with retry logic (handles DOM rendering race conditions)
      setTimeout(() => {
        const element = document.getElementById(`action-card-${urlActionId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          setTimeout(() => {
            const retryElement = document.getElementById(`action-card-${urlActionId}`);
            retryElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }, 200);
      
      // Clear highlight and URL after 3 seconds
      setTimeout(() => {
        setHighlightedActionId(null);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 3000);
    }
  }, [location, actions, urlActionId]);

  // Handler for manual filter dropdown changes
  const handleStrategyFilterChange = (value: string) => {
    setStrategyFilter(value);
    // Reset the URL param guard when user manually changes filter
    // This allows navigation arrows to re-apply the same strategy filter
    if (value === "all") {
      lastAppliedUrlParam.current = null;
    }
  };

  // Track the previous filter value to detect actual filter changes
  const prevStrategyFilter = useRef(strategyFilter);
  
  // Auto-collapse all strategies when "All Strategies" filter is active (initial load only)
  // or when user explicitly changes the filter
  useEffect(() => {
    if (!strategies) return;
    
    const filterChanged = prevStrategyFilter.current !== strategyFilter;
    prevStrategyFilter.current = strategyFilter;
    
    // Only set collapse state on initial load or when filter actually changes
    if (strategyFilter === "all") {
      if (!hasInitializedCollapse.current || filterChanged) {
        // Collapse all strategy cards
        const allStrategyIds = new Set((strategies as Strategy[]).map(s => s.id));
        setCollapsedStrategies(allStrategyIds);
        hasInitializedCollapse.current = true;
      }
    } else if (filterChanged) {
      // Expand when a specific strategy is selected (only on filter change)
      setCollapsedStrategies(new Set());
    }
  }, [strategies, strategyFilter]);

  // Initialize collapsed state for achieved actions on load
  const hasInitializedActionCollapse = useRef(false);
  useEffect(() => {
    if (actions && !hasInitializedActionCollapse.current) {
      const achievedActionIds = (actions as Action[])
        .filter(a => a.status === 'achieved')
        .map(a => a.id);
      if (achievedActionIds.length > 0) {
        setCollapsedActions(new Set(achievedActionIds));
      }
      hasInitializedActionCollapse.current = true;
    }
  }, [actions]);

  // Enhance actions with strategy and project data
  const actionsWithDetails = (actions as Action[])?.map((action) => ({
    ...action,
    strategy: (strategies as Strategy[])?.find((s) => s.id === action.strategyId),
    project: (projects as Project[])?.find((t) => t.id === action.projectId),
  })) || [];

  const deleteActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      await apiRequest("DELETE", `/api/actions/${actionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
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

  const handleEditAction = (action: Action) => {
    setSelectedAction(action);
    setIsEditActionOpen(true);
  };

  const handleDeleteAction = (actionId: string) => {
    deleteActionMutation.mutate(actionId);
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

  // Filter actions
  const filteredActions = actionsWithDetails.filter((action) => {
    const matchesSearch = action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.strategy?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = true;
    const matchesStrategy = strategyFilter === "all" || action.strategyId === strategyFilter;
    
    // Filter out archived actions and actions from archived strategies
    const isNotArchived = action.isArchived !== 'true' && action.strategy?.status !== 'Archived';
    
    return matchesSearch && matchesStatus && matchesStrategy && isNotArchived;
  });

  // Group actions by strategy
  const actionsByStrategy = filteredActions.reduce((groups, action) => {
    const strategyId = action.strategyId;
    if (!groups[strategyId]) {
      groups[strategyId] = [];
    }
    groups[strategyId].push(action);
    return groups;
  }, {} as Record<string, Action[]>);

  // Get all active strategies sorted by displayOrder (with fallback to title for stable sorting)
  // Filter by strategyFilter to show only the selected strategy card when filtered
  const sortedStrategies = ((strategies as Strategy[]) || [])
    .filter(s => s.status !== 'Archived')
    .filter(s => strategyFilter === "all" || s.id === strategyFilter)
    .sort((a, b) => {
      const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title); // Secondary sort by title for stability
    });

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

  const getFilteredActionsForStrategy = (strategyId: string, actions: Action[]) => {
    const projectFilter = projectFilterByStrategy[strategyId] || "all";
    const filtered = projectFilter === "all" 
      ? actions 
      : actions.filter(action => action.projectId === projectFilter);
    
    // Sort actions by creation date
    return [...filtered].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  // Calculate project progress based on completed actions
  const calculateProjectProgress = (projectActions: Action[]): number => {
    if (projectActions.length === 0) return 0;
    const completedCount = projectActions.filter(a => a.status === 'achieved').length;
    return Math.round((completedCount / projectActions.length) * 100);
  };

  // Group actions by project for visual hierarchy
  const groupActionsByProject = (actions: Action[]) => {
    const groups: { projectId: string | null; projectTitle: string; project: Project | null; actions: Action[]; progress: number }[] = [];
    const projectMap = new Map<string | null, Action[]>();
    
    // Group actions
    actions.forEach(action => {
      const key = action.projectId || null;
      if (!projectMap.has(key)) {
        projectMap.set(key, []);
      }
      projectMap.get(key)!.push(action);
    });
    
    // Convert to array with project titles and full project data
    projectMap.forEach((projectActions, projectId) => {
      let fullProject: Project | null = null;
      const projectTitle = projectId 
        ? (() => {
            const foundProject = (projects as Project[])?.find(p => p.id === projectId);
            fullProject = foundProject || null;
            return foundProject?.title || "Unknown Project";
          })()
        : "Not Linked to Project";
      
      const sortedActions = projectActions.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      groups.push({
        projectId,
        projectTitle,
        project: fullProject,
        actions: sortedActions,
        progress: calculateProjectProgress(sortedActions)
      });
    });
    
    // Sort: linked projects first (by creation date), then "Not Linked to Project"
    return groups.sort((a, b) => {
      if (a.projectId === null) return 1;
      if (b.projectId === null) return -1;
      const aFirstAction = a.actions[0];
      const bFirstAction = b.actions[0];
      return new Date(aFirstAction.project?.createdAt || 0).getTime() - 
             new Date(bFirstAction.project?.createdAt || 0).getTime();
    });
  };

  const updateActionStatusMutation = useMutation({
    mutationFn: async ({ action, status }: { action: Action; status: string }) => {
      // Build payload matching insertActionSchema - omit optional fields when empty
      const updateData: any = {
        title: action.title,
        description: action.description,
        strategyId: action.strategyId,
        status: status,
        isArchived: action.isArchived, // Keep as string 'true' or 'false'
        createdBy: action.createdBy,
      };
      
      // Only include optional fields when they have non-empty values
      if (action.projectId && action.projectId.trim()) updateData.projectId = action.projectId;
      if (action.targetValue && action.targetValue.trim()) updateData.targetValue = action.targetValue;
      if (action.currentValue && action.currentValue.trim()) updateData.currentValue = action.currentValue;
      if (action.measurementUnit && action.measurementUnit.trim()) updateData.measurementUnit = action.measurementUnit;
      if (action.dueDate) updateData.dueDate = action.dueDate;
      
      return await apiRequest("PATCH", `/api/actions/${action.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({
        title: "Success",
        description: "Action status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update action status",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (action: Action, newStatus: string) => {
    updateActionStatusMutation.mutate({ action, status: newStatus });
    
    // Auto-collapse when achieved, auto-expand when changed to other status
    setCollapsedActions(prev => {
      const newSet = new Set(prev);
      if (newStatus === 'achieved') {
        newSet.add(action.id);
      } else {
        newSet.delete(action.id);
      }
      return newSet;
    });
  };

  const getProjectsForStrategy = (strategyId: string) => {
    const strategyProjects = (projects as Project[])?.filter(t => t.strategyId === strategyId) || [];
    // Sort projects by creation date
    return [...strategyProjects].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  // Helper function to get accountable leaders for a project
  const getAccountableLeaders = (project: Project | null): User[] => {
    if (!project) return [];
    try {
      const leaderIds = JSON.parse(project.accountableLeaders || "[]");
      return (users as User[])?.filter((user) => leaderIds.includes(user.id)) || [];
    } catch {
      return [];
    }
  };

  if (actionsLoading) {
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
            {canCreateProjects() && (
              <Button onClick={() => setIsCreateActionOpen(true)} data-testid="button-create-action">
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
                  data-testid="input-search-actions"
                />
              </div>
            </div>
            
            <Select value={strategyFilter} onValueChange={handleStrategyFilterChange}>
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
          {sortedStrategies.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No strategies found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || strategyFilter !== "all" 
                  ? "Try adjusting your filters to see more strategies."
                  : "Get started by creating your first action."
                }
              </p>
              {canCreateProjects() && !searchTerm && strategyFilter === "all" && (
                <Button onClick={() => setIsCreateActionOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Action
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {sortedStrategies.map((strategy) => {
                const strategyId = strategy.id;
                const strategyActions = actionsByStrategy[strategyId] || [];
                const isCollapsed = collapsedStrategies.has(strategyId);
                const strategyProjects = getProjectsForStrategy(strategyId);
                const filteredActions = getFilteredActionsForStrategy(strategyId, strategyActions);
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
                              {strategyActions.length} action{strategyActions.length !== 1 ? 's' : ''}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => navigateToProjects(strategyId, e)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Go to Projects"
                            data-testid={`button-nav-projects-${strategyId}`}
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {!isCollapsed && (
                      <CardContent className="p-0">
                        <div className="space-y-4 p-6 pt-0">
                          {filteredActions.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                              No actions established
                            </p>
                          ) : (
                            groupActionsByProject(filteredActions).map((group) => {
                              const accountableLeaders = getAccountableLeaders(group.project);
                              
                              return (
                                <div key={group.projectId || 'unlinked'} className="space-y-3">
                                  {/* Project Header with indentation */}
                                  <div className="ml-4 flex items-center space-x-3">
                                    {group.projectId ? (
                                      <button
                                        onClick={() => navigateToProject(group.projectId!)}
                                        className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:underline transition-colors"
                                        data-testid={`link-project-${group.projectId}`}
                                      >
                                        {group.projectTitle}
                                      </button>
                                    ) : (
                                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {group.projectTitle}
                                      </h4>
                                    )}
                                    
                                    {/* Progress Ring - only show for linked projects */}
                                    {group.project && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="cursor-default" data-testid={`progress-ring-${group.projectId}`}>
                                              <ProgressRing 
                                                progress={group.progress} 
                                                size={28} 
                                                strokeWidth={3}
                                              />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{group.progress}% complete ({group.actions.filter(a => a.status === 'achieved').length}/{group.actions.length} actions)</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    
                                    {/* Accountable Leaders */}
                                    {group.project && (
                                      <div className="flex items-center space-x-1">
                                        <TooltipProvider>
                                          {accountableLeaders.length > 0 ? (
                                            accountableLeaders.map((leader) => (
                                              <Tooltip key={leader.id}>
                                                <TooltipTrigger asChild>
                                                  <div>
                                                    <Avatar className="w-6 h-6 cursor-default">
                                                      <AvatarFallback className="bg-purple-500 text-white text-xs">
                                                        {leader.firstName?.[0]}{leader.lastName?.[0]}
                                                      </AvatarFallback>
                                                    </Avatar>
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>{leader.firstName} {leader.lastName}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            ))
                                          ) : (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                              Assign a leader at the project level.
                                            </span>
                                          )}
                                        </TooltipProvider>
                                      </div>
                                    )}
                                  </div>
                                
                                {/* Actions under this project with further indentation */}
                                <div className="ml-8 space-y-4">
                                  {group.actions.map((action) => {
                                    const statusInfo = getStatusDisplay(action.status);
                                    const dueDateInfo = action.dueDate ? getDueDateDisplay(action.dueDate) : null;
                                    const isActionCollapsed = collapsedActions.has(action.id);
                                    
                                    return (
                                      <Card 
                                        key={action.id} 
                                        id={`action-card-${action.id}`}
                                        className={`border transition-all duration-500 ${
                                          highlightedActionId === action.id 
                                            ? 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-50/50 dark:bg-blue-950/30' 
                                            : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                      >
                                        <CardContent className={isActionCollapsed ? "p-4" : "p-6"}>
                                          <div className={`flex items-start justify-between ${isActionCollapsed ? "" : "mb-4"}`}>
                                            <div className="flex-1">
                                              <div className={`flex items-center space-x-3 ${isActionCollapsed ? "" : "mb-2"}`}>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                  {action.title}
                                                </h3>
                                                
                                                {/* Quick Status Dropdown */}
                                                <Select 
                                                  value={action.status} 
                                                  onValueChange={(value) => handleStatusChange(action, value)}
                                                >
                                                  <SelectTrigger className={`w-36 h-7 ${statusInfo.color} text-white border-0`} data-testid={`select-status-${action.id}`}>
                                                    <SelectValue>{statusInfo.label}</SelectValue>
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="achieved">Achieved</SelectItem>
                                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                                    <SelectItem value="at_risk">At Risk</SelectItem>
                                                    <SelectItem value="not_started">Not Started</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                {dueDateInfo && (
                                                  <Badge 
                                                    className={`${dueDateInfo.bgColor} ${dueDateInfo.textColor}`}
                                                    data-testid={`badge-due-date-${action.id}`}
                                                  >
                                                    {dueDateInfo.label}
                                                  </Badge>
                                                )}
                                              </div>
                                              {!isActionCollapsed && (
                                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                  {action.description}
                                                </p>
                                              )}
                                            </div>
                                            
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" data-testid={`menu-action-${action.id}`}>
                                                  <MoreVertical className="w-4 h-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem 
                                                  onClick={() => handleEditAction(action)}
                                                  data-testid={`button-edit-${action.id}`}
                                                >
                                                  Edit Action
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem 
                                                      className="text-red-600 focus:text-red-600"
                                                      onSelect={(e) => e.preventDefault()}
                                                      data-testid={`button-delete-${action.id}`}
                                                    >
                                                      <Trash2 className="w-4 h-4 mr-2" />
                                                      Delete
                                                    </DropdownMenuItem>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Delete Action</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        Are you sure you want to delete "{action.title}"? This action cannot be undone.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction
                                                        onClick={() => handleDeleteAction(action.id)}
                                                        className="bg-red-600 hover:bg-red-700"
                                                        data-testid={`button-confirm-delete-${action.id}`}
                                                      >
                                                        Delete
                                                      </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>

                                          {/* Action Details Grid - hidden when collapsed */}
                                          {!isActionCollapsed && (
                                            <>
                                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                                {/* Target vs Current */}
                                                {(action.targetValue || action.currentValue) && (
                                                  <div className="space-y-2">
                                                    <div className="flex items-center space-x-2">
                                                      <TrendingUp className="w-4 h-4 text-green-500" />
                                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Performance
                                                      </span>
                                                    </div>
                                                    {action.targetValue && (
                                                      <div className="text-sm">
                                                        <span className="text-gray-600 dark:text-gray-400">Target: </span>
                                                        <span className="font-medium">{action.targetValue}</span>
                                                        {action.measurementUnit && (
                                                          <span className="text-gray-500"> {action.measurementUnit}</span>
                                                        )}
                                                      </div>
                                                    )}
                                                    {action.currentValue && (
                                                      <div className="text-sm">
                                                        <span className="text-gray-600 dark:text-gray-400">Current: </span>
                                                        <span className="font-medium">{action.currentValue}</span>
                                                        {action.measurementUnit && (
                                                          <span className="text-gray-500"> {action.measurementUnit}</span>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Linked Project */}
                                                {action.project && (
                                                  <div className="space-y-2">
                                                    <div className="flex items-center space-x-2">
                                                      <Target className="w-4 h-4 text-blue-500" />
                                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Linked Project
                                                      </span>
                                                    </div>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                      {action.project.title}
                                                    </p>
                                                  </div>
                                                )}

                                                {/* Due Date */}
                                                {action.dueDate && (
                                                  <div className="space-y-2">
                                                    <div className="flex items-center space-x-2">
                                                      <Calendar className="w-4 h-4 text-orange-500" />
                                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Due Date
                                                      </span>
                                                    </div>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                      {new Date(action.dueDate).toLocaleDateString()}
                                                    </p>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Dependencies Section */}
                                              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                <DependencyTags
                                                  sourceType="action"
                                                  sourceId={action.id}
                                                  sourceTitle={action.title}
                                                  strategyId={action.strategyId}
                                                  compact
                                                />
                                              </div>
                                            </>
                                          )}
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                            })
                          )}
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

      <CreateActionModal 
        open={isCreateActionOpen} 
        onOpenChange={setIsCreateActionOpen} 
      />
      <EditActionModal
        open={isEditActionOpen}
        onOpenChange={setIsEditActionOpen}
        action={selectedAction}
      />
    </div>
  );
}