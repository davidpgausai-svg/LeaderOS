import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/use-role";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, X, Plus, ArrowRight, Check } from "lucide-react";

type Dependency = {
  id: string;
  sourceType: "project" | "action";
  sourceId: string;
  targetType: "project" | "action";
  targetId: string;
  createdBy: string;
  createdAt: string;
};

type Project = {
  id: string;
  title: string;
  strategyId: string;
};

type Action = {
  id: string;
  title: string;
  strategyId: string;
  projectId?: string;
};

type Strategy = {
  id: string;
  title: string;
  colorCode: string;
};

interface DependencyTagsProps {
  sourceType: "project" | "action";
  sourceId: string;
  sourceTitle: string;
  strategyId: string;
  compact?: boolean;
}

export function DependencyTags({
  sourceType,
  sourceId,
  sourceTitle,
  strategyId,
  compact = false,
}: DependencyTagsProps) {
  const { currentRole } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTargetType, setSelectedTargetType] = useState<"project" | "action" | null>(null);

  const canEdit = currentRole === "administrator" || currentRole === "co_lead";

  const { data: dependencies = [] } = useQuery<Dependency[]>({
    queryKey: ["/api/dependencies", { sourceType, sourceId }],
    queryFn: async () => {
      const response = await fetch(`/api/dependencies?sourceType=${sourceType}&sourceId=${sourceId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch dependencies");
      return response.json();
    },
  });

  const { data: reverseDependencies = [] } = useQuery<Dependency[]>({
    queryKey: ["/api/dependencies", "reverse", { targetType: sourceType, targetId: sourceId }],
    queryFn: async () => {
      const response = await fetch(`/api/dependencies?targetType=${sourceType}&targetId=${sourceId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch reverse dependencies");
      return response.json();
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: actions = [] } = useQuery<Action[]>({
    queryKey: ["/api/actions"],
  });

  const { data: strategies = [] } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const createDependencyMutation = useMutation({
    mutationFn: async (data: { targetType: string; targetId: string }) => {
      const response = await apiRequest("POST", "/api/dependencies", {
        sourceType,
        sourceId,
        targetType: data.targetType,
        targetId: data.targetId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dependencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Dependency added successfully",
      });
      setIsAddOpen(false);
      setSelectedTargetType(null);
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

  const getProjectTitle = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.title || "Unknown Project";
  };

  const getActionTitle = (actionId: string) => {
    const action = actions.find((a) => a.id === actionId);
    return action?.title || "Unknown Action";
  };

  const getStrategyForProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return null;
    return strategies.find((s) => s.id === project.strategyId);
  };

  const getStrategyForAction = (actionId: string) => {
    const action = actions.find((a) => a.id === actionId);
    if (!action) return null;
    return strategies.find((s) => s.id === action.strategyId);
  };

  const getTargetTitle = (dep: Dependency) => {
    if (dep.targetType === "project") {
      return getProjectTitle(dep.targetId);
    }
    return getActionTitle(dep.targetId);
  };

  const getSourceTitle = (dep: Dependency) => {
    if (dep.sourceType === "project") {
      return getProjectTitle(dep.sourceId);
    }
    return getActionTitle(dep.sourceId);
  };

  const getTargetStrategy = (dep: Dependency) => {
    if (dep.targetType === "project") {
      return getStrategyForProject(dep.targetId);
    }
    return getStrategyForAction(dep.targetId);
  };

  const getSourceStrategy = (dep: Dependency) => {
    if (dep.sourceType === "project") {
      return getStrategyForProject(dep.sourceId);
    }
    return getStrategyForAction(dep.sourceId);
  };

  const availableProjects = projects.filter(
    (p) =>
      p.id !== sourceId &&
      !dependencies.some((d) => d.targetType === "project" && d.targetId === p.id)
  );

  const availableActions = actions.filter(
    (a) =>
      a.id !== sourceId &&
      !dependencies.some((d) => d.targetType === "action" && d.targetId === a.id)
  );

  const handleAddDependency = (targetType: "project" | "action", targetId: string) => {
    createDependencyMutation.mutate({ targetType, targetId });
  };

  const totalDeps = dependencies.length + reverseDependencies.length;

  if (compact && totalDeps === 0 && !canEdit) {
    return null;
  }

  return (
    <div className="space-y-2" data-testid={`dependency-tags-${sourceId}`}>
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <Link className="w-3.5 h-3.5" />
          <span className="font-medium">Dependencies</span>
        </div>

        <TooltipProvider>
          {dependencies.map((dep) => {
            const targetStrategy = getTargetStrategy(dep);
            return (
              <Tooltip key={dep.id}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 pr-1 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30"
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: targetStrategy?.colorCode || "#3B82F6",
                    }}
                    data-testid={`dep-tag-${dep.id}`}
                  >
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      depends on
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300 max-w-32 truncate">
                      {getTargetTitle(dep)}
                    </span>
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDependencyMutation.mutate(dep.id);
                        }}
                        className="ml-1 p-0.5 rounded-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600"
                        data-testid={`button-remove-dep-${dep.id}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    This {sourceType} depends on {dep.targetType}: "{getTargetTitle(dep)}"
                  </p>
                  {targetStrategy && (
                    <p className="text-xs text-gray-400">
                      Strategy: {targetStrategy.title}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {reverseDependencies.map((dep) => {
            const sourceStrategy = getSourceStrategy(dep);
            return (
              <Tooltip key={`reverse-${dep.id}`}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30"
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: sourceStrategy?.colorCode || "#F97316",
                    }}
                    data-testid={`reverse-dep-tag-${dep.id}`}
                  >
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      blocking
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="text-xs font-medium text-orange-700 dark:text-orange-300 max-w-32 truncate">
                      {getSourceTitle(dep)}
                    </span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    This {sourceType} is blocking {dep.sourceType}: "{getSourceTitle(dep)}"
                  </p>
                  {sourceStrategy && (
                    <p className="text-xs text-gray-400">
                      Strategy: {sourceStrategy.title}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>

        {canEdit && (
          <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-gray-500 hover:text-blue-600"
                data-testid={`button-add-dependency-${sourceId}`}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              {!selectedTargetType ? (
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select dependency type
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedTargetType("project")}
                      data-testid="button-select-project-type"
                    >
                      Project
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedTargetType("action")}
                      data-testid="button-select-action-type"
                    >
                      Action
                    </Button>
                  </div>
                </div>
              ) : (
                <Command>
                  <div className="p-2 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTargetType(null)}
                      className="text-xs"
                    >
                      ← Back
                    </Button>
                  </div>
                  <CommandInput
                    placeholder={`Search ${selectedTargetType}s...`}
                    data-testid="input-search-dependency-target"
                  />
                  <CommandList>
                    <CommandEmpty>No {selectedTargetType}s found.</CommandEmpty>
                    <CommandGroup heading={`Available ${selectedTargetType}s`}>
                      {selectedTargetType === "project" &&
                        availableProjects.map((project) => {
                          const strategy = getStrategyForProject(project.id);
                          return (
                            <CommandItem
                              key={project.id}
                              value={project.title}
                              onSelect={() => handleAddDependency("project", project.id)}
                              className="flex items-center gap-2"
                              data-testid={`option-project-${project.id}`}
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: strategy?.colorCode || "#3B82F6" }}
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
                      {selectedTargetType === "action" &&
                        availableActions.map((action) => {
                          const strategy = getStrategyForAction(action.id);
                          return (
                            <CommandItem
                              key={action.id}
                              value={action.title}
                              onSelect={() => handleAddDependency("action", action.id)}
                              className="flex items-center gap-2"
                              data-testid={`option-action-${action.id}`}
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: strategy?.colorCode || "#3B82F6" }}
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
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {totalDeps === 0 && !canEdit && (
        <p className="text-xs text-gray-400">No dependencies</p>
      )}
    </div>
  );
}
