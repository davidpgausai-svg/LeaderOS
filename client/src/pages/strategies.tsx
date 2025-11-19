import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { StrategyCard } from "@/components/cards/strategy-card";
import { CreateStrategyModal } from "@/components/modals/create-strategy-modal";
import { EditStrategyModal } from "@/components/modals/edit-strategy-modal";
import { CreateTacticModal } from "@/components/modals/create-tactic-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Trash2, MoreVertical, Edit, CheckCircle, Archive, ChevronDown, ChevronUp } from "lucide-react";
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
  const [isCreateStrategyOpen, setIsCreateStrategyOpen] = useState(false);
  const [isEditStrategyOpen, setIsEditStrategyOpen] = useState(false);
  const [isCreateTacticOpen, setIsCreateTacticOpen] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>();
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedContinuum, setExpandedContinuum] = useState<Record<string, boolean>>({});

  const { data: strategies, isLoading: strategiesLoading } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: tactics } = useQuery({
    queryKey: ["/api/tactics"],
  });

  // Enhance strategies with tactics
  const strategiesWithTactics = (strategies as any[])?.map((strategy: any) => ({
    ...strategy,
    tactics: (tactics as any[])?.filter((tactic: any) => tactic.strategyId === strategy.id) || []
  })) || [];

  // Filter strategies
  const filteredStrategies = strategiesWithTactics.filter((strategy: any) => {
    const matchesSearch = strategy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         strategy.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Default filter hides archived items unless explicitly selected
    const matchesStatus = statusFilter === "all" 
      ? strategy.status !== 'Archived' 
      : strategy.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateTactic = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    setIsCreateTacticOpen(true);
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

  const handleDeleteStrategy = (strategyId: string) => {
    deleteStrategyMutation.mutate(strategyId);
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
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
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first strategy"}
              </p>
              {canCreateStrategies() && !searchTerm && statusFilter === "all" && (
                <Button onClick={() => setIsCreateStrategyOpen(true)} data-testid="button-create-first-strategy">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Strategy
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredStrategies.map((strategy: any) => (
                <div key={strategy.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ borderTop: `4px solid ${strategy.colorCode}` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: strategy.colorCode }}
                        />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {strategy.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        {strategy.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Status Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        strategy.status === 'Active' 
                          ? 'bg-blue-100 text-blue-700' 
                          : strategy.status === 'Completed'
                          ? 'bg-green-100 text-green-700'
                          : strategy.status === 'Archived'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`} data-testid={`status-badge-${strategy.id}`}>
                        {strategy.status}
                      </span>
                      {canEditAllStrategies() && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-strategy-menu-${strategy.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditStrategy(strategy)}
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
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
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Change Driver</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.changeDriver || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Key Stakeholders</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.changeStakeholders || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Impact</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.changeImpact || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Potential Risks</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.changeRisks || "To be defined"}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Success Indicators</div>
                        <div className="text-gray-600 dark:text-gray-400">{strategy.changeSuccess || "To be defined"}</div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {strategy.tactics.length} tactics
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleCreateTactic(strategy.id)}
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
                </div>
              ))}
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
      <CreateTacticModal
        isOpen={isCreateTacticOpen}
        onClose={() => setIsCreateTacticOpen(false)}
        strategyId={selectedStrategyId}
      />
    </div>
  );
}
