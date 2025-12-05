import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { format, min, max, differenceInDays, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isToday, isBefore, startOfDay, addMonths, subMonths } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Strategy, Project, Action, Barrier, Dependency } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, AlertTriangle, GitBranch, Filter, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type TimeScale = "days" | "weeks" | "months";

type GanttRow = {
  id: string;
  type: "priority" | "project" | "action";
  title: string;
  parentId?: string;
  startDate?: Date;
  endDate?: Date;
  status: string;
  colorCode: string;
  barrierCount?: number;
  hasDependencies?: boolean;
  level: number;
  projectId?: string;
  strategyId?: string;
};

export default function Timeline() {
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const [timeScale, setTimeScale] = useState<TimeScale>("weeks");
  const [selectedPriorityIds, setSelectedPriorityIds] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('gantt-expanded-rows');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [showDependencyLine, setShowDependencyLine] = useState<string | null>(null);
  const [barrierDialogOpen, setBarrierDialogOpen] = useState(false);
  const [selectedProjectBarriers, setSelectedProjectBarriers] = useState<Barrier[]>([]);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragInfo, setDragInfo] = useState<{
    rowId: string;
    type: "start" | "end";
    originalDate: Date;
    currentDate: Date;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem('gantt-expanded-rows', JSON.stringify(Array.from(expandedRows)));
  }, [expandedRows]);

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

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
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
    const activeStrategies = strategies.filter(s => s.status !== 'Archived');
    if (selectedPriorityIds.length === 0) return activeStrategies;
    return activeStrategies.filter(s => selectedPriorityIds.includes(s.id));
  }, [strategies, selectedPriorityIds]);

  const { ganttRows, dateRange, timeColumns } = useMemo(() => {
    if (!filteredStrategies || !projects || !actions) {
      return { ganttRows: [], dateRange: { min: new Date(), max: new Date(), totalDays: 1 }, timeColumns: [] };
    }

    const rows: GanttRow[] = [];
    const allDates: Date[] = [];

    filteredStrategies.forEach(strategy => {
      const strategyProjects = projects.filter(p => p.strategyId === strategy.id);
      const hasProjects = strategyProjects.length > 0;
      
      if (!hasProjects) return;

      allDates.push(new Date(strategy.startDate), new Date(strategy.targetDate));

      rows.push({
        id: `priority-${strategy.id}`,
        type: "priority",
        title: strategy.title,
        startDate: new Date(strategy.startDate),
        endDate: new Date(strategy.targetDate),
        status: strategy.status,
        colorCode: strategy.colorCode,
        level: 0,
        strategyId: strategy.id,
      });

      if (expandedRows.has(`priority-${strategy.id}`)) {
        strategyProjects.forEach(project => {
          const projectActions = actions.filter(a => a.projectId === project.id && a.dueDate);
          const hasActions = projectActions.length > 0;
          
          if (!hasActions && !project.startDate && !project.dueDate) return;

          const projectBarriers = barriers?.filter(b => b.projectId === project.id && b.status !== 'resolved' && b.status !== 'closed') || [];
          const projectDependencies = dependencies?.filter(d => 
            (d.sourceType === 'project' && d.sourceId === project.id) ||
            (d.targetType === 'project' && d.targetId === project.id)
          ) || [];

          allDates.push(new Date(project.startDate), new Date(project.dueDate));

          rows.push({
            id: `project-${project.id}`,
            type: "project",
            title: project.title,
            parentId: `priority-${strategy.id}`,
            startDate: new Date(project.startDate),
            endDate: new Date(project.dueDate),
            status: project.status,
            colorCode: strategy.colorCode,
            barrierCount: projectBarriers.length,
            hasDependencies: projectDependencies.length > 0,
            level: 1,
            projectId: project.id,
            strategyId: strategy.id,
          });

          if (expandedRows.has(`project-${project.id}`)) {
            projectActions.forEach(action => {
              if (action.dueDate) {
                allDates.push(new Date(action.dueDate));
                
                const actionDependencies = dependencies?.filter(d =>
                  (d.sourceType === 'action' && d.sourceId === action.id) ||
                  (d.targetType === 'action' && d.targetId === action.id)
                ) || [];

                rows.push({
                  id: `action-${action.id}`,
                  type: "action",
                  title: action.title,
                  parentId: `project-${project.id}`,
                  endDate: new Date(action.dueDate),
                  status: action.status,
                  colorCode: strategy.colorCode,
                  hasDependencies: actionDependencies.length > 0,
                  level: 2,
                  projectId: project.id,
                  strategyId: strategy.id,
                });
              }
            });
          }
        });
      }
    });

    const minDate = allDates.length > 0 ? startOfMonth(subMonths(min(allDates), 1)) : startOfMonth(new Date());
    const maxDate = allDates.length > 0 ? endOfMonth(addMonths(max(allDates), 1)) : endOfMonth(new Date());
    const totalDays = differenceInDays(maxDate, minDate) + 1;

    let columns: { date: Date; label: string; width: number }[] = [];
    
    if (timeScale === "days") {
      const days = eachDayOfInterval({ start: minDate, end: maxDate });
      columns = days.map(day => ({
        date: day,
        label: format(day, 'd'),
        width: 30,
      }));
    } else if (timeScale === "weeks") {
      const weeks = eachWeekOfInterval({ start: minDate, end: maxDate });
      columns = weeks.map(week => ({
        date: week,
        label: format(week, 'MMM d'),
        width: 80,
      }));
    } else {
      const months = eachMonthOfInterval({ start: minDate, end: maxDate });
      columns = months.map(month => ({
        date: month,
        label: format(month, 'MMM yyyy'),
        width: 120,
      }));
    }

    return {
      ganttRows: rows,
      dateRange: { min: minDate, max: maxDate, totalDays },
      timeColumns: columns,
    };
  }, [filteredStrategies, projects, actions, barriers, dependencies, expandedRows, timeScale]);

  const totalWidth = timeColumns.reduce((sum, col) => sum + col.width, 0);

  const getPositionPixels = useCallback((date: Date) => {
    const daysSinceStart = differenceInDays(date, dateRange.min);
    const pixelsPerDay = totalWidth / dateRange.totalDays;
    return daysSinceStart * pixelsPerDay;
  }, [dateRange, totalWidth]);

  const getDateFromPixels = useCallback((pixels: number) => {
    const pixelsPerDay = totalWidth / dateRange.totalDays;
    const daysSinceStart = Math.round(pixels / pixelsPerDay);
    return addDays(dateRange.min, daysSinceStart);
  }, [dateRange, totalWidth]);

  const todayPosition = useMemo(() => {
    const userTimezone = (currentUser as any)?.timezone || 'America/Chicago';
    const now = new Date();
    const todayInTimezone = toZonedTime(now, userTimezone);
    
    if (todayInTimezone < dateRange.min || todayInTimezone > dateRange.max) {
      return null;
    }
    
    return getPositionPixels(todayInTimezone);
  }, [currentUser, dateRange, getPositionPixels]);

  const toggleExpand = (rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
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

  const getStatusColor = (status: string, type: "priority" | "project" | "action") => {
    if (type === "action") {
      switch (status) {
        case "achieved": return "bg-green-500";
        case "in_progress": return "bg-blue-500";
        case "at_risk": return "bg-red-500";
        case "not_started": return "bg-gray-400";
        default: return "bg-gray-400";
      }
    } else if (type === "project") {
      switch (status) {
        case "C": return "bg-green-500";
        case "OT": return "bg-yellow-500";
        case "OH": return "bg-red-500";
        case "B": return "bg-orange-500";
        case "NYS": return "bg-gray-400";
        default: return "bg-gray-400";
      }
    } else {
      switch (status) {
        case "Active": return "bg-blue-500";
        case "Completed": return "bg-green-500";
        default: return "bg-gray-400";
      }
    }
  };

  const handleBarrierClick = (projectId: string, projectTitle: string) => {
    const projectBarriers = barriers?.filter(b => 
      b.projectId === projectId && b.status !== 'resolved' && b.status !== 'closed'
    ) || [];
    setSelectedProjectBarriers(projectBarriers);
    setSelectedProjectTitle(projectTitle);
    setBarrierDialogOpen(true);
  };

  const handleDependencyClick = (rowId: string) => {
    setShowDependencyLine(prev => prev === rowId ? null : rowId);
  };

  const getDependencyLines = useCallback((rowId: string) => {
    if (!dependencies || !ganttRows) return [];
    
    const parts = rowId.split('-');
    const type = parts[0];
    const id = parts.slice(1).join('-');
    
    const relevantDeps = dependencies.filter(d =>
      (d.sourceType === type && d.sourceId === id) ||
      (d.targetType === type && d.targetId === id)
    );

    return relevantDeps.map(dep => {
      const sourceRowId = `${dep.sourceType}-${dep.sourceId}`;
      const targetRowId = `${dep.targetType}-${dep.targetId}`;
      
      const sourceRow = ganttRows.find(r => r.id === sourceRowId);
      const targetRow = ganttRows.find(r => r.id === targetRowId);
      
      if (!sourceRow || !targetRow) return null;
      
      const sourceEndDate = sourceRow.endDate || sourceRow.startDate;
      const targetStartDate = targetRow.startDate || targetRow.endDate;
      
      if (!sourceEndDate || !targetStartDate) return null;
      
      const sourceRowIndex = ganttRows.findIndex(r => r.id === sourceRowId);
      const targetRowIndex = ganttRows.findIndex(r => r.id === targetRowId);
      
      return {
        sourceX: getPositionPixels(sourceEndDate),
        sourceY: sourceRowIndex * 48 + 24,
        targetX: getPositionPixels(targetStartDate),
        targetY: targetRowIndex * 48 + 24,
        targetDate: targetStartDate,
      };
    }).filter(Boolean);
  }, [dependencies, ganttRows, getPositionPixels]);

  const handleMouseDown = (e: React.MouseEvent, rowId: string, type: "start" | "end", currentDate: Date) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragInfo({
      rowId,
      type,
      originalDate: currentDate,
      currentDate: currentDate,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragInfo || !ganttContainerRef.current) return;
    
    const container = ganttContainerRef.current;
    const rect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const leftColumnWidth = 280;
    const relativeX = e.clientX - rect.left - leftColumnWidth + scrollLeft;
    
    let newDate = getDateFromPixels(Math.max(0, relativeX));
    
    newDate = newDate < dateRange.min ? dateRange.min : newDate > dateRange.max ? dateRange.max : newDate;
    
    const parts = dragInfo.rowId.split('-');
    const type = parts[0];
    const id = parts.slice(1).join('-');
    
    if (type === 'project') {
      const project = projects?.find(p => p.id === id);
      if (project) {
        if (dragInfo.type === 'start') {
          const endDate = new Date(project.dueDate);
          if (newDate > endDate) newDate = endDate;
        } else {
          const startDate = new Date(project.startDate);
          if (newDate < startDate) newDate = startDate;
        }
      }
    }
    
    setDragInfo(prev => prev ? { ...prev, currentDate: newDate } : null);
  }, [isDragging, dragInfo, getDateFromPixels, dateRange, projects]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragInfo) return;
    
    const parts = dragInfo.rowId.split('-');
    const type = parts[0];
    const id = parts.slice(1).join('-');
    
    let finalDate = dragInfo.currentDate;
    finalDate = finalDate < dateRange.min ? dateRange.min : finalDate > dateRange.max ? dateRange.max : finalDate;
    
    if (type === 'project') {
      const project = projects?.find(p => p.id === id);
      if (project) {
        let newStartDate = new Date(project.startDate);
        let newDueDate = new Date(project.dueDate);
        
        if (dragInfo.type === 'start') {
          newStartDate = finalDate;
          if (newStartDate > newDueDate) {
            toast({ title: "Invalid date", description: "Start date cannot be after end date", variant: "destructive" });
            setIsDragging(false);
            setDragInfo(null);
            return;
          }
        } else {
          newDueDate = finalDate;
          if (newDueDate < newStartDate) {
            toast({ title: "Invalid date", description: "End date cannot be before start date", variant: "destructive" });
            setIsDragging(false);
            setDragInfo(null);
            return;
          }
        }
        
        updateProjectMutation.mutate({
          id,
          startDate: newStartDate,
          dueDate: newDueDate,
        });
      }
    } else if (type === 'action') {
      updateActionMutation.mutate({
        id,
        dueDate: finalDate,
      });
    }
    
    setIsDragging(false);
    setDragInfo(null);
  }, [isDragging, dragInfo, projects, updateProjectMutation, updateActionMutation, dateRange, toast]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (ganttContainerRef.current && todayPosition !== null) {
      const container = ganttContainerRef.current;
      const scrollPosition = todayPosition - container.clientWidth / 2;
      container.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [todayPosition, timeColumns]);

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
    <div className="min-h-screen flex bg-white dark:bg-black">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gantt Chart</h2>
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
                  variant={timeScale === "days" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeScale("days")}
                  data-testid="button-scale-days"
                >
                  Days
                </Button>
                <Button
                  variant={timeScale === "weeks" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeScale("weeks")}
                  data-testid="button-scale-weeks"
                >
                  Weeks
                </Button>
                <Button
                  variant={timeScale === "months" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeScale("months")}
                  data-testid="button-scale-months"
                >
                  Months
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {ganttRows.length === 0 ? (
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
            <div className="h-full flex flex-col">
              <div 
                ref={ganttContainerRef}
                className="flex-1 overflow-auto relative"
                style={{ cursor: isDragging ? 'ew-resize' : 'default' }}
              >
                <div className="inline-flex min-w-full">
                  <div className="sticky left-0 z-20 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800">
                    <div className="h-12 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center px-4 w-[280px]">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Name</span>
                    </div>
                    {ganttRows.map((row) => (
                      <div
                        key={row.id}
                        className={`h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 w-[280px] ${
                          row.type === 'priority' ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-black'
                        }`}
                        style={{ paddingLeft: `${16 + row.level * 20}px` }}
                      >
                        {((row.type === 'priority' && projects?.some(p => p.strategyId === row.strategyId)) ||
                          (row.type === 'project' && actions?.some(a => a.projectId === row.projectId && a.dueDate))) && (
                          <button
                            onClick={() => toggleExpand(row.id)}
                            className="mr-2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            data-testid={`button-expand-${row.id}`}
                          >
                            {expandedRows.has(row.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        )}
                        {row.type === 'priority' && (
                          <div 
                            className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                            style={{ backgroundColor: row.colorCode }}
                          />
                        )}
                        <span className={`text-sm truncate ${
                          row.type === 'priority' ? 'font-semibold text-gray-900 dark:text-white' :
                          row.type === 'project' ? 'font-medium text-gray-800 dark:text-gray-200' :
                          'text-gray-700 dark:text-gray-300'
                        }`}>
                          {row.title}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="relative" style={{ width: `${totalWidth}px` }}>
                    <div className="h-12 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex sticky top-0 z-10">
                      {timeColumns.map((col, idx) => (
                        <div
                          key={idx}
                          className="border-r border-gray-200 dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400"
                          style={{ width: `${col.width}px` }}
                        >
                          {col.label}
                        </div>
                      ))}
                    </div>

                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 dark:bg-orange-400 z-30 pointer-events-none"
                        style={{ left: `${todayPosition}px` }}
                      >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-500 dark:bg-orange-400 text-white text-xs font-medium rounded whitespace-nowrap">
                          Today
                        </div>
                      </div>
                    )}

                    {showDependencyLine && (
                      <svg 
                        className="absolute top-12 left-0 pointer-events-none z-20" 
                        style={{ width: `${totalWidth}px`, height: `${ganttRows.length * 48}px` }}
                      >
                        {getDependencyLines(showDependencyLine).map((line, idx) => (
                          line && (
                            <g key={idx}>
                              <line
                                x1={line.sourceX}
                                y1={line.sourceY}
                                x2={line.targetX}
                                y2={line.targetY}
                                stroke="#6366f1"
                                strokeWidth="2"
                                strokeDasharray="6 4"
                                markerEnd="url(#arrowhead)"
                              />
                              <circle cx={line.targetX} cy={line.targetY} r="4" fill="#6366f1" />
                            </g>
                          )
                        ))}
                        <defs>
                          <marker
                            id="arrowhead"
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                          >
                            <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
                          </marker>
                        </defs>
                      </svg>
                    )}

                    {ganttRows.map((row, rowIndex) => {
                      const rowStartDate = dragInfo?.rowId === row.id && dragInfo.type === 'start' 
                        ? dragInfo.currentDate 
                        : row.startDate;
                      const rowEndDate = dragInfo?.rowId === row.id && dragInfo.type === 'end'
                        ? dragInfo.currentDate
                        : row.endDate;
                      
                      const startPixels = rowStartDate ? getPositionPixels(rowStartDate) : null;
                      const endPixels = rowEndDate ? getPositionPixels(rowEndDate) : null;
                      
                      let barLeft = 0;
                      let barWidth = 0;
                      
                      if (startPixels !== null && endPixels !== null) {
                        barLeft = Math.min(startPixels, endPixels);
                        barWidth = Math.abs(endPixels - startPixels) + (timeScale === 'days' ? 30 : timeScale === 'weeks' ? 11 : 4);
                      } else if (endPixels !== null) {
                        barLeft = endPixels - 20;
                        barWidth = 40;
                      }

                      const canDrag = row.type === 'project' || row.type === 'action';

                      return (
                        <div
                          key={row.id}
                          className={`h-12 border-b border-gray-200 dark:border-gray-800 relative ${
                            row.type === 'priority' ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''
                          }`}
                          data-testid={`gantt-row-${row.id}`}
                        >
                          {timeColumns.map((col, idx) => (
                            <div
                              key={idx}
                              className="absolute top-0 bottom-0 border-r border-gray-100 dark:border-gray-800/50"
                              style={{ left: `${timeColumns.slice(0, idx).reduce((sum, c) => sum + c.width, 0)}px`, width: `${col.width}px` }}
                            />
                          ))}

                          {(barWidth > 0) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`absolute top-2 h-8 rounded-md flex items-center group ${getStatusColor(row.status, row.type)}`}
                                    style={{
                                      left: `${barLeft}px`,
                                      width: `${Math.max(barWidth, 40)}px`,
                                      opacity: row.type === 'priority' ? 0.6 : 0.9,
                                    }}
                                  >
                                    {canDrag && startPixels !== null && (
                                      <div
                                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-md z-10"
                                        onMouseDown={(e) => handleMouseDown(e, row.id, 'start', row.startDate!)}
                                      />
                                    )}
                                    
                                    <span className="text-xs font-medium text-white truncate px-3 flex-1">
                                      {row.type !== 'priority' && row.title}
                                    </span>

                                    {row.hasDependencies && (
                                      <button
                                        onClick={() => handleDependencyClick(row.id)}
                                        className={`mr-1 p-1 rounded hover:bg-white/20 ${showDependencyLine === row.id ? 'bg-white/30' : ''}`}
                                        data-testid={`button-dependency-${row.id}`}
                                      >
                                        <GitBranch className="w-3 h-3 text-white" />
                                      </button>
                                    )}

                                    {row.type === 'project' && row.barrierCount && row.barrierCount > 0 && (
                                      <button
                                        onClick={() => handleBarrierClick(row.projectId!, row.title)}
                                        className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-red-500 rounded-full text-white text-xs font-bold shadow-md hover:bg-red-600 z-10"
                                        data-testid={`button-barrier-${row.id}`}
                                      >
                                        <AlertTriangle className="w-3 h-3" />
                                        {row.barrierCount > 1 && (
                                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-700 rounded-full text-[10px] flex items-center justify-center">
                                            {row.barrierCount}
                                          </span>
                                        )}
                                      </button>
                                    )}

                                    {canDrag && (
                                      <div
                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-md z-10"
                                        onMouseDown={(e) => handleMouseDown(e, row.id, 'end', row.endDate!)}
                                      />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="text-sm">
                                    <p className="font-medium">{row.title}</p>
                                    {row.startDate && row.endDate ? (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {format(row.startDate, 'MMM d, yyyy')} - {format(row.endDate, 'MMM d, yyyy')}
                                      </p>
                                    ) : row.endDate ? (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Due: {format(row.endDate, 'MMM d, yyyy')}
                                      </p>
                                    ) : null}
                                    <p className="text-xs mt-1 capitalize">
                                      Status: {row.status.replace(/_/g, ' ')}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Legend:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">Completed/Achieved</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">Active/In Progress</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-yellow-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">On Track</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">Behind</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">At Risk/On Hold</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gray-400"></div>
                    <span className="text-gray-600 dark:text-gray-400">Not Started</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="text-gray-600 dark:text-gray-400">Has Barriers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-indigo-500" />
                    <span className="text-gray-600 dark:text-gray-400">Has Dependencies</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Dialog open={barrierDialogOpen} onOpenChange={setBarrierDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Barriers for {selectedProjectTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedProjectBarriers.map(barrier => (
                <div
                  key={barrier.id}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={
                      barrier.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                      barrier.severity === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }>
                      {barrier.severity}
                    </Badge>
                    <Badge variant="outline">{barrier.status}</Badge>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">{barrier.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{barrier.description}</p>
                  {barrier.targetResolutionDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Target resolution: {format(new Date(barrier.targetResolutionDate), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              ))}
              {selectedProjectBarriers.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No active barriers for this project
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
