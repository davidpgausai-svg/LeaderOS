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
import { Filter, Calendar, AlertTriangle, ChevronRight, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TaskWithMeta extends Task {
  level?: number;
  hasChildren?: boolean;
  colorCode?: string;
}

const CustomTaskListHeader: React.FC<{
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
}> = ({ headerHeight, rowWidth }) => {
  return (
    <div 
      className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-medium text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider"
      style={{ height: headerHeight, width: rowWidth }}
    >
      <div className="w-10 text-center shrink-0">#</div>
      <div className="flex-1 px-2">Task Name</div>
    </div>
  );
};

const CustomTaskListTable: React.FC<{
  rowHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  locale: string;
  tasks: TaskWithMeta[];
  selectedTaskId: string;
  setSelectedTask: (taskId: string) => void;
  onExpanderClick: (task: Task) => void;
}> = ({ tasks, rowHeight, rowWidth, setSelectedTask, selectedTaskId, onExpanderClick }) => {
  const hiddenParents = new Set<string>();
  tasks.forEach(task => {
    if (task.hideChildren) {
      hiddenParents.add(task.id);
    }
  });

  const visibleTasks = tasks.filter(task => {
    if (!task.project) return true;
    if (hiddenParents.has(task.project)) return false;
    const grandparent = tasks.find(t => t.id === task.project)?.project;
    if (grandparent && hiddenParents.has(grandparent)) return false;
    return true;
  });

  const strategyCounters = new Map<string, number>();
  const projectCounters = new Map<string, number>();
  let currentStrategyNum = 0;
  
  const getWBS = (task: TaskWithMeta): string => {
    const isStrategy = task.id.startsWith('strategy-');
    const isProject = task.id.startsWith('project-');
    const isAction = task.id.startsWith('action-');
    
    if (isStrategy) {
      currentStrategyNum++;
      strategyCounters.set(task.id, currentStrategyNum);
      return `${currentStrategyNum}`;
    } else if (isProject && task.project) {
      const parentNum = strategyCounters.get(task.project) || 0;
      const count = (projectCounters.get(task.project) || 0) + 1;
      projectCounters.set(task.project, count);
      projectCounters.set(task.id, count);
      return `${parentNum}.${count}`;
    } else if (isAction && task.project) {
      const parentWbs = projectCounters.get(task.project) || 0;
      const strategyId = visibleTasks.find(t => t.id === task.project)?.project;
      const strategyNum = strategyId ? strategyCounters.get(strategyId) || 0 : 0;
      const actionCount = (projectCounters.get(`${task.project}-actions`) || 0) + 1;
      projectCounters.set(`${task.project}-actions`, actionCount);
      return `${strategyNum}.${parentWbs}.${actionCount}`;
    }
    return '';
  };

  return (
    <div style={{ width: rowWidth }} className="bg-white dark:bg-gray-900">
      {visibleTasks.map((task) => {
        const level = task.level || 0;
        const hasChildren = task.hasChildren;
        const isExpanded = !task.hideChildren;
        const isSelected = task.id === selectedTaskId;
        const isStrategy = task.id.startsWith('strategy-');
        const isProject = task.id.startsWith('project-');
        const isAction = task.id.startsWith('action-');
        const wbs = getWBS(task);
        
        return (
          <div
            key={task.id}
            className={`flex items-center border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
              isSelected 
                ? 'bg-blue-50 dark:bg-blue-900/20' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            } ${isStrategy ? 'bg-gray-50/80 dark:bg-gray-800/50' : ''}`}
            style={{ height: rowHeight }}
            onClick={() => setSelectedTask(task.id)}
            data-testid={`task-row-${task.id}`}
          >
            <div className="w-10 text-center shrink-0 text-[11px] text-gray-400 dark:text-gray-500 font-mono">
              {wbs}
            </div>
            
            <div 
              className="flex items-center flex-1 min-w-0 pr-2"
              style={{ paddingLeft: `${level * 12}px` }}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpanderClick(task);
                  }}
                  className="w-4 h-4 flex items-center justify-center mr-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors shrink-0"
                  data-testid={`expand-${task.id}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                  )}
                </button>
              ) : (
                <div className="w-4 h-4 mr-1 shrink-0" />
              )}
              
              {isStrategy && (
                <div 
                  className="w-2.5 h-2.5 rounded-full mr-1.5 shrink-0"
                  style={{ backgroundColor: task.colorCode || '#6366f1' }}
                />
              )}
              
              {isProject && (
                <div 
                  className="w-2 h-2 rounded-sm mr-1.5 shrink-0"
                  style={{ backgroundColor: task.styles?.backgroundColor || '#6b7280' }}
                />
              )}
              
              {isAction && (
                <div 
                  className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0"
                  style={{ backgroundColor: task.styles?.backgroundColor || '#9ca3af' }}
                />
              )}
              
              <span 
                className={`truncate text-[12px] ${
                  isStrategy 
                    ? 'font-semibold text-gray-900 dark:text-white' 
                    : isProject 
                      ? 'font-medium text-gray-700 dark:text-gray-200'
                      : 'text-gray-600 dark:text-gray-400'
                }`}
                title={task.name}
              >
                {task.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

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

  const allTasks: TaskWithMeta[] = useMemo(() => {
    if (!filteredStrategies || !projects || !actions) return [];

    const result: TaskWithMeta[] = [];

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

    const getActionStatusColor = (status: string) => {
      switch (status) {
        case "achieved": return "#86efac";
        case "in_progress": return "#93c5fd";
        case "at_risk": return "#fca5a5";
        case "not_started": return "#d1d5db";
        default: return "#e5e7eb";
      }
    };

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
        level: 0,
        hasChildren: true,
        colorCode: strategy.colorCode,
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

        const projectColor = getProjectStatusColor(project.status);
        const projectTaskId = `project-${project.id}`;

        result.push({
          start: projectStart,
          end: projectEnd,
          name: hasBarriers ? `⚠️ ${project.title}` : project.title,
          id: projectTaskId,
          progress: project.progress || 0,
          type: hasActions ? "project" : "task",
          project: strategyTaskId,
          hideChildren: !isProjectExpanded,
          dependencies: dependencyMap.get(projectTaskId) || [],
          level: 1,
          hasChildren: hasActions,
          styles: {
            backgroundColor: projectColor,
            progressColor: projectColor,
            progressSelectedColor: projectColor,
          },
        });

        projectActions.forEach(action => {
          if (!action.dueDate) return;

          const actionEnd = new Date(action.dueDate);
          const actionStart = new Date(actionEnd);
          actionStart.setDate(actionStart.getDate() - 7);

          const actionColor = getActionStatusColor(action.status);
          const actionTaskId = `action-${action.id}`;

          result.push({
            start: actionStart,
            end: actionEnd,
            name: action.title,
            id: actionTaskId,
            progress: action.status === "achieved" ? 100 : action.status === "in_progress" ? 50 : 0,
            type: "task",
            project: projectTaskId,
            dependencies: dependencyMap.get(actionTaskId) || [],
            level: 2,
            hasChildren: false,
            styles: {
              backgroundColor: actionColor,
              progressColor: actionColor,
              progressSelectedColor: actionColor,
            },
          });
        });
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

  const columnWidth = viewMode === ViewMode.Day ? 40 : viewMode === ViewMode.Week ? 80 : 150;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Strategic Roadmap</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Priorities, Projects, and Actions timeline
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-8" data-testid="button-priority-filter">
                    <Filter className="w-3.5 h-3.5" />
                    Filter
                    {selectedPriorityIds.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{selectedPriorityIds.length}</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">Filter Priorities</span>
                      {selectedPriorityIds.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedPriorityIds([])}
                          className="text-xs h-6 px-2"
                        >
                          Clear
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
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                          <span className="truncate text-sm">{strategy.title}</span>
                        </label>
                      </div>
                    ))}
                    {activeStrategies.length === 0 && (
                      <p className="text-sm text-gray-500">No priorities available</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
                <Button
                  variant={viewMode === ViewMode.Day ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setViewMode(ViewMode.Day)}
                  data-testid="button-scale-days"
                >
                  Day
                </Button>
                <Button
                  variant={viewMode === ViewMode.Week ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setViewMode(ViewMode.Week)}
                  data-testid="button-scale-weeks"
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === ViewMode.Month ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setViewMode(ViewMode.Month)}
                  data-testid="button-scale-months"
                >
                  Month
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {allTasks.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                  {selectedPriorityIds.length > 0 ? "No data for selected priorities" : "No timeline data"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {selectedPriorityIds.length > 0 
                    ? "Selected priorities have no projects with dates"
                    : "Create priorities and projects to see them here"
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full gantt-container">
              <style>{`
                .gantt-container ._2dZTy {
                  fill: #f9fafb;
                }
                .dark .gantt-container ._2dZTy {
                  fill: #111827;
                }
                .gantt-container ._3_ygE {
                  stroke: #e5e7eb;
                }
                .dark .gantt-container ._3_ygE {
                  stroke: #374151;
                }
                .gantt-container ._9w8d5 {
                  fill: #6b7280;
                  font-size: 11px;
                }
                .dark .gantt-container ._9w8d5 {
                  fill: #9ca3af;
                }
                .gantt-container ._3rUKi {
                  fill: #f3f4f6;
                }
                .dark .gantt-container ._3rUKi {
                  fill: #1f2937;
                }
                .gantt-container ._RuwuK {
                  stroke: #e5e7eb;
                }
                .dark .gantt-container ._RuwuK {
                  stroke: #374151;
                }
                .gantt-container svg {
                  overflow: visible;
                }
              `}</style>
              <Gantt
                tasks={allTasks}
                viewMode={viewMode}
                onExpanderClick={handleExpanderClick}
                onDateChange={handleDateChange}
                onClick={handleTaskClick}
                TaskListHeader={CustomTaskListHeader}
                TaskListTable={CustomTaskListTable}
                listCellWidth="180px"
                columnWidth={columnWidth}
                barBackgroundColor="#e5e7eb"
                rowHeight={36}
                fontSize="12px"
                headerHeight={40}
                todayColor="rgba(239, 68, 68, 0.1)"
                arrowColor="#94a3b8"
                arrowIndent={15}
                TooltipContent={({ task }) => {
                  const parts = task.id.split('-');
                  const type = parts[0];
                  const typeLabel = type === 'strategy' ? 'Priority' : type === 'project' ? 'Project' : 'Action';
                  
                  return (
                    <div className="bg-white dark:bg-gray-800 p-2.5 shadow-lg border border-gray-200 dark:border-gray-700 rounded-md text-xs max-w-xs">
                      <p className="font-semibold text-gray-900 dark:text-white mb-0.5">{task.name}</p>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">{typeLabel}</p>
                      <p className="text-gray-600 dark:text-gray-300">
                        {task.start.toLocaleDateString()} → {task.end.toLocaleDateString()}
                      </p>
                      {task.progress > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full" 
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-gray-500 text-[10px]">{task.progress}%</span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </div>
          )}
        </div>
      </main>

      <Dialog open={barrierDialogOpen} onOpenChange={setBarrierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Barriers: {selectedProjectTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedProjectBarriers.map(barrier => (
              <div key={barrier.id} className="p-2.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-900 dark:text-white">{barrier.description}</p>
                  <Badge 
                    variant={barrier.severity === 'high' ? 'destructive' : barrier.severity === 'medium' ? 'default' : 'secondary'}
                    className="text-[10px] h-5"
                  >
                    {barrier.severity}
                  </Badge>
                </div>
              </div>
            ))}
            {selectedProjectBarriers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-3">No active barriers</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
