import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { useMemo, useState, useEffect, useRef } from "react";
import { registerLicense } from "@syncfusion/ej2-base";
import { 
  ScheduleComponent, 
  Day, 
  Week, 
  WorkWeek, 
  Month, 
  Agenda, 
  Inject,
  ViewsDirective,
  ViewDirective,
  EventSettingsModel
} from "@syncfusion/ej2-react-schedule";
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-buttons/styles/material.css";
import "@syncfusion/ej2-calendars/styles/material.css";
import "@syncfusion/ej2-dropdowns/styles/material.css";
import "@syncfusion/ej2-inputs/styles/material.css";
import "@syncfusion/ej2-lists/styles/material.css";
import "@syncfusion/ej2-navigations/styles/material.css";
import "@syncfusion/ej2-popups/styles/material.css";
import "@syncfusion/ej2-splitbuttons/styles/material.css";
import "@syncfusion/ej2-react-schedule/styles/material.css";
import type { Strategy, Project, Action, Holiday } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Calendar as CalendarIcon } from "lucide-react";

interface ScheduleEvent {
  Id: string;
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  IsAllDay: boolean;
  CategoryColor: string;
  Description?: string;
  EventType: 'project' | 'action' | 'pto';
  StrategyId?: string;
  ProjectId?: string;
}

interface PtoEntryWithUser {
  id: string;
  userId: string;
  organizationId: string;
  startDate: Date | string;
  endDate: Date | string;
  notes: string | null;
  createdAt: Date | string | null;
  userName: string;
}

export default function Calendar() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [licenseRegistered, setLicenseRegistered] = useState(false);
  const scheduleRef = useRef<ScheduleComponent>(null);

  useEffect(() => {
    const loadLicense = async () => {
      try {
        const response = await fetch('/api/config/syncfusion');
        if (response.ok) {
          const { licenseKey } = await response.json();
          if (licenseKey) {
            registerLicense(licenseKey);
            setLicenseRegistered(true);
          } else {
            toast({
              title: "License Issue",
              description: "Syncfusion license key not configured",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Failed to load Syncfusion license:', error);
      }
    };
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

  const { data: ptoEntries, isLoading: ptoLoading } = useQuery<PtoEntryWithUser[]>({
    queryKey: ["/api/pto"],
  });

  const { data: holidays, isLoading: holidaysLoading } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });

  const filteredStrategies = useMemo(() => {
    if (!strategies) return [];
    return strategies.filter(s => s.status !== 'Archived');
  }, [strategies]);

  const strategyMap = useMemo(() => {
    return new Map(filteredStrategies.map(s => [s.id, s]));
  }, [filteredStrategies]);

  const filteredStrategyIds = useMemo(() => 
    new Set(filteredStrategies.map(s => s.id)), 
    [filteredStrategies]
  );

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => filteredStrategyIds.has(p.strategyId));
  }, [projects, filteredStrategyIds]);

  const projectMap = useMemo(() => {
    return new Map(filteredProjects.map(p => [p.id, p]));
  }, [filteredProjects]);

  const filteredActions = useMemo(() => {
    if (!actions) return [];
    const projectIds = new Set(filteredProjects.map(p => p.id));
    return actions.filter(a => a.projectId && projectIds.has(a.projectId));
  }, [actions, filteredProjects]);

  const scheduleData: ScheduleEvent[] = useMemo(() => {
    const events: ScheduleEvent[] = [];

    const parseAsUTCDate = (dateInput: Date | string): Date => {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
      return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    };

    filteredProjects.forEach(project => {
      if (!project.dueDate) return;
      
      const strategy = strategyMap.get(project.strategyId);
      const dueDate = parseAsUTCDate(project.dueDate);
      const startDate = project.startDate ? parseAsUTCDate(project.startDate) : new Date(dueDate);
      startDate.setDate(startDate.getDate());
      
      events.push({
        Id: `project-${project.id}`,
        Subject: `📁 ${project.title}`,
        StartTime: startDate,
        EndTime: dueDate,
        IsAllDay: true,
        CategoryColor: strategy?.colorCode || '#3b82f6',
        Description: `Project: ${project.title}\nStrategy: ${strategy?.title || 'Unknown'}`,
        EventType: 'project',
        StrategyId: project.strategyId,
        ProjectId: project.id,
      });
    });

    filteredActions.forEach(action => {
      if (!action.dueDate) return;
      
      const project = projectMap.get(action.projectId || '');
      const strategy = project ? strategyMap.get(project.strategyId) : undefined;
      const dueDate = parseAsUTCDate(action.dueDate);
      
      events.push({
        Id: `action-${action.id}`,
        Subject: `✓ ${action.title}`,
        StartTime: dueDate,
        EndTime: dueDate,
        IsAllDay: true,
        CategoryColor: strategy?.colorCode ? `${strategy.colorCode}99` : '#6b7280',
        Description: `Action: ${action.title}\nProject: ${project?.title || 'Unknown'}\nStatus: ${action.status}`,
        EventType: 'action',
        StrategyId: project?.strategyId,
        ProjectId: action.projectId || undefined,
      });
    });

    // Add PTO entries
    ptoEntries?.forEach(pto => {
      const startDate = parseAsUTCDate(pto.startDate);
      const endDate = parseAsUTCDate(pto.endDate);
      endDate.setDate(endDate.getDate() + 1); // Add 1 day for inclusive end date display
      
      events.push({
        Id: `pto-${pto.id}`,
        Subject: `🏖️ ${pto.userName} - Time Off`,
        StartTime: startDate,
        EndTime: endDate,
        IsAllDay: true,
        CategoryColor: '#10b981', // Green color for PTO
        Description: `${pto.userName} - Time Off${pto.notes ? `\n${pto.notes}` : ''}`,
        EventType: 'pto',
      });
    });

    return events;
  }, [filteredProjects, filteredActions, strategyMap, projectMap, ptoEntries]);

  const eventSettings: EventSettingsModel = {
    dataSource: scheduleData,
    fields: {
      id: 'Id',
      subject: { name: 'Subject' },
      startTime: { name: 'StartTime' },
      endTime: { name: 'EndTime' },
      isAllDay: { name: 'IsAllDay' },
      description: { name: 'Description' },
    }
  };

  const handleEventClick = (args: any) => {
    if (args.event) {
      const eventId = args.event.Id as string;
      const parts = eventId.split('-');
      const type = parts[0];
      const id = parts.slice(1).join('-');

      if (type === 'project') {
        setLocation(`/strategies?highlight=project-${id}`);
      } else if (type === 'action') {
        const projectId = args.event.ProjectId;
        setLocation(`/strategies?highlight=action-${id}&project=${projectId}`);
      }
    }
  };

  const isLoading = strategiesLoading || projectsLoading || actionsLoading || ptoLoading || holidaysLoading;

  // Get set of dates that have PTO entries for visual indicator
  const ptoDates = useMemo(() => {
    const dates = new Set<string>();
    ptoEntries?.forEach(pto => {
      const start = new Date(pto.startDate);
      const end = new Date(pto.endDate);
      // Add all dates in the range (inclusive)
      const current = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
      const endDate = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
      while (current <= endDate) {
        dates.add(`${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`);
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  }, [ptoEntries]);

  // Get set of dates that have holidays for visual indicator (using local date keys)
  const holidayDates = useMemo(() => {
    const dates = new Map<string, string>();
    holidays?.forEach(holiday => {
      const date = new Date(holiday.date);
      // Use UTC values to construct a local midnight date to avoid timezone shifts
      const localDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const dateKey = `${localDate.getFullYear()}-${localDate.getMonth()}-${localDate.getDate()}`;
      dates.set(dateKey, holiday.name);
    });
    return dates;
  }, [holidays]);

  // Helper to check if a date is a holiday or has PTO (using local date keys consistently)
  const getDateIndicators = (cellDate: Date) => {
    const dateKey = `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`;
    const holidayName = holidayDates.get(dateKey);
    const hasPto = ptoDates.has(dateKey);
    return { holidayName, hasPto, dateKey };
  };

  // Agenda view date template to show holiday/PTO indicators
  const agendaDateTemplate = (props: { date: Date }) => {
    const cellDate = props.date;
    const { holidayName, hasPto } = getDateIndicators(cellDate);
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    const dayOfWeek = cellDate.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = cellDate.getDate();
    const month = cellDate.toLocaleDateString('en-US', { month: 'short' });
    
    return (
      <div 
        className="flex flex-col items-center justify-center h-full w-full p-2"
        style={{ 
          backgroundColor: holidayName ? (isDarkMode ? '#14532d' : '#dcfce7') : 'transparent',
          minWidth: '60px'
        }}
        title={holidayName || ''}
      >
        <div className="text-xs text-gray-500 dark:text-gray-400">{dayOfWeek}</div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-1">
          {dayNum}
          {hasPto && <span title="Team member time off">🏖️</span>}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{month}</div>
      </div>
    );
  };

  // Render cell handler to add PTO icons and Holiday green background
  const handleRenderCell = (args: any) => {
    const cellTypes = ['dateHeader', 'monthCells', 'workCells', 'allDayCells'];
    
    if (cellTypes.includes(args.elementType)) {
      const cellDate = args.date as Date;
      if (cellDate) {
        // Reset background color first (Syncfusion reuses DOM nodes)
        args.element.style.backgroundColor = '';
        args.element.title = '';
        
        // Remove any existing PTO indicators
        const existingPtoIcon = args.element.querySelector('[data-pto-indicator]');
        if (existingPtoIcon) {
          existingPtoIcon.remove();
        }
        
        const { holidayName, hasPto } = getDateIndicators(cellDate);
        const isDarkMode = document.documentElement.classList.contains('dark');
        
        // Add Holiday indicator - green background on the cell
        if (holidayName) {
          args.element.style.backgroundColor = isDarkMode ? '#14532d' : '#dcfce7';
          args.element.title = holidayName;
        }
        
        // Add PTO indicator (beach umbrella icon) for month view date headers
        if (hasPto && (args.elementType === 'monthCells' || args.elementType === 'dateHeader')) {
          const existingContent = args.element.querySelector('.e-date-header, .e-day');
          if (existingContent) {
            const ptoIcon = document.createElement('span');
            ptoIcon.innerHTML = ' 🏖️';
            ptoIcon.title = 'Team member time off';
            ptoIcon.style.marginLeft = '2px';
            ptoIcon.style.fontSize = '12px';
            ptoIcon.setAttribute('data-pto-indicator', 'true');
            existingContent.appendChild(ptoIcon);
          }
        }
      }
    }
    
    // Handle view header for Day/Week/WorkWeek views (the date header row)
    if (args.elementType === 'majorSlot' || args.elementType === 'minorSlot') {
      // Time slots in day/week views - apply holiday background
      const cellDate = args.date as Date;
      if (cellDate) {
        args.element.style.backgroundColor = '';
        const { holidayName } = getDateIndicators(cellDate);
        if (holidayName) {
          const isDarkMode = document.documentElement.classList.contains('dark');
          args.element.style.backgroundColor = isDarkMode ? '#14532d' : '#dcfce7';
        }
      }
    }
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#FF9500' }}
              >
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#1D1D1F' }}>Calendar</h1>
                <p className="text-sm" style={{ color: '#86868B' }}>View projects and actions by due date</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm" style={{ color: '#86868B' }} data-testid="calendar-legend">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-lg" style={{ backgroundColor: '#34C759' }}></div>
                <span>Holiday</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🏖️</span>
                <span>Paid Time Off</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading calendar...</div>
            </div>
          ) : !licenseRegistered ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading Syncfusion license...</div>
            </div>
          ) : (
            <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <style>{`
                .e-schedule .e-schedule-toolbar .e-toolbar-items {
                  background-color: #f9fafb;
                }
                .dark .e-schedule .e-schedule-toolbar .e-toolbar-items {
                  background-color: #1f2937;
                }
                .dark .e-schedule {
                  background-color: #111827;
                }
                .dark .e-schedule .e-month-view .e-work-cells,
                .dark .e-schedule .e-month-view .e-date-header-wrap table {
                  background-color: #111827;
                }
                .dark .e-schedule .e-header-cells,
                .dark .e-schedule .e-month-view .e-date-header {
                  background-color: #1f2937;
                  color: #e5e7eb;
                }
                .dark .e-schedule .e-month-view .e-work-cells {
                  border-color: #374151;
                }
                .dark .e-schedule .e-appointment {
                  border-radius: 4px;
                }
                .e-schedule .e-appointment {
                  border-radius: 4px;
                  font-size: 11px;
                }
                .dark .e-schedule .e-date-header-wrap {
                  background-color: #1f2937;
                }
                .dark .e-schedule .e-content-wrap {
                  background-color: #111827;
                }
              `}</style>
              <ScheduleComponent
                ref={scheduleRef}
                height="100%"
                width="100%"
                selectedDate={new Date()}
                eventSettings={eventSettings}
                currentView="Month"
                readonly={true}
                showQuickInfo={true}
                eventClick={handleEventClick}
                renderCell={handleRenderCell}
                popupOpen={(args: any) => {
                  if (args.type === 'QuickInfo') {
                    args.cancel = false;
                  }
                  if (args.type === 'Editor') {
                    args.cancel = true;
                  }
                }}
              >
                <ViewsDirective>
                  <ViewDirective option="Day" />
                  <ViewDirective option="Week" />
                  <ViewDirective option="WorkWeek" />
                  <ViewDirective option="Month" />
                  <ViewDirective option="Agenda" dateHeaderTemplate={agendaDateTemplate} />
                </ViewsDirective>
                <Inject services={[Day, Week, WorkWeek, Month, Agenda]} />
              </ScheduleComponent>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
