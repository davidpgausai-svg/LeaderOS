import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { EditProjectModal } from "@/components/modals/edit-project-modal";
import { ViewProjectModal } from "@/components/modals/view-project-modal";
import { ManageBarriersModal } from "@/components/modals/manage-barriers-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  Target, 
  TrendingUp, 
  MoreVertical, 
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  ExternalLink,
  MessageSquarePlus,
  AlertTriangle,
  ShieldCheck,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { useLocation } from "wouter";

type Strategy = {
  id: string;
  title: string;
  description: string;
  colorCode: string;
  status: string;
  startDate: string;
  targetDate: string;
  metrics: string;
  displayOrder?: number;
};

type User = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
};

type Project = {
  id: string;
  title: string;
  description: string;
  strategyId: string;
  kpi: string;
  kpiTracking?: string;
  accountableLeaders: string; // JSON array of user IDs
  resourcesRequired?: string;
  documentFolderUrl?: string | null;
  communicationUrl?: string | null;
  startDate: string;
  dueDate: string;
  status: string; // C, OT, OH, B, NYS
  progress: number;
  createdBy: string;
  createdAt: string;
  isArchived?: string;
  strategy?: Strategy;
};

type Barrier = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  status: 'active' | 'mitigated' | 'resolved' | 'closed';
  ownerId?: string | null;
  targetResolutionDate?: string | null;
  resolutionNotes?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

function formatDateWithoutTimezone(dateString: string): string {
  try {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
  } catch (error) {
    return dateString;
  }
}

export default function Projects() {
  const { currentRole, currentUser, canCreateProjects, canEditProjects } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isViewProjectOpen, setIsViewProjectOpen] = useState(false);
  const [isManageBarriersOpen, setIsManageBarriersOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [barriersProjectId, setBarriersProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [collapsedStrategies, setCollapsedStrategies] = useState<Set<string>>(new Set());

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch all barriers globally
  const { data: allBarriers } = useQuery<Barrier[]>({
    queryKey: ["/api/barriers"],
    queryFn: async () => {
      const response = await fetch("/api/barriers");
      if (!response.ok) throw new Error("Failed to fetch barriers");
      return response.json();
    },
  });

  // Check URL for strategyId param to auto-filter to that strategy
  const urlStrategyId = useMemo(() => 
    new URLSearchParams(location.split('?')[1] ?? '').get('strategyId'),
    [location]
  );
  const lastAppliedUrlParam = useRef<string | null>(null);
  
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

  const navigateToStrategies = (strategyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/strategies?strategyId=${strategyId}`);
  };

  const navigateToActions = (strategyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/actions?strategyId=${strategyId}`);
  };

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/projects/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest("DELETE", `/api/projects/${projectId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
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

  // Enhance projects with strategy data
  const projectsWithDetails = (projects as Project[])?.map((project) => ({
    ...project,
    strategy: (strategies as Strategy[])?.find((s) => s.id === project.strategyId),
  })) || [];

  // Helper functions

  const getAccountableLeaders = (project: Project): User[] => {
    try {
      const leaderIds = JSON.parse(project.accountableLeaders);
      return (users as User[])?.filter((user) => leaderIds.includes(user.id)) || [];
    } catch {
      return [];
    }
  };

  const getUserInitials = (user: User): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    } else if (user.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const getUserName = (user: User): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.lastName) {
      return user.lastName;
    }
    return user.email;
  };

  const canEditProject = (project: Project) => {
    if (currentRole === 'administrator' || currentRole === 'executive') return true;
    
    // Leaders can edit projects where they are accountable
    try {
      const leaderIds = JSON.parse(project.accountableLeaders);
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

  const getProjectBarriers = (projectId: string): Barrier[] => {
    return (allBarriers || []).filter(b => b.projectId === projectId);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "destructive";
      case "mitigated":
        return "default";
      case "resolved":
        return "secondary";
      case "closed":
        return "outline";
      default:
        return "default";
    }
  };

  const handleManageBarriers = (projectId: string) => {
    setBarriersProjectId(projectId);
    setIsManageBarriersOpen(true);
  };

  // Filter projects
  const filteredProjects = projectsWithDetails.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.strategy?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = true;
    const matchesStrategy = strategyFilter === "all" || project.strategyId === strategyFilter;
    
    // Filter out archived projects and projects from archived strategies
    const isNotArchived = project.isArchived !== 'true' && project.strategy?.status !== 'Archived';
    
    // Role-based filtering
    let matchesRole = true;
    if (currentRole === 'leader') {
      try {
        const leaderIds = JSON.parse(project.accountableLeaders);
        matchesRole = leaderIds.includes(currentUser?.id);
      } catch {
        matchesRole = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesStrategy && isNotArchived && matchesRole;
  });

  // Group projects by strategy
  const projectsByStrategy = filteredProjects.reduce((groups, project) => {
    const strategyId = project.strategyId;
    if (!groups[strategyId]) {
      groups[strategyId] = [];
    }
    groups[strategyId].push(project);
    return groups;
  }, {} as Record<string, Project[]>);

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

  const handleStatusChange = (projectId: string, newStatus: string) => {
    updateProjectMutation.mutate({
      id: projectId,
      updates: { status: newStatus }
    });
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProjectMutation.mutate(projectId);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsEditProjectOpen(true);
  };

  const handleViewProject = (project: Project) => {
    setViewingProject(project);
    setIsViewProjectOpen(true);
  };

  const closeEditModal = () => {
    setIsEditProjectOpen(false);
    setEditingProject(null);
  };

  const closeViewModal = () => {
    setIsViewProjectOpen(false);
    setViewingProject(null);
  };

  if (projectsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg">Loading projects...</div>
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
            {canCreateProjects() && (
              <Button onClick={() => setIsCreateProjectOpen(true)} data-testid="button-create-project">
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
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-projects"
                />
              </div>
            </div>
            
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
          {sortedStrategies.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No strategies found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || strategyFilter !== "all" 
                  ? "Try adjusting your filters to see more strategies."
                  : "Get started by creating your first project."
                }
              </p>
              {canCreateProjects() && !searchTerm && strategyFilter === "all" && (
                <Button onClick={() => setIsCreateProjectOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Project
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {sortedStrategies.map((strategy) => {
                const strategyProjects = projectsByStrategy[strategy.id] || [];
                const strategyId = strategy.id;
                const isCollapsed = collapsedStrategies.has(strategyId);
                
                if (!strategy) return null;
                
                // Sort projects by creation date within each strategy
                const sortedProjects = [...strategyProjects].sort((a, b) => 
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );

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
                              {strategyProjects.length} project{strategyProjects.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" style={{ color: strategy.colorCode }}>
                            {strategy.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => navigateToStrategies(strategyId, e)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Go to Strategies"
                            data-testid={`button-nav-strategies-${strategyId}`}
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => navigateToActions(strategyId, e)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Go to Actions"
                            data-testid={`button-nav-actions-${strategyId}`}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {!isCollapsed && (
                      <CardContent className="p-0">
                        <div className="space-y-4 p-6 pt-0">
                          {sortedProjects.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                              No projects established
                            </p>
                          ) : (
                            sortedProjects.map((project) => {
                            const statusInfo = getStatusDisplay(project.status);
                            const accountableLeaders = getAccountableLeaders(project);
                            
                            return (
                              <Card key={project.id} className="border border-gray-200 dark:border-gray-700">
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                          {project.title}
                                        </h3>
                                        <Badge 
                                          className={`${statusInfo.color} text-white`}
                                          data-testid={`badge-status-${project.id}`}
                                        >
                                          {statusInfo.label}
                                        </Badge>
                                      </div>
                                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        {project.description}
                                      </p>
                                      
                                      {/* Communication Plan Link */}
                                      {project.communicationUrl && (
                                        <a
                                          href={project.communicationUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-2"
                                          data-testid={`link-communication-plan-${project.id}`}
                                          aria-label="Open communication plan in new tab"
                                        >
                                          <MessageSquarePlus className="w-4 h-4" />
                                          Communication Plan
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                    
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" data-testid={`menu-project-${project.id}`}>
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                          onClick={() => handleViewProject(project)}
                                          data-testid={`button-view-${project.id}`}
                                        >
                                          <Eye className="w-4 h-4 mr-2" />
                                          View Details
                                        </DropdownMenuItem>
                                        {canEditProject(project) && (
                                          <>
                                            <DropdownMenuItem 
                                              onClick={() => handleEditProject(project)}
                                              data-testid={`button-edit-${project.id}`}
                                            >
                                              <Edit className="w-4 h-4 mr-2" />
                                              Edit Project
                                            </DropdownMenuItem>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <DropdownMenuItem 
                                                  onSelect={(e) => e.preventDefault()}
                                                  className="text-red-600"
                                                  data-testid={`button-delete-${project.id}`}
                                                >
                                                  <Trash2 className="w-4 h-4 mr-2" />
                                                  Delete
                                                </DropdownMenuItem>
                                              </AlertDialogTrigger>
                                            <AlertDialogContent>
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
                                      <p className="text-gray-900 dark:text-white font-medium">{project.kpi}</p>
                                      {project.kpiTracking && (
                                        <div className="flex items-center space-x-2">
                                          <TrendingUp className="w-4 h-4 text-green-500" />
                                          <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {project.kpiTracking}
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
                                        <TooltipProvider>
                                          {accountableLeaders.map((leader) => (
                                            <Tooltip key={leader.id}>
                                              <TooltipTrigger asChild>
                                                <div 
                                                  className="w-8 h-8 rounded-full bg-purple-500 dark:bg-purple-600 flex items-center justify-center text-white text-xs font-medium cursor-default"
                                                  data-testid={`leader-initial-${leader.id}`}
                                                >
                                                  {getUserInitials(leader)}
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>{getUserName(leader)}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          ))}
                                        </TooltipProvider>
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
                                        <div>Start: {formatDateWithoutTimezone(project.startDate)}</div>
                                        <div>Due: {formatDateWithoutTimezone(project.dueDate)}</div>
                                      </div>
                                    </div>

                                    {/* Resources Component */}
                                    {project.resourcesRequired && (
                                      <div className="space-y-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Resources Required
                                        </span>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                          {project.resourcesRequired}
                                        </p>
                                      </div>
                                    )}

                                    {project.documentFolderUrl && (
                                      <div className="space-y-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Document Folder
                                        </span>
                                        <a
                                          href={project.documentFolderUrl}
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

                                  {/* Barriers Section */}
                                  {(() => {
                                    const projectBarriers = getProjectBarriers(project.id);
                                    const activeBarriers = projectBarriers.filter(b => b.status === 'active' || b.status === 'mitigated');
                                    const displayBarriers = activeBarriers.slice(0, 2);
                                    const remainingCount = activeBarriers.length - 2;
                                    
                                    if (activeBarriers.length > 0) {
                                      return (
                                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                              <span className="text-sm font-semibold text-red-900 dark:text-red-200">
                                                Active Barriers ({activeBarriers.length})
                                              </span>
                                            </div>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleManageBarriers(project.id)}
                                              data-testid={`button-manage-barriers-${project.id}`}
                                              className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                                            >
                                              Manage
                                            </Button>
                                          </div>
                                          <div className="space-y-2">
                                            {displayBarriers.map((barrier) => (
                                              <div key={barrier.id} className="flex items-start gap-2" data-testid={`barrier-item-${barrier.id}`}>
                                                <div className={`w-2 h-2 rounded-full mt-1.5 ${getSeverityColor(barrier.severity)}`} />
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                      {barrier.title}
                                                    </span>
                                                    <Badge variant={getStatusBadgeVariant(barrier.status) as any} className="text-xs capitalize">
                                                      {barrier.status}
                                                    </Badge>
                                                  </div>
                                                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                                                    {barrier.description}
                                                  </p>
                                                </div>
                                              </div>
                                            ))}
                                            {remainingCount > 0 && (
                                              <button
                                                onClick={() => handleManageBarriers(project.id)}
                                                className="text-xs text-red-700 dark:text-red-300 hover:underline font-medium"
                                                data-testid={`button-show-more-barriers-${project.id}`}
                                              >
                                                +{remainingCount} more barrier{remainingCount !== 1 ? 's' : ''}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    } else if (canEditProject(project)) {
                                      return (
                                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                              <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                                No active barriers
                                              </span>
                                            </div>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleManageBarriers(project.id)}
                                              data-testid={`button-add-barrier-${project.id}`}
                                              className="text-xs"
                                            >
                                              + Add Barrier
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {/* Action Controls */}
                                  {canEditProject(project) && (
                                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                      <Select
                                        value={project.status}
                                        onValueChange={(value) => handleStatusChange(project.id, value)}
                                      >
                                        <SelectTrigger className="w-40" data-testid={`select-status-${project.id}`}>
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
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{project.progress}%</span>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
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
      <CreateProjectModal 
        isOpen={isCreateProjectOpen} 
        onClose={() => setIsCreateProjectOpen(false)} 
      />
      <EditProjectModal 
        isOpen={isEditProjectOpen} 
        onClose={closeEditModal}
        project={editingProject}
      />
      <ViewProjectModal 
        isOpen={isViewProjectOpen} 
        onClose={closeViewModal}
        project={viewingProject}
      />
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