import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { useMemo } from "react";
import { format, parseISO, min, max, differenceInDays } from "date-fns";
import type { Strategy, Tactic } from "@shared/schema";

type TimelineItem = {
  id: string;
  title: string;
  type: 'strategy' | 'tactic';
  date: Date;
  colorCode: string;
  strategyTitle?: string;
  description?: string;
};

export default function Timeline() {
  const { data: strategies, isLoading: strategiesLoading } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: tactics, isLoading: tacticsLoading } = useQuery<Tactic[]>({
    queryKey: ["/api/tactics"],
  });

  const timelineData = useMemo(() => {
    if (!strategies || !tactics) return { items: [], minDate: new Date(), maxDate: new Date(), totalDays: 0 };

    // Create timeline items from strategies and tactics
    const items: TimelineItem[] = [];

    // Add strategies (using start and target dates as milestones)
    strategies.forEach(strategy => {
      items.push({
        id: `${strategy.id}-start`,
        title: `${strategy.title} - Start`,
        type: 'strategy',
        date: new Date(strategy.startDate),
        colorCode: strategy.colorCode,
        description: strategy.description,
      });
      items.push({
        id: `${strategy.id}-end`,
        title: `${strategy.title} - Target`,
        type: 'strategy',
        date: new Date(strategy.targetDate),
        colorCode: strategy.colorCode,
        description: strategy.description,
      });
    });

    // Add tactics
    tactics.forEach(tactic => {
      const strategy = strategies.find(s => s.id === tactic.strategyId);
      if (strategy) {
        items.push({
          id: tactic.id,
          title: tactic.title,
          type: 'tactic',
          date: new Date(tactic.dueDate),
          colorCode: strategy.colorCode,
          strategyTitle: strategy.title,
          description: tactic.description,
        });
      }
    });

    // Sort by date
    items.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate date range
    const dates = items.map(item => item.date);
    const minDate = dates.length > 0 ? min(dates) : new Date();
    const maxDate = dates.length > 0 ? max(dates) : new Date();
    const totalDays = differenceInDays(maxDate, minDate) || 1;

    return { items, minDate, maxDate, totalDays };
  }, [strategies, tactics]);

  const getPositionPercentage = (date: Date) => {
    const daysSinceStart = differenceInDays(date, timelineData.minDate);
    return (daysSinceStart / timelineData.totalDays) * 100;
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Timeline</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Visual timeline of frameworks, strategies, and tactics
              </p>
            </div>
          </div>
        </header>

        {/* Timeline Content */}
        <div className="p-6">
          {timelineData.items.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No timeline data</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Create frameworks and strategies to see them on the timeline
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Date Range Info */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Start: </span>
                    <span className="text-gray-600 dark:text-gray-400">{format(timelineData.minDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">End: </span>
                    <span className="text-gray-600 dark:text-gray-400">{format(timelineData.maxDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Duration: </span>
                    <span className="text-gray-600 dark:text-gray-400">{timelineData.totalDays} days</span>
                  </div>
                </div>
              </div>

              {/* Timeline Visualization */}
              <div className="relative">
                {/* Timeline Bar */}
                <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  {/* Framework color segments */}
                  {strategies?.map(strategy => {
                    const startPos = getPositionPercentage(new Date(strategy.startDate));
                    const endPos = getPositionPercentage(new Date(strategy.targetDate));
                    const width = Math.max(endPos - startPos, 0.5);
                    
                    return (
                      <div
                        key={strategy.id}
                        className="absolute h-2 rounded-full opacity-30"
                        style={{
                          left: `${startPos}%`,
                          width: `${width}%`,
                          backgroundColor: strategy.colorCode,
                        }}
                        data-testid={`timeline-segment-${strategy.id}`}
                      />
                    );
                  })}
                </div>

                {/* Milestones */}
                <div className="relative pt-8 pb-4">
                  {timelineData.items.map((item, index) => {
                    const position = getPositionPercentage(item.date);
                    const isEven = index % 2 === 0;
                    
                    return (
                      <div
                        key={item.id}
                        className="absolute"
                        style={{ left: `${position}%` }}
                        data-testid={`milestone-${item.id}`}
                      >
                        {/* Vertical line */}
                        <div
                          className="absolute bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"
                          style={{
                            height: isEven ? '60px' : '100px',
                            transform: 'translateX(-50%)',
                          }}
                        />
                        
                        {/* Milestone dot */}
                        <div
                          className="absolute bottom-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900"
                          style={{
                            backgroundColor: item.colorCode,
                            transform: 'translate(-50%, 50%)',
                          }}
                        />
                        
                        {/* Milestone card */}
                        <div
                          className={`absolute ${isEven ? 'top-16' : 'top-28'} left-0 transform -translate-x-1/2 w-48`}
                        >
                          <div
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 p-3 hover:shadow-lg transition-shadow"
                            style={{ borderColor: item.colorCode }}
                          >
                            <div className="flex items-start space-x-2">
                              <div
                                className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                                style={{ backgroundColor: item.colorCode }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-1 mb-1">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      item.type === 'strategy'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    }`}
                                  >
                                    {item.type === 'strategy' ? 'Framework' : 'Strategy'}
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                                  {item.title}
                                </h4>
                                {item.strategyTitle && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {item.strategyTitle}
                                  </p>
                                )}
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {format(item.date, 'MMM dd, yyyy')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-48 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Frameworks</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {strategies?.map(strategy => (
                    <div key={strategy.id} className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: strategy.colorCode }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{strategy.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
