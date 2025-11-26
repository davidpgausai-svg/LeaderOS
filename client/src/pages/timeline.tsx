import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { useMemo, useRef, useEffect } from "react";
import { format, min, max, differenceInDays, eachMonthOfInterval, startOfMonth, endOfMonth, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Strategy, Project, Action } from "@shared/schema";

export default function Timeline() {
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  
  const { data: strategies, isLoading: strategiesLoading } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: actions, isLoading: actionsLoading } = useQuery<Action[]>({
    queryKey: ["/api/actions"],
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const timelineData = useMemo(() => {
    if (!strategies || !projects || !actions) {
      return { 
        frameworks: [], 
        minDate: new Date(), 
        maxDate: new Date(), 
        totalDays: 1,
        months: []
      };
    }

    // Calculate overall date range
    const allDates: Date[] = [];
    strategies.forEach(s => {
      allDates.push(new Date(s.startDate), new Date(s.targetDate));
    });
    projects.forEach(t => {
      allDates.push(new Date(t.startDate), new Date(t.dueDate));
    });
    actions.forEach(a => {
      if (a.dueDate) {
        allDates.push(new Date(a.dueDate));
      }
    });

    const minDate = allDates.length > 0 ? min(allDates) : new Date();
    const maxDate = allDates.length > 0 ? max(allDates) : new Date();
    // Use inclusive day count: add 1 to include both start and end days
    const totalDays = differenceInDays(maxDate, minDate) + 1;

    // Generate month markers
    const months = eachMonthOfInterval({ start: minDate, end: maxDate });

    // Group projects and actions by strategy
    const frameworks = strategies.map(strategy => {
      const strategyProjects = projects.filter(t => t.strategyId === strategy.id);
      const strategyActions = actions.filter(a => a.strategyId === strategy.id && a.dueDate);
      
      return {
        id: strategy.id,
        title: strategy.title,
        colorCode: strategy.colorCode,
        startDate: new Date(strategy.startDate),
        targetDate: new Date(strategy.targetDate),
        completionDate: strategy.completionDate ? new Date(strategy.completionDate) : null,
        status: strategy.status,
        milestones: strategyProjects.map(project => ({
          id: project.id,
          title: project.title,
          startDate: new Date(project.startDate),
          endDate: new Date(project.dueDate),
          status: project.status,
        })),
        actionMarkers: strategyActions.map(action => ({
          id: action.id,
          title: action.title,
          date: new Date(action.dueDate!),
          status: action.status,
        })),
      };
    });

    return { frameworks, minDate, maxDate, totalDays, months };
  }, [strategies, projects, actions]);

  // Use pixels-per-day for consistent positioning
  const PIXELS_PER_DAY = 10;
  // totalDays is already inclusive, so use it directly
  const totalPixelWidth = timelineData.totalDays * PIXELS_PER_DAY;

  const getPositionPixels = (date: Date) => {
    const daysSinceStart = differenceInDays(date, timelineData.minDate);
    return daysSinceStart * PIXELS_PER_DAY;
  };

  const getPositionPercentage = (date: Date) => {
    const daysSinceStart = differenceInDays(date, timelineData.minDate);
    return Math.min(Math.max((daysSinceStart / timelineData.totalDays) * 100, 0), 100);
  };

  // Calculate month header positions and widths in pixels based on actual days
  const monthHeaders = useMemo(() => {
    return timelineData.months.map((month, index) => {
      const monthStart = startOfMonth(month);
      // Use the start of next month as the end boundary
      const monthEnd = index < timelineData.months.length - 1 
        ? startOfMonth(timelineData.months[index + 1])
        : addDays(endOfMonth(month), 1); // For last month, add 1 day to include the full month
      
      // Clamp the month to the timeline range (inclusive)
      const clampedStart = monthStart < timelineData.minDate ? timelineData.minDate : monthStart;
      const clampedEnd = monthEnd > addDays(timelineData.maxDate, 1) ? addDays(timelineData.maxDate, 1) : monthEnd;
      
      // Calculate position and width in pixels
      const leftPosition = getPositionPixels(clampedStart);
      const rightPosition = getPositionPixels(clampedEnd);
      const width = rightPosition - leftPosition;
      
      return {
        date: month,
        leftPosition,
        width,
      };
    });
  }, [timelineData]);

  // Calculate today's position based on user's timezone
  const todayInfo = useMemo(() => {
    const userTimezone = (currentUser as any)?.timezone || 'America/Chicago';
    const now = new Date();
    const todayInTimezone = toZonedTime(now, userTimezone);
    
    if (!timelineData.minDate || !timelineData.maxDate) {
      return { position: 50, isOutsideRange: false, isBeforeStart: false, isAfterEnd: false, date: todayInTimezone };
    }

    const isBeforeStart = todayInTimezone < timelineData.minDate;
    const isAfterEnd = todayInTimezone > timelineData.maxDate;
    const isOutsideRange = isBeforeStart || isAfterEnd;
    
    let position = 50;
    if (isBeforeStart) {
      position = 0;
    } else if (isAfterEnd) {
      position = 100;
    } else {
      position = getPositionPercentage(todayInTimezone);
    }
    
    return { position, isOutsideRange, isBeforeStart, isAfterEnd, date: todayInTimezone };
  }, [currentUser, timelineData]);

  // Auto-scroll to center on today when timeline loads
  useEffect(() => {
    if (timelineContainerRef.current && !todayInfo.isOutsideRange && timelineData.frameworks.length > 0) {
      const container = timelineContainerRef.current;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const scrollPosition = (scrollWidth * todayInfo.position / 100) - (clientWidth / 2);
      container.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [todayInfo.position, todayInfo.isOutsideRange, timelineData.frameworks.length]);

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

  return (
    <div className="min-h-screen flex bg-white dark:bg-black">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Timeline</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Strategic roadmap showing all strategies, projects, and actions
            </p>
          </div>
        </header>

        {/* Timeline Content */}
        <div className="p-6 overflow-visible">
          {timelineData.frameworks.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No timeline data</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Create strategies and projects to see them on the timeline
              </p>
            </div>
          ) : (
            <div className="space-y-6 overflow-visible">
              {/* Date Range Summary */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Timeline Range: </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {format(timelineData.minDate, 'MMM dd, yyyy')} - {format(timelineData.maxDate, 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Duration: </span>
                    <span className="text-gray-600 dark:text-gray-400">{timelineData.totalDays} days</span>
                  </div>
                </div>
              </div>

              {/* Timeline Grid with synchronized horizontal scroll */}
              <div ref={timelineContainerRef} className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto" style={{ overflowY: 'visible' }}>
                <div className="inline-block min-w-full">
                  {/* Month Headers */}
                  <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <div className="w-48 flex-shrink-0 px-4 py-3 border-r border-gray-200 dark:border-gray-800 sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Strategy</span>
                    </div>
                    <div className="flex-shrink-0 relative pt-7" style={{ width: `${totalPixelWidth}px` }}>
                      {/* Today Date Pill - positioned inside header with padding */}
                      {!todayInfo.isOutsideRange && (
                        <div 
                          className="absolute top-1 pointer-events-none z-20"
                          style={{
                            left: `${getPositionPixels(todayInfo.date)}px`,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          <div className="px-2 py-0.5 bg-red-500 dark:bg-orange-400 text-white text-xs font-medium rounded whitespace-nowrap">
                            {format(todayInfo.date, 'MMM dd, yyyy')}
                          </div>
                        </div>
                      )}
                      
                      <div className="relative h-full w-full">
                        {monthHeaders.map((header, idx) => (
                          <div
                            key={idx}
                            className="absolute px-2 py-3 text-center border-r border-gray-200 dark:border-gray-800 last:border-r-0 overflow-hidden flex items-center justify-center"
                            style={{ 
                              left: `${header.leftPosition}px`,
                              width: `${header.width}px`,
                              top: 0,
                              bottom: 0,
                            }}
                          >
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {format(header.date, 'MMM yyyy')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Framework Rows (Swimlanes) */}
                  {timelineData.frameworks.map((framework, frameworkIndex) => {
                    const startPos = getPositionPercentage(framework.startDate);
                    const endPos = getPositionPercentage(framework.targetDate);
                    const width = Math.max(endPos - startPos, 2);

                    return (
                      <div
                        key={framework.id}
                        className={`flex overflow-visible ${frameworkIndex % 2 === 0 ? 'bg-white dark:bg-black' : 'bg-gray-50 dark:bg-gray-900'} border-b border-gray-200 dark:border-gray-800 last:border-b-0`}
                        data-testid={`timeline-row-${framework.id}`}
                      >
                        {/* Framework Label */}
                        <div className={`w-48 flex-shrink-0 px-4 py-6 border-r border-gray-200 dark:border-gray-800 sticky left-0 z-10 ${framework.status === 'Archived' ? 'opacity-50' : ''} ${frameworkIndex % 2 === 0 ? 'bg-white dark:bg-black' : 'bg-gray-50 dark:bg-gray-900'}`}>
                        <div className="flex items-start space-x-2">
                          <div
                            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: framework.colorCode }}
                          />
                          <div>
                            <h3 className={`text-sm font-semibold ${framework.status === 'Archived' ? 'text-gray-500 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
                              {framework.title}
                            </h3>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                                framework.status === 'Active'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                  : framework.status === 'Completed'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  : framework.status === 'Archived'
                                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                              }`}
                            >
                              {framework.status}
                            </span>
                            {framework.completionDate && (
                              <div className="text-xs text-gray-500 dark:text-gray-600 mt-1">
                                Completed: {format(framework.completionDate, 'MMM dd, yyyy')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Timeline Bar */}
                      <div className={`flex-shrink-0 relative px-4 overflow-visible ${framework.status === 'Archived' ? 'opacity-50' : ''}`} style={{ width: `${totalPixelWidth}px` }}>
                        {/* Today Line - drawn per row */}
                        {!todayInfo.isOutsideRange && (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-red-500 dark:bg-orange-400 pointer-events-none"
                            style={{
                              left: `${getPositionPixels(todayInfo.date)}px`,
                              zIndex: 1,
                            }}
                          />
                        )}

                        {/* Strategy Section: Duration Bar + Start/End Markers + Action Lines */}
                        <div className="relative h-16 py-2">
                          {/* Framework Duration Bar */}
                          <div
                            className="absolute top-1/2 h-8 rounded-lg transform -translate-y-1/2 flex items-center justify-center shadow-sm"
                            style={{
                              left: `${getPositionPixels(framework.startDate)}px`,
                              width: `${getPositionPixels(framework.targetDate) - getPositionPixels(framework.startDate) + PIXELS_PER_DAY}px`,
                              backgroundColor: framework.colorCode,
                              opacity: framework.status === 'Archived' ? 0.1 : 0.2,
                            }}
                          />

                          {/* Start Marker */}
                          <div
                            className="absolute top-1/2 transform -translate-y-1/2"
                            style={{ left: `${getPositionPixels(framework.startDate)}px` }}
                          >
                            <div className="relative">
                              <div
                                className="w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow"
                                style={{ backgroundColor: framework.colorCode }}
                              />
                              <div className="absolute top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {format(framework.startDate, 'MMM dd')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* End Marker */}
                          <div
                            className="absolute top-1/2 transform -translate-y-1/2"
                            style={{ left: `${getPositionPixels(framework.targetDate)}px` }}
                          >
                            <div className="relative">
                              <div
                                className="w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow"
                                style={{ backgroundColor: framework.colorCode }}
                              />
                              <div className="absolute top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {format(framework.targetDate, 'MMM dd')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Markers (Vertical Lines) */}
                          {framework.actionMarkers.map((action) => {
                            const actionPixels = getPositionPixels(action.date);
                            
                            return (
                              <div
                                key={action.id}
                                className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 group"
                                style={{ left: `${actionPixels}px` }}
                              >
                                <div
                                  className="w-0.5 h-6 cursor-pointer hover:h-8 transition-all shadow-sm"
                                  style={{
                                    backgroundColor: framework.colorCode,
                                  }}
                                />
                                
                                {/* Action Tooltip */}
                                <div className={`absolute ${frameworkIndex === 0 ? 'top-10' : 'bottom-10'} left-1/2 transform -translate-x-1/2 hidden group-hover:block z-50 w-48`}>
                                  <div
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 p-3"
                                    style={{ borderColor: framework.colorCode }}
                                  >
                                    <div className="flex items-center space-x-1 mb-1">
                                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                                        Action
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          action.status === 'achieved'
                                            ? 'bg-green-100 text-green-700'
                                            : action.status === 'in_progress'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-700'
                                        }`}
                                      >
                                        {action.status}
                                      </span>
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                      {action.title}
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      Due: {format(action.date, 'MMM dd, yyyy')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Projects Section: Pills stacked below strategy bar */}
                        {framework.milestones.length > 0 && (
                          <div className="relative pb-2" style={{ minHeight: `${framework.milestones.length * 28 + 8}px` }}>
                            {framework.milestones.map((milestone, milestoneIndex) => {
                              const startPixels = getPositionPixels(milestone.startDate);
                              const endPixels = getPositionPixels(milestone.endDate);
                              const leftPx = Math.min(startPixels, endPixels);
                              const pillWidth = Math.max(Math.abs(endPixels - startPixels) + PIXELS_PER_DAY, 40);
                              
                              return (
                                <div
                                  key={milestone.id}
                                  className="absolute group"
                                  data-testid={`pill-project-${milestone.id}`}
                                  style={{ 
                                    left: `${leftPx}px`,
                                    top: `${milestoneIndex * 28}px`,
                                    width: `${pillWidth}px`,
                                  }}
                                >
                                  {/* Project Pill Bar */}
                                  <div
                                    className="h-6 rounded-full cursor-pointer hover:scale-[1.02] transition-transform shadow-md border-2 border-white/40 dark:border-gray-700/60 flex items-center overflow-hidden"
                                    style={{
                                      backgroundColor: framework.colorCode,
                                    }}
                                  >
                                    <span className="text-[10px] font-semibold text-white truncate px-3 drop-shadow-sm">
                                      {milestone.title}
                                    </span>
                                  </div>
                                  
                                  {/* Tooltip on Hover */}
                                  <div className="absolute top-7 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-50 w-52">
                                    <div
                                      className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 p-3"
                                      style={{ borderColor: framework.colorCode }}
                                    >
                                      <div className="flex items-center space-x-1 mb-1">
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                          Project
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            milestone.status === 'C'
                                              ? 'bg-green-100 text-green-700'
                                              : milestone.status === 'OT'
                                              ? 'bg-yellow-100 text-yellow-700'
                                              : milestone.status === 'OH'
                                              ? 'bg-red-100 text-red-700'
                                              : milestone.status === 'B'
                                              ? 'bg-orange-100 text-orange-700'
                                              : 'bg-gray-100 text-gray-700'
                                          }`}
                                        >
                                          {milestone.status}
                                        </span>
                                      </div>
                                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                        {milestone.title}
                                      </h4>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {format(milestone.startDate, 'MMM dd')} - {format(milestone.endDate, 'MMM dd, yyyy')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Status Codes:</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">C</span>
                        <span className="text-gray-600 dark:text-gray-400">Completed</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">OT</span>
                        <span className="text-gray-600 dark:text-gray-400">On Track</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">OH</span>
                        <span className="text-gray-600 dark:text-gray-400">On Hold</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">B</span>
                        <span className="text-gray-600 dark:text-gray-400">Behind</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">NYS</span>
                        <span className="text-gray-600 dark:text-gray-400">Not Yet Started</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Timeline Elements:</p>
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div>• Small dots = Strategy start/end dates</div>
                      <div>• Horizontal pills = Projects (hover for details)</div>
                      <div>• Vertical lines = Actions (hover for details)</div>
                      <div>• Background bar = Strategy duration</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
