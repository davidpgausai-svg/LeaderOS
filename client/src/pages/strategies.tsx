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
import { Plus, Search, Trash2, MoreVertical, Edit, Eye, CheckCircle, Archive, ChevronDown, ChevronRight, ChevronUp, ArrowRight, Target } from "lucide-react";
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

  const { data: strategies, isLoading: strategiesLoading } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Check URL for strategyId param to auto-filter to that strategy
  const urlStrategyId = useMemo(() => 
    new URLSearchParams(location.split('?')[1] ?? '').get('strategyId'),
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
            <div className="space-y-6">
              {filteredStrategies.map((strategy: any) => {
                const isCollapsed = collapsedStrategies.has(strategy.id);
                
                return (
                <Card key={strategy.id} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => toggleStrategyCollapse(strategy.id)}
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
                            {strategy.projects.length} project{strategy.projects.length !== 1 ? 's' : ''}
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
                          onClick={(e) => navigateToProjects(strategy.id, e)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Go to Projects"
                          data-testid={`button-nav-projects-${strategy.id}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" data-testid={`button-strategy-menu-${strategy.id}`}>
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

                  {!isCollapsed && (
                    <CardContent className="p-6">
                      <div className="space-y-4 mb-6">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium">Start:</span>
                      <span className="ml-2">
                        {new Date(strategy.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium">Target:</span>
                      <span className="ml-2">
                        {new Date(strategy.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium">Metrics:</span>
                      <span className="ml-2">{strategy.metrics}</span>
                    </div>
                  </div>

                  {/* Change Continuum Section */}
                  <Collapsible
                    open={expandedContinuum[strategy.id]}
                    onOpenChange={(open) => setExpandedContinuum(prev => ({ ...prev, [strategy.id]: open }))}
                    className="mt-4"
                  >
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-2"
                        data-testid={`button-toggle-continuum-${strategy.id}`}
                      >
                        <span className="text-sm font-medium">Change Continuum</span>
                        {expandedContinuum[strategy.id] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 text-sm">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Case for Change</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.caseForChange || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Vision Statement</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.visionStatement || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Success Metrics</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.successMetrics || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Stakeholder Map</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.stakeholderMap || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Readiness Rating (RAG)</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.readinessRating || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Exposure Rating</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.riskExposureRating || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Change Champion Assignment</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.changeChampionAssignment || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Reinforcement Plan</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.reinforcementPlan || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Benefits Realization Plan</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.benefitsRealizationPlan || "To be defined"}</div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {strategy.projects.length} projects
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleCreateProject(strategy.id)}
                        style={{ backgroundColor: strategy.colorCode, borderColor: strategy.colorCode }}
                        className="text-white hover:opacity-90"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Project
                      </Button>
                    </div>
                    
                    {/* Complete and Archive buttons */}
                    {canEditAllStrategies() && strategy.status === 'Active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeStrategyMutation.mutate(strategy.id)}
                        className="w-full"
                        data-testid={`button-complete-${strategy.id}`}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Completed
                      </Button>
                    )}
                    
                    {canEditAllStrategies() && strategy.status === 'Completed' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            data-testid={`button-archive-${strategy.id}`}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive Strategy</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to archive "{strategy.title}"? This will also archive all associated projects and actions. Archived items can still be viewed in reports.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => archiveStrategyMutation.mutate(strategy.id)}
                              data-testid={`button-confirm-archive-${strategy.id}`}
                            >
                              Archive
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
