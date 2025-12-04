import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateStrategyModal } from "@/components/modals/create-strategy-modal";
import { EditStrategyModal } from "@/components/modals/edit-strategy-modal";
import { ViewStrategyModal } from "@/components/modals/view-strategy-modal";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, Trash2, MoreVertical, Edit, Eye, CheckCircle, Archive, ChevronDown, ChevronRight, ChevronUp, ArrowRight, Target, Calendar, BarChart3, RefreshCw, Circle, FolderOpen } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useLocation } from "wouter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Strategies() {
  const { canCreateStrategies, canEditAllStrategies } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [isCreateStrategyOpen, setIsCreateStrategyOpen] = useState(false);
  const [isEditStrategyOpen, setIsEditStrategyOpen] = useState(false);
  const [isViewStrategyOpen, setIsViewStrategyOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>();
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [expandedContinuum, setExpandedContinuum] = useState<Record<string, boolean>>({});
  const [collapsedStrategies, setCollapsedStrategies] = useState<Set<string>>(new Set());
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  const { data: strategies, isLoading: strategiesLoading } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Fetch all actions for expandable actions section
  const { data: actions } = useQuery<any[]>({
    queryKey: ["/api/actions"],
  });

  // Check URL for strategyId param to auto-filter to that strategy
  // Note: wouter's location only includes pathname, so we use window.location.search for query params
  // The location dependency ensures this re-runs when navigating between pages
  const urlStrategyId = useMemo(() => 
    new URLSearchParams(window.location.search).get('strategyId'),
    [location]
  );
  const lastAppliedUrlParam = useRef<string | null>(null);
  
  useEffect(() => {
    if (strategies && urlStrategyId && urlStrategyId !== lastAppliedUrlParam.current) {
      const validStrategyIds = new Set((strategies as any[]).map((s: any) => s.id));
      
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

  // Handler for manual filter dropdown changes
  const handleStrategyFilterChange = (value: string) => {
    setStrategyFilter(value);
    // Reset the URL param guard when user manually changes filter
    // This allows navigation arrows to re-apply the same strategy filter
    if (value === "all") {
      lastAppliedUrlParam.current = null;
    }
  };

  // Auto-collapse all strategies when "All Strategies" filter is active
  useEffect(() => {
    if (strategies && strategyFilter === "all") {
      // Collapse all strategy cards
      const allStrategyIds = new Set((strategies as any[]).map((s: any) => s.id));
      setCollapsedStrategies(allStrategyIds);
    } else if (strategyFilter !== "all") {
      // Expand when a specific strategy is selected
      setCollapsedStrategies(new Set());
    }
  }, [strategies, strategyFilter]);

  const navigateToProjects = (strategyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/projects?strategyId=${strategyId}`);
  };

  // Navigate to Projects page with deep-link to specific project
  const navigateToProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/projects?projectId=${projectId}`);
  };

  // Navigate to Actions page with deep-link to specific action
  const navigateToAction = (actionId: string) => {
    setLocation(`/actions?actionId=${actionId}`);
  };

  // Toggle project collapse
  const toggleProjectCollapse = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // Get actions for a specific project
  const getProjectActions = (projectId: string) => {
    return (actions || []).filter(a => a.projectId === projectId && a.isArchived !== 'true');
  };

  // Get action status color
  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'fill-green-500 text-green-500';
      case 'in_progress': return 'fill-blue-500 text-blue-500';
      case 'at_risk': return 'fill-yellow-500 text-yellow-500';
      default: return 'fill-gray-300 text-gray-300';
    }
  };

  // Get action status badge
  const getActionStatusBadge = (status: string) => {
    switch (status) {
      case 'achieved': return { label: 'Achieved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
      case 'in_progress': return { label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
      case 'at_risk': return { label: 'At Risk', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
      default: return { label: 'Not Started', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' };
    }
  };

  // Get project status display
  const getProjectStatusBadge = (status: string) => {
    switch (status) {
      case 'C': return { label: 'C', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
      case 'OT': return { label: 'OT', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
      case 'OH': return { label: 'OH', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
      case 'B': return { label: 'B', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
      case 'NYS': return { label: 'NYS', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
      default: return { label: status, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
    }
  };

  // Format date for display
  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Enhance strategies with projects
  const strategiesWithProjects = (strategies as any[])?.map((strategy: any) => ({
    ...strategy,
    projects: (projects as any[])?.filter((project: any) => project.strategyId === strategy.id) || []
  })) || [];

  // Filter and sort strategies
  const filteredStrategies = strategiesWithProjects
    .filter((strategy: any) => {
      const matchesSearch = strategy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           strategy.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by strategy dropdown
      const matchesStrategyFilter = strategyFilter === "all" || strategy.id === strategyFilter;
      
      // Default filter hides archived items
      const isNotArchived = strategy.status !== 'Archived';
      
      return matchesSearch && matchesStrategyFilter && isNotArchived;
    })
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const handleCreateProject = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    setIsCreateProjectOpen(true);
  };



  const completeStrategyMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const response = await apiRequest("PATCH", `/api/strategies/${strategyId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({
        title: "Success",
        description: "Strategy marked as completed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete strategy",
        variant: "destructive",
      });
    },
  });

  const archiveStrategyMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const response = await apiRequest("PATCH", `/api/strategies/${strategyId}/archive`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tactics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outcomes"] });
      toast({
        title: "Success",
        description: "Strategy and related items archived successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive strategy",
        variant: "destructive",
      });
    },
  });

  const deleteStrategyMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const response = await apiRequest("DELETE", `/api/strategies/${strategyId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tactics"] });
      toast({
        title: "Success",
        description: "Strategy deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete strategy",
        variant: "destructive",
      });
    },
  });

  const handleEditStrategy = (strategy: any) => {
    setSelectedStrategy(strategy);
    setIsEditStrategyOpen(true);
  };

  const handleViewStrategy = (strategy: any) => {
    setSelectedStrategy(strategy);
    setIsViewStrategyOpen(true);
  };

  const handleDeleteStrategy = (strategyId: string) => {
    deleteStrategyMutation.mutate(strategyId);
  };

  const toggleStrategyCollapse = (strategyId: string) => {
    const newCollapsed = new Set(collapsedStrategies);
    if (newCollapsed.has(strategyId)) {
      newCollapsed.delete(strategyId);
    } else {
      newCollapsed.add(strategyId);
    }
    setCollapsedStrategies(newCollapsed);
  };

  if (strategiesLoading) {
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
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Strategy</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage and track strategic initiatives
              </p>
            </div>
            {canCreateStrategies() && (
              <Button onClick={() => setIsCreateStrategyOpen(true)} data-testid="button-create-strategy">
                <Plus className="mr-2 h-4 w-4" />
                New Strategy
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
                placeholder="Search strategies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-strategies"
              />
            </div>
            <Select value={strategyFilter} onValueChange={handleStrategyFilterChange}>
              <SelectTrigger className="w-48" data-testid="select-strategy-filter">
                <Target className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                {(strategies as any[])?.filter(s => s.status !== 'Archived').map((strategy: any) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    {strategy.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Strategies Grid */}
        <div className="p-6">
          {filteredStrategies.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || strategyFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first strategy"}
              </p>
              {canCreateStrategies() && !searchTerm && strategyFilter === "all" && (
                <Button onClick={() => setIsCreateStrategyOpen(true)} data-testid="button-create-first-strategy">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Strategy
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStrategies.map((strategy: any) => {
                const isCollapsed = collapsedStrategies.has(strategy.id);
                const strategyProgress = strategy.progress || 0;
                
                return (
                <Card key={strategy.id} className="overflow-hidden" style={{ borderLeft: `4px solid ${strategy.colorCode}` }}>
                  {/* Compact Header - Always Visible */}
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors py-3 px-4"
                    onClick={() => toggleStrategyCollapse(strategy.id)}
                  >
                    <div className="flex flex-col gap-2">
                      {/* Row 1: Chevron, Status dot, Full Title */}
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: strategy.colorCode }}
                        />
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex-1">
                          {strategy.title}
                        </h3>
                      </div>
                      
                      {/* Row 2: Meta info and actions */}
                      <div className="flex flex-wrap items-center gap-2 pl-8">
                        {/* Date range */}
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3 h-3" />
                          <span className="whitespace-nowrap">{formatDateShort(strategy.startDate)} - {formatDateShort(strategy.targetDate)}</span>
                        </div>
                        
                        {/* Project count */}
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span className="whitespace-nowrap">{strategy.projects.length} project{strategy.projects.length !== 1 ? 's' : ''}</span>
                        </div>
                        
                        {/* Progress Ring */}
                        <ProgressRing progress={strategyProgress} size={32} strokeWidth={3} />
                        
                        {/* Status Badge */}
                        <Badge 
                          variant="outline" 
                          className="text-xs font-medium"
                          style={{ color: strategy.colorCode, borderColor: strategy.colorCode }}
                        >
                          {strategy.status.toLowerCase()}
                        </Badge>
                        
                        {/* Spacer to push buttons right on larger screens */}
                        <div className="flex-1 min-w-0 hidden lg:block" />
                        
                        {/* Metrics Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewStrategy(strategy);
                          }}
                          className="h-7 px-2 text-xs"
                          data-testid={`button-metrics-${strategy.id}`}
                        >
                          <BarChart3 className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Metrics</span>
                        </Button>
                        
                        {/* Continuum Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedContinuum(prev => ({ ...prev, [strategy.id]: !prev[strategy.id] }));
                            if (isCollapsed) {
                              toggleStrategyCollapse(strategy.id);
                            }
                          }}
                          className="h-7 px-2 text-xs"
                          data-testid={`button-continuum-${strategy.id}`}
                        >
                          <RefreshCw className="w-3.5 h-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Continuum</span>
                        </Button>
                        
                        {/* Navigate to Projects */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => navigateToProjects(strategy.id, e)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Go to Projects"
                          data-testid={`button-nav-projects-${strategy.id}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        
                        {/* Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-strategy-menu-${strategy.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewStrategy(strategy);
                              }}
                              data-testid={`button-view-strategy-${strategy.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canEditAllStrategies() && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditStrategy(strategy);
                                  }}
                                  data-testid={`button-edit-strategy-${strategy.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Strategy
                                </DropdownMenuItem>
                                {strategy.status === 'Active' && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      completeStrategyMutation.mutate(strategy.id);
                                    }}
                                    data-testid={`button-complete-${strategy.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Completed
                                  </DropdownMenuItem>
                                )}
                                {strategy.status === 'Completed' && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      archiveStrategyMutation.mutate(strategy.id);
                                    }}
                                    data-testid={`button-archive-${strategy.id}`}
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onSelect={(e) => e.preventDefault()}
                                      data-testid={`button-delete-strategy-${strategy.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Strategy
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Strategy</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{strategy.title}"? This action cannot be undone and will also delete all associated projects.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteStrategy(strategy.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                        data-testid={`button-confirm-delete-strategy-${strategy.id}`}
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
                    </div>
                  </CardHeader>

                  {/* Expanded Content - Projects and Continuum */}
                  {!isCollapsed && (
                    <CardContent className="pt-0 px-6 pb-4">
                      {/* Projects Section */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Projects ({strategy.projects.length})
                          </h4>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateProject(strategy.id);
                            }}
                            className="h-7 px-2 text-xs"
                            style={{ backgroundColor: strategy.colorCode, borderColor: strategy.colorCode }}
                            data-testid={`button-add-project-${strategy.id}`}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Project
                          </Button>
                        </div>

                        {/* Project List */}
                        <div className="space-y-2">
                          {strategy.projects.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                              No projects yet. Create your first project to get started.
                            </p>
                          ) : (
                            strategy.projects.map((project: any) => {
                              const projectActions = getProjectActions(project.id);
                              const isProjectExpanded = !collapsedProjects.has(project.id);
                              const statusBadge = getProjectStatusBadge(project.status);
                              const projectProgress = project.progress || 0;

                              return (
                                <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                                  {/* Project Row */}
                                  <div
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                    onClick={(e) => toggleProjectCollapse(project.id, e)}
                                  >
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      {/* Expand chevron */}
                                      {isProjectExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      )}
                                      
                                      {/* Project title and action count */}
                                      <div className="flex-1 min-w-0">
                                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate block">
                                          {project.title}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {projectActions.length} action{projectActions.length !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                      {/* Navigate to project */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={(e) => navigateToProject(project.id, e)}
                                        title="View project details"
                                        data-testid={`button-view-project-${project.id}`}
                                      >
                                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                                      </Button>

                                      {/* Status badge */}
                                      <Badge className={`text-xs px-1.5 py-0 ${statusBadge.color}`}>
                                        {statusBadge.label}
                                      </Badge>

                                      {/* Progress ring */}
                                      <ProgressRing progress={projectProgress} size={28} strokeWidth={2.5} />
                                    </div>
                                  </div>

                                  {/* Expanded Actions */}
                                  {isProjectExpanded && projectActions.length > 0 && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 px-4 py-2">
                                      <div className="space-y-1.5">
                                        {projectActions.map((action: any) => {
                                          const actionBadge = getActionStatusBadge(action.status);
                                          return (
                                            <div
                                              key={action.id}
                                              className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded px-2 -mx-2 transition-colors"
                                              onClick={() => navigateToAction(action.id)}
                                              data-testid={`action-row-${action.id}`}
                                            >
                                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                <Circle className={`w-2.5 h-2.5 flex-shrink-0 ${getActionStatusColor(action.status)}`} />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate hover:text-primary cursor-pointer">
                                                  {action.title}
                                                </span>
                                              </div>
                                              <Badge className={`text-xs px-1.5 py-0 ml-2 flex-shrink-0 ${actionBadge.color}`}>
                                                {actionBadge.label}
                                              </Badge>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Change Continuum Section - Collapsible */}
                      {expandedContinuum[strategy.id] && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Change Continuum</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                            <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded">
                              <div className="font-medium text-gray-700 dark:text-gray-300 text-xs mb-0.5">Case for Change</div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">{strategy.caseForChange || "To be defined"}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded">
                              <div className="font-medium text-gray-700 dark:text-gray-300 text-xs mb-0.5">Vision Statement</div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">{strategy.visionStatement || "To be defined"}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded">
                              <div className="font-medium text-gray-700 dark:text-gray-300 text-xs mb-0.5">Success Metrics</div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">{strategy.successMetrics || "To be defined"}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded">
                              <div className="font-medium text-gray-700 dark:text-gray-300 text-xs mb-0.5">Stakeholder Map</div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">{strategy.stakeholderMap || "To be defined"}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded">
                              <div className="font-medium text-gray-700 dark:text-gray-300 text-xs mb-0.5">Readiness Rating (RAG)</div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">{strategy.readinessRating || "To be defined"}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded">
                              <div className="font-medium text-gray-700 dark:text-gray-300 text-xs mb-0.5">Risk Exposure Rating</div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">{strategy.riskExposureRating || "To be defined"}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded">
                              <div className="font-medium text-gray-700 dark:text-gray-300 text-xs mb-0.5">Change Champion</div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">{strategy.changeChampionAssignment || "To be defined"}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded">
                              <div className="font-medium text-gray-700 dark:text-gray-300 text-xs mb-0.5">Reinforcement Plan</div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">{strategy.reinforcementPlan || "To be defined"}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded">
                              <div className="font-medium text-gray-700 dark:text-gray-300 text-xs mb-0.5">Benefits Realization</div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">{strategy.benefitsRealizationPlan || "To be defined"}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
              })}
            </div>
          )}
        </div>
      </main>

      <CreateStrategyModal
        open={isCreateStrategyOpen}
        onOpenChange={setIsCreateStrategyOpen}
      />
      <EditStrategyModal
        open={isEditStrategyOpen}
        onOpenChange={setIsEditStrategyOpen}
        strategy={selectedStrategy}
      />
      <ViewStrategyModal
        open={isViewStrategyOpen}
        onOpenChange={setIsViewStrategyOpen}
        strategy={selectedStrategy}
      />
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        strategyId={selectedStrategyId}
      />
    </div>
  );
}
