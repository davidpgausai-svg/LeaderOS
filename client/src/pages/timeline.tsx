import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { useMemo } from "react";
import { format, min, max, differenceInDays, eachMonthOfInterval } from "date-fns";
import type { Strategy, Tactic } from "@shared/schema";

export default function Timeline() {
  const { data: strategies, isLoading: strategiesLoading } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: tactics, isLoading: tacticsLoading } = useQuery<Tactic[]>({
    queryKey: ["/api/tactics"],
  });

  const timelineData = useMemo(() => {
    if (!strategies || !tactics) {
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
    tactics.forEach(t => {
      allDates.push(new Date(t.dueDate));
    });

    const minDate = allDates.length > 0 ? min(allDates) : new Date();
    const maxDate = allDates.length > 0 ? max(allDates) : new Date();
    const totalDays = differenceInDays(maxDate, minDate) || 1;

    // Generate month markers
    const months = eachMonthOfInterval({ start: minDate, end: maxDate });

    // Group strategies (tactics) by framework (strategy)
    const frameworks = strategies.map(strategy => {
      const strategyTactics = tactics.filter(t => t.strategyId === strategy.id);
      
      return {
        id: strategy.id,
        title: strategy.title,
        colorCode: strategy.colorCode,
        startDate: new Date(strategy.startDate),
        targetDate: new Date(strategy.targetDate),
        completionDate: strategy.completionDate ? new Date(strategy.completionDate) : null,
        status: strategy.status,
        milestones: strategyTactics.map(tactic => ({
          id: tactic.id,
          title: tactic.title,
          date: new Date(tactic.dueDate),
          status: tactic.status,
        })),
      };
    });

    return { frameworks, minDate, maxDate, totalDays, months };
  }, [strategies, tactics]);

  const getPositionPercentage = (date: Date) => {
    const daysSinceStart = differenceInDays(date, timelineData.minDate);
    return Math.min(Math.max((daysSinceStart / timelineData.totalDays) * 100, 0), 100);
  };

  if (strategiesLoading || tacticsLoading) {
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
              Strategic roadmap showing all strategies and projects
            </p>
          </div>
        </header>

        {/* Timeline Content */}
        <div className="p-6">
          {timelineData.frameworks.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No timeline data</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Create strategies and projects to see them on the timeline
              </p>
            </div>
          ) : (
            <div className="space-y-6">
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
              <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto">
                <div className="inline-block min-w-full">
                  {/* Month Headers */}
                  <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <div className="w-48 flex-shrink-0 px-4 py-3 border-r border-gray-200 dark:border-gray-800 sticky left-0 bg-gray-50 dark:bg-gray-900 z-20">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Strategy</span>
                    </div>
                    <div className="flex-shrink-0 relative" style={{ width: `${timelineData.months.length * 100}px` }}>
                      <div className="flex h-full">
                        {timelineData.months.map((month, idx) => (
                          <div
                            key={idx}
                            className="flex-shrink-0 px-2 py-3 text-center border-r border-gray-200 dark:border-gray-800 last:border-r-0"
                            style={{ width: '100px' }}
                          >
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {format(month, 'MMM yyyy')}
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
                        className={`flex ${frameworkIndex % 2 === 0 ? 'bg-white dark:bg-black' : 'bg-gray-50 dark:bg-gray-900'} border-b border-gray-200 dark:border-gray-800 last:border-b-0`}
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
                      <div className={`flex-shrink-0 relative py-6 px-4 min-h-[120px] ${framework.status === 'Archived' ? 'opacity-50' : ''}`} style={{ width: `${timelineData.months.length * 100}px` }}>
                        {/* Framework Duration Bar */}
                        <div
                          className="absolute top-1/2 h-8 rounded-lg transform -translate-y-1/2 flex items-center justify-center shadow-sm"
                          style={{
                            left: `${startPos}%`,
                            width: `${width}%`,
                            backgroundColor: framework.colorCode,
                            opacity: framework.status === 'Archived' ? 0.1 : 0.2,
                          }}
                        />

                        {/* Start and End Markers */}
                        <div
                          className="absolute top-1/2 transform -translate-y-1/2"
                          style={{ left: `${startPos}%` }}
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

                        <div
                          className="absolute top-1/2 transform -translate-y-1/2"
                          style={{ left: `${endPos}%` }}
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

                        {/* Strategy Milestones */}
                        {framework.milestones.map((milestone) => {
                          const milestonePos = getPositionPercentage(milestone.date);
                          
                          return (
                            <div
                              key={milestone.id}
                              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 group"
                              style={{ left: `${milestonePos}%` }}
                            >
                              {/* Milestone Dot */}
                              <div
                                className="w-4 h-4 rounded-full border-3 border-white dark:border-gray-900 shadow-md cursor-pointer hover:scale-125 transition-transform"
                                style={{
                                  backgroundColor: framework.colorCode,
                                  borderWidth: '3px',
                                }}
                              />
                              
                              {/* Tooltip on Hover */}
                              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10 w-48">
                                <div
                                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 p-3"
                                  style={{ borderColor: framework.colorCode }}
                                >
                                  <div className="flex items-center space-x-1 mb-1">
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                      Strategy
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
                                    Due: {format(milestone.date, 'MMM dd, yyyy')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
                      <div>• Small dots = Framework start/end dates</div>
                      <div>• Large dots = Strategy milestones (hover for details)</div>
                      <div>• Colored bars = Framework duration</div>
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
