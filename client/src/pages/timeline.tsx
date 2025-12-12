import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { useMemo, useState, useEffect, useRef } from "react";
import { registerLicense } from "@syncfusion/ej2-base";
import { GanttComponent, Inject, Selection, ColumnsDirective, ColumnDirective, DayMarkers, Edit } from "@syncfusion/ej2-react-gantt";
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-buttons/styles/material.css";
import "@syncfusion/ej2-calendars/styles/material.css";
import "@syncfusion/ej2-dropdowns/styles/material.css";
import "@syncfusion/ej2-inputs/styles/material.css";
import "@syncfusion/ej2-lists/styles/material.css";
import "@syncfusion/ej2-layouts/styles/material.css";
import "@syncfusion/ej2-navigations/styles/material.css";
import "@syncfusion/ej2-popups/styles/material.css";
import "@syncfusion/ej2-splitbuttons/styles/material.css";
import "@syncfusion/ej2-grids/styles/material.css";
import "@syncfusion/ej2-treegrid/styles/material.css";
import "@syncfusion/ej2-react-gantt/styles/material.css";
import type { Strategy, Project, Action, Barrier, Dependency } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter, Calendar, AlertTriangle, ChevronRight, ChevronLeft, LayoutGrid, GanttChart, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface SyncfusionTask {
  TaskID: string;
  TaskName: string;
  StartDate: Date;
  EndDate: Date;
  Progress: number;
  Predecessor?: string;
  subtasks?: SyncfusionTask[];
  taskColor?: string;
  taskType?: 'strategy' | 'project' | 'action';
  hasBarriers?: boolean;
}

interface DayItems {
  date: Date;
  projects: Project[];
  actions: Action[];
}

const CalendarView: React.FC<{
  projects: Project[];
  actions: Action[];
  strategies: Strategy[];
  calendarMonth: Date;
  onDaySelect?: (dayItems: DayItems) => void;
}> = ({ projects, actions, strategies, calendarMonth, onDaySelect }) => {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  const strategyMap = new Map(strategies.map(s => [s.id, s]));

  const getItemsForDate = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    
    const projectsOnDate = projects.filter(p => {
      if (!p.dueDate) return false;
      const dueDate = new Date(p.dueDate).toISOString().split('T')[0];
      return dueDate === dateStr;
    });
    
    const actionsOnDate = actions.filter(a => {
      if (!a.dueDate) return false;
      const dueDate = new Date(a.dueDate).toISOString().split('T')[0];
      return dueDate === dateStr;
    });
    
    return { projects: projectsOnDate, actions: actionsOnDate };
  };

  const today = new Date();
  const isToday = (day: number) => 
    today.getDate() === day && 
    today.getMonth() === month && 
    today.getFullYear() === year;

  return (
    <div className="h-full overflow-auto p-4 bg-white dark:bg-gray-900">
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div 
            key={day} 
            className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
        
        {calendarDays.map((day, index) => {
          if (day === null) {
            return (
              <div 
                key={`empty-${index}`} 
                className="bg-gray-50 dark:bg-gray-800/50 min-h-[100px]"
              />
            );
          }
          
          const items = getItemsForDate(day);
          const hasItems = items.projects.length > 0 || items.actions.length > 0;
          
          const handleDayClick = () => {
            if (onDaySelect && hasItems) {
              onDaySelect({
                date: new Date(year, month, day),
                projects: items.projects,
                actions: items.actions,
              });
            }
          };

          return (
            <div
              key={day}
              className={`bg-white dark:bg-gray-900 min-h-[100px] p-1.5 ${
                isToday(day) ? 'ring-2 ring-inset ring-blue-500' : ''
              } ${hasItems ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors' : ''}`}
              onClick={handleDayClick}
              data-testid={`calendar-day-${year}-${month + 1}-${day}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${
                  isToday(day) 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {day}
                </span>
                {hasItems && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                    {items.projects.length + items.actions.length}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-0.5 overflow-y-auto max-h-[80px]">
                {items.projects.map(project => {
                  const strategy = strategyMap.get(project.strategyId);
                  return (
                    <div 
                      key={`p-${project.id}`}
                      className="text-[10px] px-1 py-0.5 rounded truncate"
                      style={{ 
                        backgroundColor: strategy?.colorCode ? `${strategy.colorCode}20` : '#e5e7eb',
                        color: strategy?.colorCode || '#374151',
                        borderLeft: `2px solid ${strategy?.colorCode || '#6b7280'}`
                      }}
                      title={project.title}
                    >
                      [P] {project.title}
                    </div>
                  );
                })}
                
                {items.actions.map(action => {
                  const project = projects.find(p => p.id === action.projectId);
                  const strategy = project ? strategyMap.get(project.strategyId) : undefined;
                  return (
                    <div 
                      key={`a-${action.id}`}
                      className="text-[10px] px-1 py-0.5 rounded truncate"
                      style={{ 
                        backgroundColor: strategy?.colorCode ? `${strategy.colorCode}15` : '#f3f4f6',
                        color: strategy?.colorCode || '#4b5563',
                        borderLeft: `2px solid ${strategy?.colorCode || '#9ca3af'}`
                      }}
                      title={action.title}
                    >
                      [A] {action.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Timeline() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const ganttRef = useRef<GanttComponent>(null);
  
  const [viewType, setViewType] = useState<'timeline' | 'calendar'>('timeline');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [timelineView, setTimelineView] = useState<'Day' | 'Week' | 'Month'>('Month');
  const [selectedPriorityIds, setSelectedPriorityIds] = useState<string[]>([]);
  const [barrierDialogOpen, setBarrierDialogOpen] = useState(false);
  const [selectedProjectBarriers, setSelectedProjectBarriers] = useState<Barrier[]>([]);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");
  const [dayDetailsDialogOpen, setDayDetailsDialogOpen] = useState(false);
  const [selectedDayItems, setSelectedDayItems] = useState<DayItems | null>(null);
  const [licenseRegistered, setLicenseRegistered] = useState(false);
  const [licenseError, setLicenseError] = useState(false);

  useEffect(() => {
    async function loadLicense() {
      try {
        const response = await fetch('/api/config/syncfusion', {
          credentials: 'include'
        });
        if (response.ok) {
          const { licenseKey } = await response.json();
          if (licenseKey) {
            registerLicense(licenseKey);
            setLicenseRegistered(true);
          } else {
            setLicenseError(true);
            toast({ 
              title: "Timeline chart unavailable", 
              description: "License key not configured. Please contact your administrator.",
              variant: "destructive" 
            });
          }
        } else {
          setLicenseError(true);
        }
      } catch (error) {
        console.warn('Failed to load Syncfusion license:', error);
        setLicenseError(true);
      }
    }
    loadLicense();
  }, [toast]);

  const navigateToProject = (projectId: string) => {
    setDayDetailsDialogOpen(false);
    setLocation(`/strategies?highlight=project-${projectId}`);
  };

  const navigateToAction = (actionId: string, projectId: string) => {
    setDayDetailsDialogOpen(false);
    setLocation(`/strategies?highlight=action-${actionId}&project=${projectId}`);
  };

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
        const dateA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
        if (dateA !== dateB) return dateA - dateB;
        return a.id.localeCompare(b.id);
      });
    if (selectedPriorityIds.length === 0) return activeStrategies;
    return activeStrategies.filter(s => selectedPriorityIds.includes(s.id));
  }, [strategies, selectedPriorityIds]);

  const filteredStrategyIds = useMemo(() => 
    new Set(filteredStrategies.map(s => s.id)), 
    [filteredStrategies]
  );

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => filteredStrategyIds.has(p.strategyId));
  }, [projects, filteredStrategyIds]);

  const filteredActions = useMemo(() => {
    if (!actions) return [];
    const projectIds = new Set(filteredProjects.map(p => p.id));
    return actions.filter(a => a.projectId && projectIds.has(a.projectId));
  }, [actions, filteredProjects]);

  const ganttData: SyncfusionTask[] = useMemo(() => {
    if (!filteredStrategies || !projects || !actions) return [];

    // Parse date as UTC and return a Date object that displays the same date in local timezone
    // This prevents timezone offset from shifting dates by a day
    const parseAsUTCDate = (dateInput: Date | string): Date => {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
      // Get UTC components and create local date with same values
      return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    };

    // Build a map of predecessors: sourceTaskID -> array of targetTaskIDs
    const predecessorMap = new Map<string, string[]>();
    if (dependencies) {
      dependencies.forEach(dep => {
        const sourceTaskId = `${dep.sourceType}-${dep.sourceId}`;
        const targetTaskId = `${dep.targetType}-${dep.targetId}`;
        if (!predecessorMap.has(sourceTaskId)) {
          predecessorMap.set(sourceTaskId, []);
        }
        predecessorMap.get(sourceTaskId)!.push(targetTaskId);
      });
    }

    const getPredecessor = (taskId: string): string | undefined => {
      const preds = predecessorMap.get(taskId);
      return preds && preds.length > 0 ? preds.join(',') : undefined;
    };

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

    const result: SyncfusionTask[] = [];

    filteredStrategies.forEach(strategy => {
      const strategyProjects = projects
        .filter(p => p.strategyId === strategy.id)
        .sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
          if (dateA !== dateB) return dateA - dateB;
          return a.id.localeCompare(b.id);
        });

      let strategyStart: Date | null = strategy.startDate ? parseAsUTCDate(strategy.startDate) : null;
      let strategyEnd: Date | null = strategy.targetDate ? parseAsUTCDate(strategy.targetDate) : null;

      if (!strategyStart || !strategyEnd) {
        const strategyStartDates: Date[] = [];
        const strategyEndDates: Date[] = [];

        strategyProjects.forEach(p => {
          if (p.startDate) strategyStartDates.push(parseAsUTCDate(p.startDate));
          if (p.dueDate) strategyEndDates.push(parseAsUTCDate(p.dueDate));
        });

        if (!strategyStart && strategyStartDates.length > 0) {
          strategyStart = new Date(Math.min(...strategyStartDates.map(d => d.getTime())));
        }
        if (!strategyEnd && strategyEndDates.length > 0) {
          strategyEnd = new Date(Math.max(...strategyEndDates.map(d => d.getTime())));
        }
      }

      if (!strategyStart || !strategyEnd) {
        if (strategyProjects.length === 0) return;
        strategyStart = strategyStart || new Date();
        strategyEnd = strategyEnd || new Date();
      }

      const projectSubtasks: SyncfusionTask[] = [];

      strategyProjects.forEach(project => {
        if (!project.startDate || !project.dueDate) return;

        const projectStart = parseAsUTCDate(project.startDate);
        const projectEnd = parseAsUTCDate(project.dueDate);

        const projectActions = actions
          .filter(a => a.projectId === project.id && a.dueDate)
          .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
            return a.id.localeCompare(b.id);
          });

        const projectBarriers = barriers?.filter(b => 
          b.projectId === project.id && b.status !== 'resolved' && b.status !== 'closed'
        ) || [];
        const hasBarriers = projectBarriers.length > 0;

        const actionSubtasks: SyncfusionTask[] = projectActions.map(action => {
          const actionEnd = parseAsUTCDate(action.dueDate!);
          const actionStart = new Date(actionEnd);
          actionStart.setDate(actionStart.getDate() - 7);

          const actionTaskId = `action-${action.id}`;
          return {
            TaskID: actionTaskId,
            TaskName: action.title,
            StartDate: actionStart,
            EndDate: actionEnd,
            Progress: action.status === "achieved" ? 100 : action.status === "in_progress" ? 50 : 0,
            Predecessor: getPredecessor(actionTaskId),
            taskColor: getActionStatusColor(action.status),
            taskType: 'action' as const,
          };
        });

        const projectTaskId = `project-${project.id}`;
        projectSubtasks.push({
          TaskID: projectTaskId,
          TaskName: hasBarriers ? `⚠️ ${project.title}` : project.title,
          StartDate: projectStart,
          EndDate: projectEnd,
          Progress: project.progress || 0,
          Predecessor: getPredecessor(projectTaskId),
          subtasks: actionSubtasks.length > 0 ? actionSubtasks : undefined,
          taskColor: getProjectStatusColor(project.status),
          taskType: 'project' as const,
          hasBarriers,
        });
      });

      result.push({
        TaskID: `strategy-${strategy.id}`,
        TaskName: strategy.title,
        StartDate: strategyStart,
        EndDate: strategyEnd,
        Progress: strategy.progress || 0,
        subtasks: projectSubtasks.length > 0 ? projectSubtasks : undefined,
        taskColor: strategy.colorCode || "#1e3a8a",
        taskType: 'strategy' as const,
      });
    });

    return result;
  }, [filteredStrategies, projects, actions, barriers, dependencies]);

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    progress: 'Progress',
    child: 'subtasks',
    dependency: 'Predecessor',
  };

  const handleTaskbarEditing = (record: any) => {
    const taskData = record.taskData || record;
    const ganttProps = record.ganttProperties || record;
    
    if (!taskData || !taskData.TaskID) return;
    
    const taskId = taskData.TaskID;
    const parts = taskId.split('-');
    const type = parts[0];
    const id = parts.slice(1).join('-');

    if (type === 'project') {
      updateProjectMutation.mutate({
        id,
        startDate: ganttProps.startDate,
        dueDate: ganttProps.endDate,
      });
    } else if (type === 'action') {
      updateActionMutation.mutate({
        id,
        dueDate: ganttProps.endDate,
      });
    }
  };

  const handleRecordClick = (args: any) => {
    if (args.data && args.data.taskData) {
      const taskId = args.data.taskData.TaskID;
      const parts = taskId.split('-');
      const type = parts[0];
      const id = parts.slice(1).join('-');

      if (type === 'project' && args.data.taskData.hasBarriers) {
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

  useEffect(() => {
    if (ganttRef.current) {
      const viewSettings: { [key: string]: string } = {
        'Day': 'Day',
        'Week': 'Week', 
        'Month': 'Month'
      };
      ganttRef.current.timelineSettings = {
        timelineViewMode: viewSettings[timelineView] as any
      };
    }
  }, [timelineView]);

  useEffect(() => {
    if (ganttRef.current && licenseRegistered && ganttData.length > 0) {
      setTimeout(() => {
        if (ganttRef.current) {
          ganttRef.current.scrollToDate(new Date().toISOString().split('T')[0]);
        }
      }, 500);
    }
  }, [licenseRegistered, ganttData.length]);

  if (strategiesLoading || projectsLoading || actionsLoading || (!licenseRegistered && !licenseError)) {
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
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
                <Button
                  variant={viewType === 'timeline' ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1.5"
                  onClick={() => setViewType('timeline')}
                  data-testid="button-view-timeline"
                >
                  <GanttChart className="w-3.5 h-3.5" />
                  Timeline
                </Button>
                <Button
                  variant={viewType === 'calendar' ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1.5"
                  onClick={() => setViewType('calendar')}
                  data-testid="button-view-calendar"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Calendar
                </Button>
              </div>

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
                <PopoverContent className="w-auto min-w-[200px] max-w-[400px]" align="end">
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
                          <span className="text-sm whitespace-nowrap">{strategy.title}</span>
                        </label>
                      </div>
                    ))}
                    {activeStrategies.length === 0 && (
                      <p className="text-sm text-gray-500">No priorities available</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>


              {viewType === 'calendar' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    data-testid="button-calendar-prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    data-testid="button-calendar-next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setCalendarMonth(new Date())}
                    data-testid="button-calendar-today"
                  >
                    Today
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {viewType === 'calendar' ? (
            <CalendarView 
              projects={filteredProjects} 
              actions={filteredActions} 
              strategies={filteredStrategies}
              calendarMonth={calendarMonth}
              onDaySelect={(dayItems) => {
                setSelectedDayItems(dayItems);
                setDayDetailsDialogOpen(true);
              }}
            />
          ) : licenseError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                  Timeline chart unavailable
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  The Gantt chart license could not be loaded. Please contact your administrator.
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                  You can still use the Calendar view above.
                </p>
              </div>
            </div>
          ) : ganttData.length === 0 ? (
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
            <div className="h-full w-full syncfusion-gantt-container">
              <style>{`
                .syncfusion-gantt-container {
                  height: 100%;
                }
                .syncfusion-gantt-container .e-gantt {
                  height: 100% !important;
                }
                .e-gantt .e-chart-row-container .e-gantt-parent-taskbar {
                  border-radius: 4px;
                }
                .e-gantt .e-chart-row-container .e-gantt-child-taskbar {
                  border-radius: 4px;
                }
                .e-gantt .e-chart-row-container .e-gantt-milestone {
                  border-radius: 50%;
                }
                .dark .e-gantt .e-gantt-chart,
                .dark .e-gantt .e-chart-root-container {
                  background-color: #111827;
                }
                .dark .e-gantt .e-grid-header,
                .dark .e-gantt .e-timeline-header-container {
                  background-color: #1f2937;
                }
                .dark .e-gantt .e-content {
                  background-color: #111827;
                }
                .dark .e-gantt .e-row {
                  background-color: #111827;
                }
                .dark .e-gantt .e-row:hover {
                  background-color: #1f2937;
                }
                .dark .e-gantt .e-headercelldiv,
                .dark .e-gantt .e-headercell {
                  color: #9ca3af;
                }
                .dark .e-gantt .e-rowcell {
                  color: #e5e7eb;
                }
                /* Red today line indicator */
                .e-gantt .e-line-container-cell .e-gantt-chart-event-marker-line {
                  border-left: 2px solid #ef4444 !important;
                }
                .e-gantt .e-line-container-cell .e-gantt-chart-event-marker-line::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: -4px;
                  width: 0;
                  height: 0;
                  border-left: 4px solid transparent;
                  border-right: 4px solid transparent;
                  border-top: 6px solid #ef4444;
                }
                /* Grey dependency connector lines */
                .e-gantt .e-connector-line {
                  stroke: #9ca3af !important;
                }
                .e-gantt .e-connector-line-arrow {
                  fill: #9ca3af !important;
                }
                .e-gantt .e-line {
                  stroke: #9ca3af !important;
                }
              `}</style>
              <GanttComponent
                ref={ganttRef}
                dataSource={ganttData}
                taskFields={taskFields}
                height="100%"
                width="100%"
                highlightWeekends={true}
                allowSelection={true}
                allowResizing={true}
                editSettings={{
                  allowEditing: true,
                  allowTaskbarEditing: true
                }}
                enablePredecessorValidation={true}
                validateManualTasksOnLinking={true}
                taskMode="Manual"
                autoCalculateDateScheduling={false}
                taskbarHeight={25}
                rowHeight={46}
                gridLines="Both"
                selectionSettings={{ mode: 'Row', type: 'Single' }}
                timelineSettings={{
                  timelineViewMode: timelineView as any,
                  topTier: {
                    unit: timelineView === 'Day' ? 'Week' : timelineView === 'Week' ? 'Month' : 'Year',
                    format: timelineView === 'Day' ? 'MMM dd, yyyy' : timelineView === 'Week' ? 'MMM yyyy' : 'yyyy',
                  },
                  bottomTier: {
                    unit: timelineView as any,
                    format: timelineView === 'Day' ? 'd' : timelineView === 'Week' ? 'MMM dd' : 'MMM',
                  }
                }}
                treeColumnIndex={0}
                labelSettings={{
                  taskLabel: ''
                }}
                projectStartDate={(() => {
                  const MAX_DATE = new Date(8640000000000000);
                  const minDate = ganttData.reduce((min, task) => {
                    const checkDates = (t: SyncfusionTask): Date | null => {
                      let taskMin: Date | null = t.StartDate || null;
                      if (t.subtasks) {
                        t.subtasks.forEach(sub => {
                          const subMin = checkDates(sub);
                          if (subMin && (!taskMin || subMin < taskMin)) taskMin = subMin;
                        });
                      }
                      return taskMin;
                    };
                    const taskMin = checkDates(task);
                    if (taskMin && taskMin < min) return taskMin;
                    return min;
                  }, MAX_DATE);
                  if (minDate.getTime() === MAX_DATE.getTime()) {
                    const fallback = new Date();
                    fallback.setFullYear(fallback.getFullYear() - 1);
                    return fallback;
                  }
                  const extendedDate = new Date(minDate);
                  extendedDate.setMonth(extendedDate.getMonth() - 3);
                  return extendedDate;
                })()}
                projectEndDate={(() => {
                  const MIN_DATE = new Date(-8640000000000000);
                  const maxDate = ganttData.reduce((max, task) => {
                    const checkDates = (t: SyncfusionTask): Date | null => {
                      let taskMax: Date | null = t.EndDate || null;
                      if (t.subtasks) {
                        t.subtasks.forEach(sub => {
                          const subMax = checkDates(sub);
                          if (subMax && (!taskMax || subMax > taskMax)) taskMax = subMax;
                        });
                      }
                      return taskMax;
                    };
                    const taskMax = checkDates(task);
                    if (taskMax && taskMax > max) return taskMax;
                    return max;
                  }, MIN_DATE);
                  if (maxDate.getTime() === MIN_DATE.getTime()) {
                    const fallback = new Date();
                    fallback.setFullYear(fallback.getFullYear() + 3);
                    return fallback;
                  }
                  const extendedDate = new Date(maxDate);
                  extendedDate.setFullYear(extendedDate.getFullYear() + 2);
                  return extendedDate;
                })()}
                rowSelected={handleRecordClick}
                actionComplete={(args: any) => {
                  if (args.requestType === 'save' && args.modifiedRecords && args.modifiedRecords.length > 0) {
                    args.modifiedRecords.forEach((record: any) => handleTaskbarEditing(record));
                  }
                }}
                taskbarEditing={(args: any) => {
                  if (args.data && args.data.taskData) {
                    const taskType = args.data.taskData.taskType;
                    if (taskType === 'strategy') {
                      args.cancel = true;
                    }
                  }
                }}
                eventMarkers={[
                  {
                    day: new Date(),
                    label: 'Today',
                    cssClass: 'e-custom-event-marker'
                  }
                ]}
                queryTaskbarInfo={(args: any) => {
                  if (args.data && args.data.taskData) {
                    const taskType = args.data.taskData.taskType;
                    const color = args.data.taskData.taskColor || '#6b7280';
                    args.taskbarBgColor = color;
                    args.progressBarBgColor = color;
                    args.taskbarBorderColor = color;
                    if (args.taskbarElement) {
                      args.taskbarElement.style.setProperty('background-color', color, 'important');
                      args.taskbarElement.style.setProperty('box-sizing', 'border-box', 'important');
                      args.taskbarElement.style.setProperty('overflow', 'hidden', 'important');
                    }
                    const progressBar = args.taskbarElement?.querySelector('.e-gantt-child-progress');
                    if (progressBar) {
                      progressBar.style.setProperty('background-color', color, 'important');
                    }
                  }
                }}
              >
                <ColumnsDirective>
                  <ColumnDirective field="TaskID" headerText="ID" width="80" visible={false} isPrimaryKey={true} />
                  <ColumnDirective field="TaskName" headerText="Task Name" width="300" />
                  <ColumnDirective field="StartDate" headerText="Start" width="100" format="yMd" />
                  <ColumnDirective field="EndDate" headerText="End" width="100" format="yMd" />
                  <ColumnDirective field="Progress" headerText="Progress" width="80" />
                </ColumnsDirective>
                <Inject services={[Selection, DayMarkers, Edit]} />
              </GanttComponent>
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

      <Dialog open={dayDetailsDialogOpen} onOpenChange={setDayDetailsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col" data-testid="day-details-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-blue-500" />
              Due on {selectedDayItems?.date ? selectedDayItems.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {selectedDayItems && selectedDayItems.projects.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                  Projects ({selectedDayItems.projects.length})
                </h4>
                <div className="space-y-2">
                  {selectedDayItems.projects.map(project => {
                    const strategy = strategies?.find(s => s.id === project.strategyId);
                    return (
                      <div 
                        key={project.id}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                        style={{ borderLeft: `4px solid ${strategy?.colorCode || '#6b7280'}` }}
                        onClick={() => navigateToProject(project.id)}
                        data-testid={`day-project-${project.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                              {project.title}
                              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            {strategy && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {strategy.title}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge 
                              variant={project.status === 'completed' ? 'default' : project.status === 'on_hold' ? 'secondary' : 'outline'}
                              className="text-xs capitalize"
                            >
                              {project.status === 'on_hold' ? 'On Hold' : 
                               project.status === 'completed' ? 'Completed' : 
                               project.status === 'in_progress' ? 'In Progress' : 'Active'}
                            </Badge>
                            <div className="text-right">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {project.progress || 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDayItems && selectedDayItems.actions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  Actions ({selectedDayItems.actions.length})
                </h4>
                <div className="space-y-2">
                  {selectedDayItems.actions.map(action => {
                    const project = projects?.find(p => p.id === action.projectId);
                    const strategy = project ? strategies?.find(s => s.id === project.strategyId) : undefined;
                    return (
                      <div 
                        key={action.id}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                        style={{ borderLeft: `4px solid ${strategy?.colorCode || '#9ca3af'}` }}
                        onClick={() => project && navigateToAction(action.id, project.id)}
                        data-testid={`day-action-${action.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                              {action.title}
                              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            {project && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {project.title}
                                {strategy && ` • ${strategy.title}`}
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant={
                              action.status === 'achieved' ? 'default' : 
                              action.status === 'blocked' ? 'destructive' : 
                              action.status === 'off_track' ? 'destructive' :
                              'outline'
                            }
                            className="text-xs flex-shrink-0"
                          >
                            {action.status === 'achieved' ? 'Achieved' :
                             action.status === 'on_track' ? 'On Track' :
                             action.status === 'off_track' ? 'Off Track' :
                             action.status === 'blocked' ? 'Blocked' :
                             action.status === 'not_started' ? 'Not Started' : 'Not Started'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDayItems && selectedDayItems.projects.length === 0 && selectedDayItems.actions.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">No items due on this date</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
