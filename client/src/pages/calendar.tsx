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
import type { Strategy, Project, Action } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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

  const isLoading = strategiesLoading || projectsLoading || actionsLoading || ptoLoading;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Calendar</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">View projects and actions by due date</p>
            </div>
          </div>
        </div>

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
                  <ViewDirective option="Agenda" />
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
