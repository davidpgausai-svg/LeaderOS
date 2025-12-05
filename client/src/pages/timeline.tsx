import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { useMemo, useState, useEffect } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import type { Strategy, Project, Action, Barrier, Dependency } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter, Calendar, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Timeline() {
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [selectedPriorityIds, setSelectedPriorityIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('gantt-expanded-rows');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [barrierDialogOpen, setBarrierDialogOpen] = useState(false);
  const [selectedProjectBarriers, setSelectedProjectBarriers] = useState<Barrier[]>([]);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");

  useEffect(() => {
    localStorage.setItem('gantt-expanded-rows', JSON.stringify(Array.from(expandedIds)));
  }, [expandedIds]);

  const { data: strategies, isLoading: strategiesLoading } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: actions, isLoading: actionsLoading } = useQuery<Action[]>({
    queryKey: ["/api/actions"],
  });

  const { data: barriers } = useQuery<Barrier[]>({
    queryKey: ["/api/barriers"],
  });

  const { data: dependencies } = useQuery<Dependency[]>({
    queryKey: ["/api/dependencies"],
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, startDate, dueDate }: { id: string; startDate: Date; dueDate: Date }) => {
      return apiRequest("PATCH", `/api/projects/${id}`, { startDate, dueDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project dates updated" });
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: async ({ id, dueDate }: { id: string; dueDate: Date }) => {
      return apiRequest("PATCH", `/api/actions/${id}`, { dueDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({ title: "Action due date updated" });
    },
  });

  const filteredStrategies = useMemo(() => {
    if (!strategies) return [];
    const activeStrategies = strategies
      .filter(s => s.status !== 'Archived')
      .sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.id.localeCompare(b.id);
      });
    if (selectedPriorityIds.length === 0) return activeStrategies;
    return activeStrategies.filter(s => selectedPriorityIds.includes(s.id));
  }, [strategies, selectedPriorityIds]);

  const dependencyMap = useMemo(() => {
    if (!dependencies) return new Map<string, string[]>();
    
    const map = new Map<string, string[]>();
    
    dependencies.forEach(dep => {
      const targetId = `${dep.targetType}-${dep.targetId}`;
      const sourceId = `${dep.sourceType}-${dep.sourceId}`;
      
      if (!map.has(targetId)) {
        map.set(targetId, []);
      }
      map.get(targetId)!.push(sourceId);
    });
    
    return map;
  }, [dependencies]);

  const tasks: Task[] = useMemo(() => {
    if (!filteredStrategies || !projects || !actions) return [];

    const result: Task[] = [];

    filteredStrategies.forEach(strategy => {
      const strategyProjects = projects
        .filter(p => p.strategyId === strategy.id)
        .sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
          if (dateA !== dateB) return dateA - dateB;
          return a.id.localeCompare(b.id);
        });

      if (strategyProjects.length === 0) return;

      const strategyStartDates: Date[] = [];
      const strategyEndDates: Date[] = [];

      strategyProjects.forEach(p => {
        if (p.startDate) strategyStartDates.push(new Date(p.startDate));
        if (p.dueDate) strategyEndDates.push(new Date(p.dueDate));
      });

      if (strategyStartDates.length === 0 && strategyEndDates.length === 0) return;

      const strategyStart = strategyStartDates.length > 0 
        ? new Date(Math.min(...strategyStartDates.map(d => d.getTime())))
        : strategyEndDates[0];
      const strategyEnd = strategyEndDates.length > 0
        ? new Date(Math.max(...strategyEndDates.map(d => d.getTime())))
        : strategyStartDates[0];

      const isStrategyExpanded = expandedIds.has(`strategy-${strategy.id}`);

      const strategyTaskId = `strategy-${strategy.id}`;
      result.push({
        start: strategyStart,
        end: strategyEnd,
        name: strategy.title,
        id: strategyTaskId,
        progress: strategy.progress || 0,
        type: "project",
        hideChildren: !isStrategyExpanded,
        dependencies: dependencyMap.get(strategyTaskId) || [],
        styles: {
          backgroundColor: strategy.colorCode || "#1e3a8a",
          progressColor: strategy.colorCode || "#1e3a8a",
          progressSelectedColor: strategy.colorCode || "#1e3a8a",
        },
      });

      strategyProjects.forEach(project => {
        if (!project.startDate || !project.dueDate) return;

        const projectStart = new Date(project.startDate);
        const projectEnd = new Date(project.dueDate);

        const projectActions = actions
          .filter(a => a.projectId === project.id && a.dueDate)
          .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
            return a.id.localeCompare(b.id);
          });

        const hasActions = projectActions.length > 0;
        const isProjectExpanded = expandedIds.has(`project-${project.id}`);

        const projectBarriers = barriers?.filter(b => 
          b.projectId === project.id && b.status !== 'resolved' && b.status !== 'closed'
        ) || [];
        const hasBarriers = projectBarriers.length > 0;

        const getProjectStatusColor = (status: string) => {
          switch (status) {
            case "C": return "#22c55e";
            case "OT": return "#eab308";
            case "OH": return "#ef4444";
            case "B": return "#f97316";
            case "NYS": return "#9ca3af";
            default: return "#6b7280";
          }
        };

        const projectColor = getProjectStatusColor(project.status);
        const projectTaskId = `project-${project.id}`;

        result.push({
          start: projectStart,
          end: projectEnd,
          name: hasBarriers ? `⚠️ ${project.title}` : project.title,
          id: projectTaskId,
          progress: project.progress || 0,
          type: hasActions ? "project" : "task",
          project: `strategy-${strategy.id}`,
          hideChildren: !isProjectExpanded,
          dependencies: dependencyMap.get(projectTaskId) || [],
          styles: {
            backgroundColor: projectColor,
            progressColor: projectColor,
            progressSelectedColor: projectColor,
          },
        });

        if (hasActions && isProjectExpanded) {
          projectActions.forEach(action => {
            if (!action.dueDate) return;

            const actionEnd = new Date(action.dueDate);
            const actionStart = new Date(actionEnd);
            actionStart.setDate(actionStart.getDate() - 7);

            const getActionStatusColor = (status: string) => {
              switch (status) {
                case "achieved": return "#86efac";
                case "in_progress": return "#93c5fd";
                case "at_risk": return "#fca5a5";
                case "not_started": return "#d1d5db";
                default: return "#e5e7eb";
              }
            };

            const actionColor = getActionStatusColor(action.status);
            const actionTaskId = `action-${action.id}`;

            result.push({
              start: actionStart,
              end: actionEnd,
              name: action.title,
              id: actionTaskId,
              progress: action.status === "achieved" ? 100 : action.status === "in_progress" ? 50 : 0,
              type: "task",
              project: `project-${project.id}`,
              dependencies: dependencyMap.get(actionTaskId) || [],
              styles: {
                backgroundColor: actionColor,
                progressColor: actionColor,
                progressSelectedColor: actionColor,
              },
            });
          });
        }
      });
    });

    return result;
  }, [filteredStrategies, projects, actions, barriers, expandedIds, dependencyMap]);

  const handleExpanderClick = (task: Task) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(task.id)) {
        next.delete(task.id);
      } else {
        next.add(task.id);
      }
      return next;
    });
  };

  const handleDateChange = (task: Task) => {
    const parts = task.id.split('-');
    const type = parts[0];
    const id = parts.slice(1).join('-');

    if (type === 'project') {
      updateProjectMutation.mutate({
        id,
        startDate: task.start,
        dueDate: task.end,
      });
    } else if (type === 'action') {
      updateActionMutation.mutate({
        id,
        dueDate: task.end,
      });
    }
  };

  const handlePriorityFilterChange = (priorityId: string, checked: boolean) => {
    setSelectedPriorityIds(prev => {
      if (checked) {
        return [...prev, priorityId];
      } else {
        return prev.filter(id => id !== priorityId);
      }
    });
  };

  const handleTaskClick = (task: Task) => {
    const parts = task.id.split('-');
    const type = parts[0];
    const id = parts.slice(1).join('-');

    if (type === 'project') {
      const projectBarriers = barriers?.filter(b => 
        b.projectId === id && b.status !== 'resolved' && b.status !== 'closed'
      ) || [];
      
      if (projectBarriers.length > 0) {
        const project = projects?.find(p => p.id === id);
        setSelectedProjectBarriers(projectBarriers);
        setSelectedProjectTitle(project?.title || "Project");
        setBarrierDialogOpen(true);
      }
    }
  };

  if (strategiesLoading || projectsLoading || actionsLoading) {
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

  const activeStrategies = strategies?.filter(s => s.status !== 'Archived') || [];

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Strategic Roadmap</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Interactive timeline showing Priorities, Projects, and Actions
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-priority-filter">
                    <Filter className="w-4 h-4" />
                    Filter Priorities
                    {selectedPriorityIds.length > 0 && (
                      <Badge variant="secondary" className="ml-1">{selectedPriorityIds.length}</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm">Select Priorities</span>
                      {selectedPriorityIds.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedPriorityIds([])}
                          className="text-xs h-6"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                    {activeStrategies.map(strategy => (
                      <div key={strategy.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filter-${strategy.id}`}
                          checked={selectedPriorityIds.includes(strategy.id)}
                          onCheckedChange={(checked) => handlePriorityFilterChange(strategy.id, !!checked)}
                          data-testid={`checkbox-priority-${strategy.id}`}
                        />
                        <label htmlFor={`filter-${strategy.id}`} className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                          <span className="truncate">{strategy.title}</span>
                        </label>
                      </div>
                    ))}
                    {activeStrategies.length === 0 && (
                      <p className="text-sm text-gray-500">No priorities available</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  variant={viewMode === ViewMode.Day ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(ViewMode.Day)}
                  data-testid="button-scale-days"
                >
                  Days
                </Button>
                <Button
                  variant={viewMode === ViewMode.Week ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(ViewMode.Week)}
                  data-testid="button-scale-weeks"
                >
                  Weeks
                </Button>
                <Button
                  variant={viewMode === ViewMode.Month ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(ViewMode.Month)}
                  data-testid="button-scale-months"
                >
                  Months
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {selectedPriorityIds.length > 0 ? "No data for selected priorities" : "No timeline data"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedPriorityIds.length > 0 
                    ? "The selected priorities have no projects with dates set"
                    : "Create priorities and projects to see them on the Gantt chart"
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <Gantt
                tasks={tasks}
                viewMode={viewMode}
                onExpanderClick={handleExpanderClick}
                onDateChange={handleDateChange}
                onClick={handleTaskClick}
                listCellWidth="200px"
                columnWidth={viewMode === ViewMode.Day ? 60 : viewMode === ViewMode.Week ? 120 : 200}
                barBackgroundColor="#e5e7eb"
                rowHeight={45}
                fontSize="13px"
                headerHeight={50}
                todayColor="rgba(239, 68, 68, 0.15)"
                TooltipContent={({ task }) => {
                  const parts = task.id.split('-');
                  const type = parts[0];
                  
                  return (
                    <div className="bg-white dark:bg-gray-800 p-3 shadow-xl border border-gray-200 dark:border-gray-700 rounded-lg text-sm max-w-xs">
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">{task.name}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 capitalize">{type}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {task.start.toLocaleDateString()} - {task.end.toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{task.progress}%</span>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          )}
        </div>
      </main>

      <Dialog open={barrierDialogOpen} onOpenChange={setBarrierDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Barriers for {selectedProjectTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {selectedProjectBarriers.map(barrier => (
              <div key={barrier.id} className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{barrier.description}</p>
                  <Badge variant={barrier.severity === 'high' ? 'destructive' : barrier.severity === 'medium' ? 'default' : 'secondary'}>
                    {barrier.severity}
                  </Badge>
                </div>
                {barrier.ownerId && (
                  <p className="text-xs text-gray-500 mt-1">Owner ID: {barrier.ownerId}</p>
                )}
              </div>
            ))}
            {selectedProjectBarriers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No active barriers</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
