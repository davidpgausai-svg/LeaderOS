import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateStrategyModal } from "@/components/modals/create-strategy-modal";
import { EditStrategyModal } from "@/components/modals/edit-strategy-modal";
import { ViewStrategyModal } from "@/components/modals/view-strategy-modal";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { EditProjectModal } from "@/components/modals/edit-project-modal";
import { ViewProjectModal } from "@/components/modals/view-project-modal";
import { ManageBarriersModal } from "@/components/modals/manage-barriers-modal";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, Search, Trash2, MoreVertical, Edit, Eye, CheckCircle, Archive, ChevronDown, ChevronRight, ChevronUp, ArrowRight, Target, Calendar, BarChart3, RefreshCw, Circle, FolderOpen, TrendingUp, AlertTriangle, Users, Megaphone, Link2, ExternalLink, X } from "lucide-react";
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
  const [metricsModalStrategy, setMetricsModalStrategy] = useState<any>(null);
  const [continuumModalStrategy, setContinuumModalStrategy] = useState<any>(null);
  const [leadersModalProject, setLeadersModalProject] = useState<any>(null);
  const [collapsedStrategies, setCollapsedStrategies] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  // Project icon bar modal states
  const [barriersProjectId, setBarriersProjectId] = useState<string | null>(null);
  const [isManageBarriersOpen, setIsManageBarriersOpen] = useState(false);
  const [timelineModalProject, setTimelineModalProject] = useState<any>(null);
  const [kpiModalProject, setKpiModalProject] = useState<any>(null);
  const [documentsModalProject, setDocumentsModalProject] = useState<any>(null);
  const [communicationModalProject, setCommunicationModalProject] = useState<any>(null);
  const [dependenciesModalProject, setDependenciesModalProject] = useState<any>(null);
  const [selectedDependencyType, setSelectedDependencyType] = useState<"project" | "action" | null>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [viewingProject, setViewingProject] = useState<any>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isViewProjectOpen, setIsViewProjectOpen] = useState(false);

  const { data: strategies, isLoading: strategiesLoading } = useQuery<any[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: projects } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch all actions for expandable actions section
  const { data: actions } = useQuery<any[]>({
    queryKey: ["/api/actions"],
  });

  // Fetch all barriers for barrier icons
  const { data: barriers } = useQuery<any[]>({
    queryKey: ["/api/barriers"],
  });

  // Fetch all users for leader lookups
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all dependencies for dependency icons
  const { data: dependencies } = useQuery<any[]>({
    queryKey: ["/api/dependencies"],
  });

  // Helper to check if a project has dependencies
  const projectHasDependencies = (projectId: string) => {
    if (!dependencies) return false;
    return dependencies.some(
      (d: any) => 
        (d.sourceType === 'project' && d.sourceId === projectId) ||
        (d.targetType === 'project' && d.targetId === projectId)
    );
  };

  // Helper to get project dependencies
  const getProjectDependencies = (projectId: string) => {
    if (!dependencies) return [];
    return dependencies.filter(
      (d: any) => 
        (d.sourceType === 'project' && d.sourceId === projectId) ||
        (d.targetType === 'project' && d.targetId === projectId)
    );
  };

  // Helper to get timeline color based on due date
  const getTimelineColor = (project: any) => {
    if (!project?.dueDate) return 'gray';
    const now = new Date();
    const dueDate = new Date(project.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'red'; // Past due
    if (daysUntilDue <= 7) return 'yellow'; // Within 7 days
    return 'green'; // On track
  };

  // Helper to get timeline icon classes
  const getTimelineIconClass = (project: any) => {
    const color = getTimelineColor(project);
    switch (color) {
      case 'red': return 'text-red-500';
      case 'yellow': return 'text-yellow-500';
      case 'green': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  // Helper to get leader names from project's accountableLeaders
  const getProjectLeaders = (project: any) => {
    if (!project?.accountableLeaders || !users) return [];
    try {
      const leaderIds = JSON.parse(project.accountableLeaders);
      if (!Array.isArray(leaderIds)) return [];
      return leaderIds
        .map((id: string) => users.find((u: any) => u.id === id))
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  // Helper to check if a project has active barriers
  const projectHasActiveBarriers = (projectId: string) => {
    if (!barriers) return false;
    return barriers.some((b: any) => b.projectId === projectId && b.status === 'active');
  };

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

  // Navigate to Actions page with deep-link to specific action
  const navigateToAction = (actionId: string) => {
    setLocation(`/actions?actionId=${actionId}`);
  };

  // Toggle project expand/collapse (projects are collapsed by default)
  const toggleProjectCollapse = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // Get actions for a specific project (sorted by due date)
  const getProjectActions = (projectId: string) => {
    const filtered = (actions || []).filter(a => a.projectId === projectId && a.isArchived !== 'true');
    // Sort by due date (items without due date go last)
    return filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
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

  // Get circle color for status dropdown
  const getStatusCircleColor = (status: string) => {
    switch (status) {
      case 'C': return 'bg-green-500';
      case 'OT': return 'bg-blue-500';
      case 'OH': return 'bg-yellow-500';
      case 'B': return 'bg-red-500';
      case 'NYS': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Status options for dropdown
  const projectStatusOptions = [
    { value: 'NYS', label: 'Not Yet Started', shortLabel: 'NYS' },
    { value: 'OT', label: 'On Track', shortLabel: 'OT' },
    { value: 'OH', label: 'On Hold', shortLabel: 'OH' },
    { value: 'B', label: 'Behind', shortLabel: 'B' },
    { value: 'C', label: 'Completed', shortLabel: 'C' },
  ];

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
        description: "Priority marked as completed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete priority",
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
        description: "Priority and related items archived successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive priority",
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
        description: "Priority deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete priority",
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

  // Project action handlers
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    },
  });

  const createDependencyMutation = useMutation({
    mutationFn: async (data: { sourceType: string; sourceId: string; targetType: string; targetId: string }) => {
      const response = await apiRequest("POST", "/api/dependencies", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dependencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Dependency added successfully",
      });
      setSelectedDependencyType(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add dependency",
        variant: "destructive",
      });
    },
  });

  const deleteDependencyMutation = useMutation({
    mutationFn: async (dependencyId: string) => {
      await apiRequest("DELETE", `/api/dependencies/${dependencyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dependencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Dependency removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove dependency",
        variant: "destructive",
      });
    },
  });

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setIsEditProjectOpen(true);
  };

  const handleViewProject = (project: any) => {
    setViewingProject(project);
    setIsViewProjectOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProjectMutation.mutate(projectId);
  };

  const handleManageBarriers = (projectId: string) => {
    setBarriersProjectId(projectId);
    setIsManageBarriersOpen(true);
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Strategic Priority</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage and track strategic initiatives
              </p>
            </div>
            {canCreateStrategies() && (
              <Button onClick={() => setIsCreateStrategyOpen(true)} data-testid="button-create-strategy">
                <Plus className="mr-2 h-4 w-4" />
                New Strategic Priority
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No strategic priorities found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || strategyFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first strategic priority"}
              </p>
              {canCreateStrategies() && !searchTerm && strategyFilter === "all" && (
                <Button onClick={() => setIsCreateStrategyOpen(true)} data-testid="button-create-first-strategy">
                  <Plus className="mr-2 h-4 w-4" />
                  New Strategic Priority
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
                        
                        {/* Action buttons wrapper - stops propagation to prevent CardHeader click */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Metrics Button - opens modal */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMetricsModalStrategy(strategy)}
                            className="h-7 px-2 text-xs"
                            data-testid={`button-metrics-${strategy.id}`}
                          >
                            <BarChart3 className="w-3.5 h-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Metrics</span>
                          </Button>
                          
                          {/* Continuum Button - opens modal */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContinuumModalStrategy(strategy)}
                            className="h-7 px-2 text-xs"
                            data-testid={`button-continuum-${strategy.id}`}
                          >
                            <RefreshCw className="w-3.5 h-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Continuum</span>
                          </Button>
                        </div>
                        
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
                                  Edit Priority
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
                                      Delete Priority
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Priority</AlertDialogTitle>
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
                            [...strategy.projects]
                              .sort((a: any, b: any) => {
                                // Sort by start date (earliest first), projects without start date go last
                                const aDate = a.startDate ? new Date(a.startDate).getTime() : null;
                                const bDate = b.startDate ? new Date(b.startDate).getTime() : null;
                                const aValid = aDate !== null && !isNaN(aDate);
                                const bValid = bDate !== null && !isNaN(bDate);
                                if (!aValid && !bValid) return 0;
                                if (!aValid) return 1;
                                if (!bValid) return -1;
                                return aDate - bDate;
                              })
                              .map((project: any) => {
                              const projectActions = getProjectActions(project.id);
                              const isProjectExpanded = expandedProjects.has(project.id);
                              const statusBadge = getProjectStatusBadge(project.status);
                              const projectProgress = project.progress || 0;

                              return (
                                <div key={project.id} className="border border-gray-300 dark:border-gray-600 rounded-lg">
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
                                      
                                      {/* Project title, status badge, and action count */}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          {/* Title and Status - left side */}
                                          <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
                                            <span className="font-medium text-base text-gray-900 dark:text-white truncate">
                                              {project.title}
                                            </span>
                                            {/* Status dropdown - immediately after title */}
                                            {canEditAllStrategies() ? (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 px-1.5 py-0 flex items-center gap-1"
                                                  onClick={(e) => e.stopPropagation()}
                                                  data-testid={`status-dropdown-${project.id}`}
                                                >
                                                  <div className={`w-3 h-3 rounded-full ${getStatusCircleColor(project.status)}`} />
                                                  <ChevronDown className="w-3 h-3 text-gray-500" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                                                {projectStatusOptions.map((option) => (
                                                  <DropdownMenuItem
                                                    key={option.value}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      updateProjectStatusMutation.mutate({ projectId: project.id, status: option.value });
                                                    }}
                                                    className="flex items-center gap-2"
                                                    data-testid={`status-option-${option.value}-${project.id}`}
                                                  >
                                                    <div className={`w-3 h-3 rounded-full ${getStatusCircleColor(option.value)}`} />
                                                    <span>{option.label}</span>
                                                    {project.status === option.value && (
                                                      <CheckCircle className="w-3 h-3 ml-auto text-green-500" />
                                                    )}
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          ) : (
                                            <Badge className={`text-xs px-1.5 py-0 ${statusBadge.color}`}>
                                              {statusBadge.label}
                                            </Badge>
                                          )}
                                          </div>
                                          
                                          {/* Icon Bar - pushed to the right */}
                                          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
                                            {/* Timeline - color coded (after status dropdown) */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setTimelineModalProject(project);
                                              }}
                                              title="View timeline"
                                              data-testid={`button-timeline-${project.id}`}
                                            >
                                              <Calendar className={`w-3.5 h-3.5 ${getTimelineIconClass(project)}`} />
                                            </Button>
                                            
                                            {/* Leaders */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setLeadersModalProject(project);
                                              }}
                                              title="View project leaders"
                                              data-testid={`button-view-leaders-${project.id}`}
                                            >
                                              <Users className="w-3.5 h-3.5 text-gray-500" />
                                            </Button>
                                            
                                            {/* Barriers - grey if none, red if active */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleManageBarriers(project.id);
                                              }}
                                              title={projectHasActiveBarriers(project.id) ? "Manage barriers" : "Add barrier"}
                                              data-testid={`button-barriers-${project.id}`}
                                            >
                                              <AlertTriangle className={`w-3.5 h-3.5 ${projectHasActiveBarriers(project.id) ? 'text-red-500' : 'text-gray-400'}`} />
                                            </Button>
                                            
                                            {/* Dependencies - right after Barriers */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDependenciesModalProject(project);
                                              }}
                                              title={projectHasDependencies(project.id) ? "View dependencies" : "No dependencies"}
                                              data-testid={`button-dependencies-${project.id}`}
                                            >
                                              <Link2 className={`w-3.5 h-3.5 ${projectHasDependencies(project.id) ? 'text-blue-500' : 'text-gray-400'}`} />
                                            </Button>
                                            
                                            {/* KPI */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setKpiModalProject(project);
                                              }}
                                              title="View KPIs"
                                              data-testid={`button-kpi-${project.id}`}
                                            >
                                              <Target className="w-3.5 h-3.5 text-gray-500" />
                                            </Button>
                                            
                                            {/* Documents */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (project.documentFolderUrl) {
                                                  window.open(project.documentFolderUrl, '_blank');
                                                } else {
                                                  setDocumentsModalProject(project);
                                                }
                                              }}
                                              title={project.documentFolderUrl ? "Open project documents" : "No documents linked"}
                                              data-testid={`button-documents-${project.id}`}
                                            >
                                              <FolderOpen className={`w-3.5 h-3.5 ${project.documentFolderUrl ? 'text-blue-500' : 'text-gray-400'}`} />
                                            </Button>
                                            
                                            {/* Communication */}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (project.communicationUrl) {
                                                  window.open(project.communicationUrl, '_blank');
                                                } else {
                                                  setCommunicationModalProject(project);
                                                }
                                              }}
                                              title={project.communicationUrl ? "Open communication plan" : "No communication plan linked"}
                                              data-testid={`button-communication-${project.id}`}
                                            >
                                              <Megaphone className={`w-3.5 h-3.5 ${project.communicationUrl ? 'text-blue-500' : 'text-gray-400'}`} />
                                            </Button>
                                            
                                            {/* Three dots menu */}
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button 
                                                  variant="ghost" 
                                                  size="sm" 
                                                  className="h-6 w-6 p-0"
                                                  onClick={(e) => e.stopPropagation()}
                                                  data-testid={`menu-project-${project.id}`}
                                                >
                                                  <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewProject(project);
                                                  }}
                                                  data-testid={`menu-view-project-${project.id}`}
                                                >
                                                  <Eye className="w-4 h-4 mr-2" />
                                                  View Details
                                                </DropdownMenuItem>
                                                {canEditAllStrategies() && (
                                                  <>
                                                    <DropdownMenuItem 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditProject(project);
                                                      }}
                                                      data-testid={`menu-edit-project-${project.id}`}
                                                    >
                                                      <Edit className="w-4 h-4 mr-2" />
                                                      Edit Project
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem 
                                                          onSelect={(e) => e.preventDefault()}
                                                          className="text-red-600"
                                                          data-testid={`menu-delete-project-${project.id}`}
                                                        >
                                                          <Trash2 className="w-4 h-4 mr-2" />
                                                          Delete
                                                        </DropdownMenuItem>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                        <AlertDialogHeader>
                                                          <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                                          <AlertDialogDescription>
                                                            Are you sure you want to delete "{project.title}"? This action cannot be undone.
                                                          </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                          <AlertDialogAction
                                                            onClick={() => handleDeleteProject(project.id)}
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
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {projectActions.length} action{projectActions.length !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2 flex-shrink-0">
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

      {/* Key Metrics Modal */}
      <Dialog open={!!metricsModalStrategy} onOpenChange={(open) => !open && setMetricsModalStrategy(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Key Metrics
            </DialogTitle>
          </DialogHeader>
          {metricsModalStrategy && (
            <div className="space-y-4">
              {/* Strategy Title and Status */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {metricsModalStrategy.title}
                  </h3>
                  <Badge 
                    variant="outline" 
                    className="mt-1 text-xs"
                    style={{ color: metricsModalStrategy.colorCode, borderColor: metricsModalStrategy.colorCode }}
                  >
                    {metricsModalStrategy.status?.toLowerCase()}
                  </Badge>
                </div>
                <ProgressRing progress={metricsModalStrategy.progress || 0} size={48} strokeWidth={4} />
              </div>

              {/* Timeline and Projects Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Timeline</span>
                  </div>
                  <div className="text-sm">
                    <div>Start: <span className="font-medium">{metricsModalStrategy.startDate ? new Date(metricsModalStrategy.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</span></div>
                    <div>Target: <span className="font-medium">{metricsModalStrategy.targetDate ? new Date(metricsModalStrategy.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Projects</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {metricsModalStrategy.projects?.filter((p: any) => p.status === 'C').length || 0}/{metricsModalStrategy.projects?.length || 0}
                  </div>
                  <div className="text-sm text-gray-500">{metricsModalStrategy.progress || 0}% complete</div>
                </div>
              </div>

              {/* Success Metrics */}
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Success Metrics</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {metricsModalStrategy.successMetrics || "No metrics defined"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Continuum Modal */}
      <Dialog open={!!continuumModalStrategy} onOpenChange={(open) => !open && setContinuumModalStrategy(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Change Continuum
            </DialogTitle>
          </DialogHeader>
          {continuumModalStrategy && (
            <div className="space-y-4">
              {/* Strategy Title and Status */}
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {continuumModalStrategy.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Change management framework</p>
                </div>
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ color: continuumModalStrategy.colorCode, borderColor: continuumModalStrategy.colorCode }}
                >
                  {continuumModalStrategy.status?.toLowerCase()}
                </Badge>
              </div>

              {/* Numbered Continuum Fields */}
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">1. Case for Change</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{continuumModalStrategy.caseForChange || "To be defined"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">2. Vision Statement</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{continuumModalStrategy.visionStatement || "To be defined"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">3. Success Metrics</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{continuumModalStrategy.successMetrics || "To be defined"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">4. Stakeholder Map</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{continuumModalStrategy.stakeholderMap || "To be defined"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">5. Readiness Rating (RAG)</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{continuumModalStrategy.readinessRating || "To be defined"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">6. Risk Exposure Rating</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{continuumModalStrategy.riskExposureRating || "To be defined"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">7. Change Champion</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{continuumModalStrategy.changeChampionAssignment || "To be defined"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">8. Reinforcement Plan</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{continuumModalStrategy.reinforcementPlan || "To be defined"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">9. Benefits Realization</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{continuumModalStrategy.benefitsRealizationPlan || "To be defined"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Project Leaders Modal */}
      <Dialog open={!!leadersModalProject} onOpenChange={(open) => !open && setLeadersModalProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Project Leaders
            </DialogTitle>
          </DialogHeader>
          {leadersModalProject && (
            <div className="space-y-4">
              {/* Project Title */}
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {leadersModalProject.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Accountable leaders for this project</p>
              </div>

              {/* Leaders List */}
              <div className="space-y-2">
                {getProjectLeaders(leadersModalProject).length > 0 ? (
                  getProjectLeaders(leadersModalProject).map((leader: any) => {
                    const fullName = [leader.firstName, leader.lastName].filter(Boolean).join(' ');
                    return (
                      <div
                        key={leader.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {fullName || leader.email}
                          </div>
                          {fullName && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {leader.email}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                            {leader.role?.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No leaders assigned to this project</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Timeline Modal */}
      <Dialog open={!!timelineModalProject} onOpenChange={(open) => !open && setTimelineModalProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Project Timeline
            </DialogTitle>
          </DialogHeader>
          {timelineModalProject && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {timelineModalProject.title}
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Start Date</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {timelineModalProject.startDate 
                      ? new Date(timelineModalProject.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Due Date</span>
                  <span className={`font-medium ${getTimelineColor(timelineModalProject) === 'red' ? 'text-red-600' : getTimelineColor(timelineModalProject) === 'yellow' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {timelineModalProject.dueDate 
                      ? new Date(timelineModalProject.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Not set'}
                  </span>
                </div>
                <div className={`p-3 rounded-lg ${
                  getTimelineColor(timelineModalProject) === 'red' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                  getTimelineColor(timelineModalProject) === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
                  'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                }`}>
                  <span className={`text-sm font-medium ${
                    getTimelineColor(timelineModalProject) === 'red' ? 'text-red-700 dark:text-red-300' :
                    getTimelineColor(timelineModalProject) === 'yellow' ? 'text-yellow-700 dark:text-yellow-300' :
                    'text-green-700 dark:text-green-300'
                  }`}>
                    {getTimelineColor(timelineModalProject) === 'red' ? 'Past Due' :
                     getTimelineColor(timelineModalProject) === 'yellow' ? 'Due Soon' :
                     'On Track'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* KPI Modal */}
      <Dialog open={!!kpiModalProject} onOpenChange={(open) => !open && setKpiModalProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Project KPIs
            </DialogTitle>
          </DialogHeader>
          {kpiModalProject && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {kpiModalProject.title}
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Key Performance Indicator</div>
                  <p className="text-gray-900 dark:text-white">
                    {kpiModalProject.kpi || 'No KPI defined'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">KPI Tracking</div>
                  <p className="text-gray-900 dark:text-white">
                    {kpiModalProject.kpiTracking || 'No tracking data'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Documents Modal (No folder linked) */}
      <Dialog open={!!documentsModalProject} onOpenChange={(open) => !open && setDocumentsModalProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Project Documents
            </DialogTitle>
          </DialogHeader>
          {documentsModalProject && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {documentsModalProject.title}
                </h3>
              </div>
              
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No document folder linked</p>
                <p className="text-xs mt-1">Edit the project to add a document folder URL</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Communication Modal (No plan linked) */}
      <Dialog open={!!communicationModalProject} onOpenChange={(open) => !open && setCommunicationModalProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Communication Plan
            </DialogTitle>
          </DialogHeader>
          {communicationModalProject && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {communicationModalProject.title}
                </h3>
              </div>
              
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No communication plan linked</p>
                <p className="text-xs mt-1">Edit the project to add a communication plan URL</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dependencies Modal */}
      <Dialog 
        open={!!dependenciesModalProject} 
        onOpenChange={(open) => {
          if (!open) {
            setDependenciesModalProject(null);
            setSelectedDependencyType(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Project Dependencies
            </DialogTitle>
          </DialogHeader>
          {dependenciesModalProject && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {dependenciesModalProject.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage dependencies for this project
                </p>
              </div>
              
              {/* Add Dependency Section */}
              {canEditAllStrategies() && (
                <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                  {!selectedDependencyType ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select dependency type
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedDependencyType("project")}
                          data-testid="button-select-project-type"
                        >
                          Project
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedDependencyType("action")}
                          data-testid="button-select-action-type"
                        >
                          Action
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDependencyType(null)}
                          className="text-xs h-7 px-2"
                          data-testid="button-back-dependency-type"
                        >
                          <ArrowRight className="w-3 h-3 mr-1 rotate-180" />
                          Back
                        </Button>
                        <span className="text-xs text-gray-500">
                          Select {selectedDependencyType}
                        </span>
                      </div>
                      <Command className="border rounded-lg">
                        <CommandInput
                          placeholder={`Search ${selectedDependencyType}s...`}
                          data-testid="input-search-dependency-target"
                        />
                        <CommandList className="max-h-48">
                          <CommandEmpty>No {selectedDependencyType}s found.</CommandEmpty>
                          <CommandGroup heading={`Available ${selectedDependencyType}s`}>
                            {selectedDependencyType === "project" && (projects || [])
                              .filter((p: any) => 
                                p.id !== dependenciesModalProject.id &&
                                p.isArchived !== 'true' &&
                                !getProjectDependencies(dependenciesModalProject.id).some(
                                  (d: any) => d.targetType === 'project' && d.targetId === p.id
                                )
                              )
                              .map((project: any) => {
                                const strategy = (strategies || []).find((s: any) => s.id === project.strategyId);
                                return (
                                  <CommandItem
                                    key={project.id}
                                    value={project.title}
                                    onSelect={() => {
                                      createDependencyMutation.mutate({
                                        sourceType: 'project',
                                        sourceId: dependenciesModalProject.id,
                                        targetType: 'project',
                                        targetId: project.id,
                                      });
                                    }}
                                    className="flex items-center gap-2 cursor-pointer"
                                    data-testid={`option-project-${project.id}`}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: strategy?.colorCode || '#3B82F6' }}
                                    />
                                    <span className="flex-1 truncate">{project.title}</span>
                                    {strategy && (
                                      <span className="text-xs text-gray-400 truncate max-w-24">
                                        {strategy.title}
                                      </span>
                                    )}
                                  </CommandItem>
                                );
                              })}
                            {selectedDependencyType === "action" && (actions || [])
                              .filter((a: any) => 
                                a.isArchived !== 'true' &&
                                !getProjectDependencies(dependenciesModalProject.id).some(
                                  (d: any) => d.targetType === 'action' && d.targetId === a.id
                                )
                              )
                              .map((action: any) => {
                                const strategy = (strategies || []).find((s: any) => s.id === action.strategyId);
                                return (
                                  <CommandItem
                                    key={action.id}
                                    value={action.title}
                                    onSelect={() => {
                                      createDependencyMutation.mutate({
                                        sourceType: 'project',
                                        sourceId: dependenciesModalProject.id,
                                        targetType: 'action',
                                        targetId: action.id,
                                      });
                                    }}
                                    className="flex items-center gap-2 cursor-pointer"
                                    data-testid={`option-action-${action.id}`}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: strategy?.colorCode || '#3B82F6' }}
                                    />
                                    <span className="flex-1 truncate">{action.title}</span>
                                    {strategy && (
                                      <span className="text-xs text-gray-400 truncate max-w-24">
                                        {strategy.title}
                                      </span>
                                    )}
                                  </CommandItem>
                                );
                              })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  )}
                </div>
              )}

              {/* Existing Dependencies List */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Current Dependencies ({getProjectDependencies(dependenciesModalProject.id).length})
                </p>
                {getProjectDependencies(dependenciesModalProject.id).length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getProjectDependencies(dependenciesModalProject.id).map((dep: any) => {
                      const isSource = dep.sourceType === 'project' && dep.sourceId === dependenciesModalProject.id;
                      const targetType = isSource ? dep.targetType : dep.sourceType;
                      const targetId = isSource ? dep.targetId : dep.sourceId;
                      const direction = isSource ? 'Depends on' : 'Blocked by';
                      
                      const getTargetTitle = () => {
                        if (targetType === 'project') {
                          const project = (projects || []).find((p: any) => p.id === targetId);
                          return project?.title || 'Unknown Project';
                        } else {
                          const action = (actions || []).find((a: any) => a.id === targetId);
                          return action?.title || 'Unknown Action';
                        }
                      };

                      const getTargetStrategy = () => {
                        if (targetType === 'project') {
                          const project = (projects || []).find((p: any) => p.id === targetId);
                          return (strategies || []).find((s: any) => s.id === project?.strategyId);
                        } else {
                          const action = (actions || []).find((a: any) => a.id === targetId);
                          return (strategies || []).find((s: any) => s.id === action?.strategyId);
                        }
                      };

                      const targetStrategy = getTargetStrategy();
                      
                      return (
                        <div
                          key={dep.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            isSource 
                              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
                              : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
                          }`}
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: targetStrategy?.colorCode || '#3B82F6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {getTargetTitle()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <span className={isSource ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}>
                                {direction}
                              </span>
                              <span>({targetType})</span>
                              {targetStrategy && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span className="truncate max-w-24">{targetStrategy.title}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {canEditAllStrategies() && isSource && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                              onClick={() => deleteDependencyMutation.mutate(dep.id)}
                              data-testid={`button-remove-dep-${dep.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No dependencies for this project</p>
                    {!canEditAllStrategies() && (
                      <p className="text-xs mt-1">Contact an administrator to add dependencies</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Project Edit/View Modals */}
      {editingProject && (
        <EditProjectModal
          isOpen={isEditProjectOpen}
          onClose={() => {
            setIsEditProjectOpen(false);
            setEditingProject(null);
          }}
          project={editingProject}
        />
      )}
      
      {viewingProject && (
        <ViewProjectModal
          isOpen={isViewProjectOpen}
          onClose={() => {
            setIsViewProjectOpen(false);
            setViewingProject(null);
          }}
          project={viewingProject}
        />
      )}

      {/* Manage Barriers Modal */}
      {barriersProjectId && (
        <ManageBarriersModal
          isOpen={isManageBarriersOpen}
          onClose={() => {
            setIsManageBarriersOpen(false);
            setBarriersProjectId(null);
          }}
          projectId={barriersProjectId}
        />
      )}
    </div>
  );
}
