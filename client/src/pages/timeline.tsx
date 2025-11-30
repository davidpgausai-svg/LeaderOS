import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { useMemo, useRef, useEffect, useState } from "react";
import { format, min, max, differenceInDays, eachMonthOfInterval, startOfMonth, endOfMonth, addDays, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Strategy, Project, Action } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, LayoutList, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

type ViewMode = "timeline" | "calendar";

type CalendarItem = {
  id: number;
  title: string;
  type: "project" | "action";
  date: Date;
  status: string;
  strategyId: number;
  strategyTitle: string;
  strategyColor: string;
  projectTitle?: string;
};

export default function Timeline() {
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("all");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedDayItems, setSelectedDayItems] = useState<CalendarItem[]>([]);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
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
        actionMarkers: strategyActions.map(action => {
          const parentProject = strategyProjects.find(p => p.id === action.projectId);
          return {
            id: action.id,
            title: action.title,
            date: new Date(action.dueDate!),
            status: action.status,
            projectName: parentProject?.title || 'Unknown Project',
          };
        }),
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

  // Function to scroll timeline to center on today
  const scrollToToday = () => {
    if (timelineContainerRef.current && !todayInfo.isOutsideRange && timelineData.frameworks.length > 0) {
      const container = timelineContainerRef.current;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const scrollPosition = (scrollWidth * todayInfo.position / 100) - (clientWidth / 2);
      container.scrollLeft = Math.max(0, scrollPosition);
    }
  };

  // Auto-scroll to center on today when timeline loads
  useEffect(() => {
    scrollToToday();
  }, [todayInfo.position, todayInfo.isOutsideRange, timelineData.frameworks.length]);

  // Calendar data processing
  const calendarItems = useMemo(() => {
    if (!strategies || !projects || !actions) return [];

    const items: CalendarItem[] = [];

    strategies.forEach(strategy => {
      if (selectedStrategyId !== "all" && String(strategy.id) !== selectedStrategyId) return;
      if (strategy.status === "Archived") return;

      const strategyProjects = projects.filter(p => p.strategyId === strategy.id);
      
      strategyProjects.forEach(project => {
        items.push({
          id: Number(project.id),
          title: project.title,
          type: "project",
          date: new Date(project.dueDate),
          status: project.status,
          strategyId: Number(strategy.id),
          strategyTitle: strategy.title,
          strategyColor: strategy.colorCode,
        });
      });

      const strategyActions = actions.filter(a => a.strategyId === strategy.id && a.dueDate);
      strategyActions.forEach(action => {
        const parentProject = strategyProjects.find(p => p.id === action.projectId);
        items.push({
          id: Number(action.id),
          title: action.title,
          type: "action",
          date: new Date(action.dueDate!),
          status: action.status,
          strategyId: Number(strategy.id),
          strategyTitle: strategy.title,
          strategyColor: strategy.colorCode,
          projectTitle: parentProject?.title,
        });
      });
    });

    return items;
  }, [strategies, projects, actions, selectedStrategyId]);

  // Calendar grid data
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const firstDayOfWeek = monthStart.getDay();
    const paddingDays = Array(firstDayOfWeek).fill(null);
    
    return [...paddingDays, ...days];
  }, [calendarMonth]);

  const getItemsForDay = (day: Date | null) => {
    if (!day) return [];
    return calendarItems.filter(item => isSameDay(item.date, day));
  };

  const handleDayClick = (day: Date, items: CalendarItem[]) => {
    if (items.length > 0) {
      setSelectedDate(day);
      setSelectedDayItems(items);
      setShowDayDialog(true);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCalendarMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getStatusBadgeColor = (status: string, type: "project" | "action") => {
    if (type === "project") {
      switch (status) {
        case "C": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
        case "OT": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
        case "OH": return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
        case "B": return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
        default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      }
    } else {
      switch (status) {
        case "achieved": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
        case "in_progress": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
        default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      }
    }
  };

  const exportCalendarToPDF = async () => {
    toast({ title: "Generating PDF...", description: "Please wait while we prepare your calendar." });
    
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(format(calendarMonth, "MMMM yyyy"), pageWidth / 2, margin, { align: "center" });
      
      if (selectedStrategyId !== "all") {
        const selectedStrategy = strategies?.find(s => String(s.id) === selectedStrategyId);
        if (selectedStrategy) {
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "normal");
          pdf.text(`Strategy: ${selectedStrategy.title}`, pageWidth / 2, margin + 8, { align: "center" });
        }
      }
      
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const cellWidth = (pageWidth - margin * 2) / 7;
      const headerHeight = 8;
      const startY = margin + 18;
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      dayNames.forEach((day, idx) => {
        pdf.text(day, margin + idx * cellWidth + cellWidth / 2, startY, { align: "center" });
      });
      
      const cellHeight = (pageHeight - startY - margin - headerHeight) / Math.ceil(calendarDays.length / 7);
      let currentY = startY + headerHeight;
      
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      
      calendarDays.forEach((day, idx) => {
        const col = idx % 7;
        const row = Math.floor(idx / 7);
        const x = margin + col * cellWidth;
        const y = startY + headerHeight + row * cellHeight;
        
        pdf.setDrawColor(200);
        pdf.rect(x, y, cellWidth, cellHeight);
        
        if (day) {
          const today = new Date();
          const isCurrentDay = isSameDay(day, today);
          const isPast = isBefore(startOfDay(day), startOfDay(today));
          
          if (isCurrentDay) {
            pdf.setFillColor(239, 68, 68);
            pdf.circle(x + 6, y + 4, 3, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.text(format(day, "d"), x + 6, y + 5.5, { align: "center" });
            pdf.setTextColor(0, 0, 0);
          } else {
            pdf.setTextColor(isPast ? 150 : 0);
            pdf.text(format(day, "d"), x + 3, y + 5);
            pdf.setTextColor(0, 0, 0);
          }
          
          const items = getItemsForDay(day);
          let itemY = y + 10;
          const maxItems = Math.floor((cellHeight - 12) / 4);
          
          items.slice(0, maxItems).forEach(item => {
            const isOverdue = isPast && item.status !== "achieved" && item.status !== "C";
            pdf.setFontSize(6);
            const typeLabel = item.type === "project" ? "[P]" : "[A]";
            const text = `${typeLabel} ${item.title}`.substring(0, 25);
            pdf.setTextColor(isOverdue ? 239 : 60, isOverdue ? 68 : 60, isOverdue ? 68 : 60);
            pdf.text(text, x + 2, itemY);
            pdf.setTextColor(0, 0, 0);
            itemY += 4;
          });
          
          if (items.length > maxItems) {
            pdf.setFontSize(6);
            pdf.setTextColor(100);
            pdf.text(`+${items.length - maxItems} more`, x + 2, itemY);
            pdf.setTextColor(0, 0, 0);
          }
        }
      });
      
      const legendY = pageHeight - 8;
      pdf.setFontSize(7);
      pdf.setTextColor(100);
      pdf.text("[P] = Project Due   [A] = Action Due   Red text = Overdue", margin, legendY);
      pdf.text(`Generated: ${format(new Date(), "MMM dd, yyyy")}`, pageWidth - margin, legendY, { align: "right" });
      
      const fileName = `calendar-${format(calendarMonth, "yyyy-MM")}${selectedStrategyId !== "all" ? `-strategy-${selectedStrategyId}` : ""}.pdf`;
      pdf.save(fileName);
      
      toast({ title: "PDF Downloaded", description: "Your calendar has been exported successfully." });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ title: "Export Failed", description: "There was an error generating the PDF.", variant: "destructive" });
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

  return (
    <div className="min-h-screen flex bg-white dark:bg-black">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {viewMode === "timeline" ? "Timeline" : "Calendar"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {viewMode === "timeline" 
                  ? "Strategic roadmap showing all strategies, projects, and actions"
                  : "Monthly view of project and action due dates"
                }
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Strategy Filter (Calendar view only) */}
              {viewMode === "calendar" && (
                <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                  <SelectTrigger className="w-[200px]" data-testid="select-strategy-filter">
                    <SelectValue placeholder="Filter by Strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Strategies</SelectItem>
                    {strategies?.filter(s => s.status !== "Archived").map(strategy => (
                      <SelectItem key={strategy.id} value={strategy.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                          {strategy.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  variant={viewMode === "timeline" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setViewMode("timeline");
                    setSelectedStrategyId("all");
                    setTimeout(() => scrollToToday(), 100);
                  }}
                  className="gap-2"
                  data-testid="button-view-timeline"
                >
                  <LayoutList className="w-4 h-4" />
                  Timeline
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                  className="gap-2"
                  data-testid="button-view-calendar"
                >
                  <Calendar className="w-4 h-4" />
                  Calendar
                </Button>
              </div>
              
              {/* PDF Export (Calendar only) */}
              {viewMode === "calendar" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportCalendarToPDF}
                  className="gap-2"
                  data-testid="button-export-calendar-pdf"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 overflow-visible">
          {viewMode === "calendar" ? (
            /* Calendar View */
            <div className="space-y-6" ref={calendarRef}>
              {/* Month Navigation */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  data-testid="button-calendar-prev"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {format(calendarMonth, "MMMM yyyy")}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  data-testid="button-calendar-next"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {/* Day Headers */}
                <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, idx) => {
                    const items = getItemsForDay(day);
                    const today = new Date();
                    const isCurrentDay = day && isToday(day);
                    const isPastDay = day && isBefore(startOfDay(day), startOfDay(today));
                    const hasOverdue = items.some(item => 
                      isPastDay && item.status !== "achieved" && item.status !== "C"
                    );

                    return (
                      <div
                        key={idx}
                        className={`min-h-[120px] p-2 border-b border-r border-gray-200 dark:border-gray-700 
                          ${!day ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'}
                          ${isCurrentDay ? 'bg-blue-50 dark:bg-blue-950' : ''}
                          ${items.length > 0 ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
                        `}
                        onClick={() => day && handleDayClick(day, items)}
                        data-testid={day ? `calendar-day-${format(day, 'yyyy-MM-dd')}` : undefined}
                      >
                        {day && (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-medium 
                                ${isCurrentDay 
                                  ? 'bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center' 
                                  : isPastDay 
                                    ? 'text-gray-400 dark:text-gray-500' 
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {format(day, "d")}
                              </span>
                              {hasOverdue && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              {items.slice(0, 3).map(item => (
                                <div
                                  key={`${item.type}-${item.id}`}
                                  className="flex items-center gap-1 text-xs truncate"
                                  style={{ color: item.strategyColor }}
                                >
                                  <div 
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: item.strategyColor }}
                                  />
                                  <span className={`truncate ${
                                    isPastDay && item.status !== "achieved" && item.status !== "C"
                                      ? 'text-red-600 dark:text-red-400 font-medium'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {item.type === "project" ? "[P]" : "[A]"} {item.title}
                                  </span>
                                </div>
                              ))}
                              {items.length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                  +{items.length - 3} more
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 dark:text-gray-300">[P]</span>
                    <span className="text-gray-500 dark:text-gray-400">Project Due Date</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 dark:text-gray-300">[A]</span>
                    <span className="text-gray-500 dark:text-gray-400">Action Due Date</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-[10px] px-1 py-0">Overdue</Badge>
                    <span className="text-gray-500 dark:text-gray-400">Past due items</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-medium">
                      {format(new Date(), "d")}
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">Today</span>
                  </div>
                </div>
              </div>
            </div>
          ) : timelineData.frameworks.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No timeline data</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Create strategies and projects to see them on the timeline
              </p>
            </div>
          ) : (
            /* Timeline View */
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
                                className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 group hover:z-[100]"
                                style={{ left: `${actionPixels}px` }}
                              >
                                <div
                                  className="w-0.5 h-6 cursor-pointer hover:h-8 transition-all shadow-sm"
                                  style={{
                                    backgroundColor: framework.colorCode,
                                  }}
                                />
                                
                                {/* Action Tooltip */}
                                <div className={`absolute ${frameworkIndex === 0 ? 'top-10' : 'bottom-10'} left-1/2 transform -translate-x-1/2 hidden group-hover:block z-[100] w-56`}>
                                  <div
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 p-3"
                                    style={{ borderColor: framework.colorCode }}
                                  >
                                    <div className="flex items-center flex-wrap gap-1 mb-2">
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
                                    {/* Project Name Pill */}
                                    <div 
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white mb-2 max-w-full"
                                      style={{ backgroundColor: framework.colorCode }}
                                    >
                                      <span className="truncate">{action.projectName}</span>
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
                            {/* Sort milestones by proximity to today - closest projects appear at top */}
                            {[...framework.milestones].sort((a, b) => {
                              const today = new Date();
                              // Calculate distance from today for each project
                              const getDistanceFromToday = (m: typeof a) => {
                                if (today >= m.startDate && today <= m.endDate) {
                                  return 0; // Today is within the project range
                                } else if (today < m.startDate) {
                                  return differenceInDays(m.startDate, today); // Project is in the future
                                } else {
                                  return differenceInDays(today, m.endDate); // Project is in the past
                                }
                              };
                              return getDistanceFromToday(a) - getDistanceFromToday(b);
                            }).map((milestone, milestoneIndex) => {
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

        {/* Day Details Dialog */}
        <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedDayItems.map(item => {
                const today = new Date();
                const isPast = selectedDate && isBefore(startOfDay(selectedDate), startOfDay(today));
                const isOverdue = isPast && item.status !== "achieved" && item.status !== "C";
                
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={`p-3 rounded-lg border-l-4 ${isOverdue ? 'bg-red-50 dark:bg-red-950' : 'bg-gray-50 dark:bg-gray-800'}`}
                    style={{ borderLeftColor: item.strategyColor }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={item.type === "project" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"}>
                        {item.type === "project" ? "Project" : "Action"}
                      </Badge>
                      <Badge className={getStatusBadgeColor(item.status, item.type)}>
                        {item.status}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {item.title}
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.strategyColor }}
                        />
                        {item.strategyTitle}
                      </div>
                      {item.projectTitle && (
                        <div className="mt-1 text-xs">
                          Project: {item.projectTitle}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
