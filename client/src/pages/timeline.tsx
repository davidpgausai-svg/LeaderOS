import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { useMemo, useState, useEffect, useRef } from "react";
import { GanttComponent, Inject, Edit, Selection, DayMarkers, ColumnsDirective, ColumnDirective } from "@syncfusion/ej2-react-gantt";
import "@/styles/syncfusion-gantt.css";
import type { Strategy, Project, Action, Dependency } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter, Calendar, ChevronRight, ChevronLeft, LayoutGrid, GanttChart, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface GanttDataItem {
  TaskID: string;
  TaskName: string;
  StartDate: Date;
  EndDate: Date;
  Progress: number;
  Duration?: number;
  Predecessor?: string;
  subtasks?: GanttDataItem[];
  isParent?: boolean;
  level?: number;
  colorCode?: string;
  entityType: 'priority' | 'project' | 'action';
  entityId: string;
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
  const ganttRef = useRef<GanttComponent | null>(null);
  
  const [viewType, setViewType] = useState<'timeline' | 'calendar'>('timeline');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedPriorityIds, setSelectedPriorityIds] = useState<string[]>([]);
  const [dayDetailsDialogOpen, setDayDetailsDialogOpen] = useState(false);
  const [selectedDayItems, setSelectedDayItems] = useState<DayItems | null>(null);

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

  const ganttData = useMemo(() => {
    if (!filteredStrategies || !projects || !actions) return [];

    const result: GanttDataItem[] = [];
    const renderedTaskIds = new Set<string>();

    filteredStrategies.forEach(strategy => {
      const strategyProjects = projects
        .filter(p => p.strategyId === strategy.id)
        .sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : Infinity;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : Infinity;
          if (dateA !== dateB) return dateA - dateB;
          return a.id.localeCompare(b.id);
        });

      let strategyStart: Date | null = strategy.startDate ? new Date(strategy.startDate) : null;
      let strategyEnd: Date | null = strategy.targetDate ? new Date(strategy.targetDate) : null;

      if (!strategyStart || !strategyEnd) {
        const strategyStartDates: Date[] = [];
        const strategyEndDates: Date[] = [];

        strategyProjects.forEach(p => {
          if (p.startDate) strategyStartDates.push(new Date(p.startDate));
          if (p.dueDate) strategyEndDates.push(new Date(p.dueDate));
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

      const strategyTaskId = `strategy-${strategy.id}`;
      renderedTaskIds.add(strategyTaskId);

      const projectSubtasks: GanttDataItem[] = [];

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

        const projectTaskId = `project-${project.id}`;
        renderedTaskIds.add(projectTaskId);

        const actionSubtasks: GanttDataItem[] = [];

        projectActions.forEach(action => {
          if (!action.dueDate) return;

          const actionEnd = new Date(action.dueDate);
          const actionStart = new Date(actionEnd);
          actionStart.setDate(actionStart.getDate() - 7);

          const actionTaskId = `action-${action.id}`;
          renderedTaskIds.add(actionTaskId);

          actionSubtasks.push({
            TaskID: actionTaskId,
            TaskName: action.title,
            StartDate: actionStart,
            EndDate: actionEnd,
            Progress: action.status === "achieved" ? 100 : action.status === "in_progress" ? 50 : 0,
            level: 2,
            entityType: 'action',
            entityId: action.id,
          });
        });

        projectSubtasks.push({
          TaskID: projectTaskId,
          TaskName: project.title,
          StartDate: projectStart,
          EndDate: projectEnd,
          Progress: project.progress || 0,
          level: 1,
          entityType: 'project',
          entityId: project.id,
          subtasks: actionSubtasks.length > 0 ? actionSubtasks : undefined,
        });
      });

      result.push({
        TaskID: strategyTaskId,
        TaskName: strategy.title,
        StartDate: strategyStart,
        EndDate: strategyEnd,
        Progress: strategy.progress || 0,
        level: 0,
        colorCode: strategy.colorCode,
        isParent: true,
        entityType: 'priority',
        entityId: strategy.id,
        subtasks: projectSubtasks.length > 0 ? projectSubtasks : undefined,
      });
    });

    if (dependencies && dependencies.length > 0) {
      const addPredecessors = (items: GanttDataItem[]) => {
        items.forEach(item => {
          const predecessors: string[] = [];
          dependencies.forEach(dep => {
            const sourceTaskId = `${dep.sourceType}-${dep.sourceId}`;
            const targetTaskId = `${dep.targetType}-${dep.targetId}`;
            if (sourceTaskId === item.TaskID && renderedTaskIds.has(targetTaskId)) {
              predecessors.push(targetTaskId);
            }
          });
          if (predecessors.length > 0) {
            item.Predecessor = predecessors.join(',');
          }
          if (item.subtasks) {
            addPredecessors(item.subtasks);
          }
        });
      };
      addPredecessors(result);
    }

    return result;
  }, [filteredStrategies, projects, actions, dependencies]);

  useEffect(() => {
    if (ganttRef.current && ganttData.length > 0) {
      setTimeout(() => {
        ganttRef.current?.scrollToDate(new Date().toISOString().split('T')[0]);
      }, 500);
    }
  }, [ganttData]);

  const handlePriorityFilterChange = (priorityId: string, checked: boolean) => {
    setSelectedPriorityIds(prev => {
      if (checked) {
        return [...prev, priorityId];
      } else {
        return prev.filter(id => id !== priorityId);
      }
    });
  };

  const handleTaskbarEdited = (args: any) => {
    if (args.data) {
      const taskId = args.data.TaskID as string;
      const parts = taskId.split('-');
      const type = parts[0];
      const id = parts.slice(1).join('-');

      if (type === 'project') {
        updateProjectMutation.mutate({
          id,
          startDate: new Date(args.data.StartDate),
          dueDate: new Date(args.data.EndDate),
        });
      } else if (type === 'action') {
        updateActionMutation.mutate({
          id,
          dueDate: new Date(args.data.EndDate),
        });
      }
    }
  };

  const queryTaskbarInfo = (args: any) => {
    if (args.data && args.data.taskData) {
      const taskData = args.data.taskData;
      const level = taskData.level || 0;
      
      if (level === 0 && taskData.colorCode) {
        args.taskbarBgColor = taskData.colorCode;
        args.progressBarBgColor = taskData.colorCode;
      } else if (level === 1) {
        const progress = taskData.Progress || 0;
        if (progress >= 100) {
          args.taskbarBgColor = '#22c55e';
        } else if (progress >= 75) {
          args.taskbarBgColor = '#3b82f6';
        } else if (progress >= 50) {
          args.taskbarBgColor = '#eab308';
        } else if (progress > 0) {
          args.taskbarBgColor = '#f97316';
        } else {
          args.taskbarBgColor = '#6b7280';
        }
        args.progressBarBgColor = args.taskbarBgColor;
      } else if (level === 2) {
        const progress = taskData.Progress || 0;
        if (progress >= 100) {
          args.taskbarBgColor = '#86efac';
        } else if (progress > 0) {
          args.taskbarBgColor = '#93c5fd';
        } else {
          args.taskbarBgColor = '#d1d5db';
        }
        args.progressBarBgColor = args.taskbarBgColor;
      }
    }
  };

  const queryCellInfo = (args: any) => {
    if (args.column && args.column.field === 'TaskName' && args.data) {
      const level = args.data.level || args.data.taskData?.level || 0;
      if (level === 0) {
        args.cell.style.fontWeight = 'bold';
        args.cell.style.fontSize = '13px';
      }
    }
  };

  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    progress: 'Progress',
    child: 'subtasks',
    dependency: 'Predecessor',
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
              <GanttComponent
                ref={ganttRef}
                dataSource={ganttData}
                taskFields={taskFields}
                height="100%"
                width="100%"
                highlightWeekends={true}
                allowSelection={true}
                allowResizing={true}
                editSettings={{ allowTaskbarEditing: true, allowEditing: false }}
                enableVirtualization={false}
                showColumnMenu={false}
                collapseAllParentTasks={false}
                treeColumnIndex={0}
                splitterSettings={{ position: '35%' }}
                taskbarEdited={handleTaskbarEdited}
                queryTaskbarInfo={queryTaskbarInfo}
                queryCellInfo={queryCellInfo}
                dayWorkingTime={[{ from: 0, to: 24 }]}
                includeWeekend={true}
                rowHeight={36}
                taskbarHeight={24}
                allowUnscheduledTasks={false}
              >
                <ColumnsDirective>
                  <ColumnDirective field="TaskName" headerText="Task Name" width="200" />
                  <ColumnDirective field="StartDate" headerText="Start Date" width="100" format="yMd" textAlign="Left" />
                  <ColumnDirective field="EndDate" headerText="End Date" width="100" format="yMd" textAlign="Left" />
                </ColumnsDirective>
                <Inject services={[Edit, Selection, DayMarkers]} />
              </GanttComponent>
            </div>
          )}
        </div>
      </main>

      {/* Day Details Dialog */}
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
            {/* Projects Section */}
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
                              variant={project.status === 'C' ? 'default' : 'outline'}
                              className="text-xs capitalize"
                            >
                              {project.status}
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

            {/* Actions Section */}
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
                        onClick={() => action.projectId && navigateToAction(action.id, action.projectId)}
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
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant={action.status === 'achieved' ? 'default' : action.status === 'at_risk' ? 'destructive' : 'outline'}
                            className="text-xs capitalize"
                          >
                            {action.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
