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
import "@/styles/syncfusion-apple-hig.css";
import type { Strategy, Project, Action, Barrier, Dependency } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter, Calendar, AlertTriangle, GanttChart } from "lucide-react";
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
}

export default function Timeline() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const ganttRef = useRef<GanttComponent>(null);
  
  const [timelineView, setTimelineView] = useState<'Day' | 'Week' | 'Month'>('Month');
  const [selectedPriorityIds, setSelectedPriorityIds] = useState<string[]>([]);
  const [barrierDialogOpen, setBarrierDialogOpen] = useState(false);
  const [selectedProjectBarriers, setSelectedProjectBarriers] = useState<Barrier[]>([]);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");
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

      // Always derive strategy dates from child projects and actions
      const strategyStartDates: Date[] = [];
      const strategyEndDates: Date[] = [];

      // Collect dates from all projects
      strategyProjects.forEach(p => {
        if (p.startDate) strategyStartDates.push(parseAsUTCDate(p.startDate));
        if (p.dueDate) strategyEndDates.push(parseAsUTCDate(p.dueDate));
      });

      // Collect dates from all actions linked to this strategy (via projects OR directly)
      const allStrategyActions = actions.filter(a => 
        a.dueDate && (
          strategyProjects.some(p => p.id === a.projectId) ||
          (a as any).strategyId === strategy.id
        )
      );
      allStrategyActions.forEach(action => {
        const actionEnd = parseAsUTCDate(action.dueDate!);
        const actionStart = new Date(actionEnd);
        actionStart.setDate(actionStart.getDate() - 7);
        strategyStartDates.push(actionStart);
        strategyEndDates.push(actionEnd);
      });

      // Skip strategies with no dated children at all
      if (strategyStartDates.length === 0 && strategyEndDates.length === 0) {
        return;
      }

      const strategyStart = strategyStartDates.length > 0 
        ? new Date(Math.min(...strategyStartDates.map(d => d.getTime())))
        : new Date();
      const strategyEnd = strategyEndDates.length > 0 
        ? new Date(Math.max(...strategyEndDates.map(d => d.getTime())))
        : new Date();

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
          TaskName: project.title,
          StartDate: projectStart,
          EndDate: projectEnd,
          Progress: project.progress || 0,
          Predecessor: getPredecessor(projectTaskId),
          subtasks: actionSubtasks.length > 0 ? actionSubtasks : undefined,
          taskColor: getProjectStatusColor(project.status),
          taskType: 'project' as const,
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
      <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F7' }}>
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="animate-pulse">
            <div className="h-8 rounded-xl w-1/4 mb-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}></div>
            <div className="h-4 rounded-xl w-1/2 mb-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}></div>
          </div>
        </main>
      </div>
    );
  }

  const activeStrategies = strategies?.filter(s => s.status !== 'Archived') || [];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F7' }}>
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header - Apple HIG Glassmorphism */}
        <header 
          className="px-6 py-5"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#AF52DE' }}
              >
                <GanttChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#1D1D1F' }}>Strategic Roadmap</h2>
                <p className="text-sm" style={{ color: '#86868B' }}>
                  Priorities, Projects, and Actions timeline
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 h-9 rounded-full border-0"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}
                    data-testid="button-priority-filter"
                  >
                    <Filter className="w-3.5 h-3.5" style={{ color: '#007AFF' }} />
                    <span style={{ color: '#1D1D1F' }}>Filter</span>
                    {selectedPriorityIds.length > 0 && (
                      <Badge 
                        className="ml-1 h-5 px-1.5 text-xs text-white"
                        style={{ backgroundColor: '#007AFF' }}
                      >
                        {selectedPriorityIds.length}
                      </Badge>
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


            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {licenseError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                  Timeline chart unavailable
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  The Gantt chart license could not be loaded. Please contact your administrator.
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
            <div className="h-full w-full apple-hig-gantt">
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
                autoCalculateDateScheduling={false}
                taskbarHeight={22}
                rowHeight={40}
                gridLines="Horizontal"
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
                rowDataBound={(args: any) => {
                  if (args.data && args.data.taskData) {
                    const taskType = args.data.taskData.taskType;
                    const row = args.row as HTMLElement;
                    if (row) {
                      if (taskType === 'strategy') {
                        row.style.setProperty('background-color', 'hsl(221.2, 83.2%, 53.3%)', 'important');
                        row.style.setProperty('color', 'white', 'important');
                        row.style.setProperty('font-weight', 'bold', 'important');
                        const cells = row.querySelectorAll('td');
                        cells.forEach((cell: HTMLElement) => {
                          cell.style.setProperty('background-color', 'hsl(221.2, 83.2%, 53.3%)', 'important');
                          cell.style.setProperty('color', 'white', 'important');
                          cell.style.setProperty('font-weight', 'bold', 'important');
                        });
                      } else if (taskType === 'project') {
                        const taskNameCell = row.querySelector('td[aria-colindex="2"]') as HTMLElement;
                        if (taskNameCell) {
                          taskNameCell.style.setProperty('padding-left', '24px', 'important');
                        }
                      } else if (taskType === 'action') {
                        const taskNameCell = row.querySelector('td[aria-colindex="2"]') as HTMLElement;
                        if (taskNameCell) {
                          taskNameCell.style.setProperty('padding-left', '48px', 'important');
                        }
                      }
                    }
                  }
                }}
              >
                <ColumnsDirective>
                  <ColumnDirective field="TaskID" headerText="ID" width="80" visible={false} isPrimaryKey={true} />
                  <ColumnDirective field="TaskName" headerText="Task Name" width="300" />
                  <ColumnDirective field="StartDate" headerText="Start" width="100" format="yMd" />
                  <ColumnDirective field="EndDate" headerText="End" width="100" format="yMd" />
                  <ColumnDirective field="Progress" headerText="Progress" width="80" visible={false} />
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

    </div>
  );
}
