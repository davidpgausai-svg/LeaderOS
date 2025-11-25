import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Target,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  FileDown,
  Calendar,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { format, differenceInDays, isPast, isBefore } from "date-fns";

type Strategy = {
  id: string;
  title: string;
  colorCode: string;
  status: string;
  progress: number;
  startDate: string;
  targetDate: string;
  dueDate: string;
};

type Project = {
  id: string;
  title: string;
  strategyId: string;
  progress: number;
  status: string;
  startDate: string;
  dueDate: string;
  accountableLeaders: string; // JSON array of user IDs
};

type Action = {
  id: string;
  title: string;
  projectId: string;
  strategyId: string;
  status: string;
  targetDate: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState("health");
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: strategies = [], isLoading: strategiesLoading } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: actions = [], isLoading: actionsLoading } = useQuery<Action[]>({
    queryKey: ["/api/actions"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Strategic Report - ${format(new Date(), 'yyyy-MM-dd')}`,
  });

  // Safe date parsing helper
  const safeDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Helper function to determine risk level
  const getRiskLevel = (item: any, type: 'strategy' | 'project' | 'action'): 'on-track' | 'at-risk' | 'critical' | 'blocked' => {
    const today = new Date();
    
    if (type === 'action') {
      if (item.status === 'achieved') return 'on-track';
      if (item.status === 'blocked') return 'blocked';
      const targetDate = safeDate(item.targetDate);
      if (!targetDate) return 'on-track';
      if (isPast(targetDate)) return 'critical';
      const daysUntilDue = differenceInDays(targetDate, today);
      if (daysUntilDue <= 7) return 'at-risk';
      return 'on-track';
    }

    if (type === 'project' || type === 'strategy') {
      const progress = item.progress || 0;
      const dueDateString = type === 'project' ? item.dueDate : item.targetDate;
      const dueDate = safeDate(dueDateString);
      
      if (!dueDate) return 'on-track';
      if (progress >= 100) return 'on-track';
      if (isPast(dueDate)) return 'critical';
      
      const startDate = safeDate(item.startDate);
      if (!startDate) return 'on-track';
      
      const totalDays = differenceInDays(dueDate, startDate);
      const elapsed = differenceInDays(today, startDate);
      const expectedProgress = totalDays > 0 ? (elapsed / totalDays) * 100 : 0;
      
      if (progress < expectedProgress - 20) return 'critical';
      if (progress < expectedProgress - 10) return 'at-risk';
      return 'on-track';
    }

    return 'on-track';
  };

  const getRiskBadge = (riskLevel: string) => {
    const styles = {
      'on-track': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'at-risk': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'critical': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'blocked': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };

    const labels = {
      'on-track': 'On Track',
      'at-risk': 'At Risk',
      'critical': 'Critical',
      'blocked': 'Blocked',
    };

    return (
      <Badge className={styles[riskLevel as keyof typeof styles]}>
        {labels[riskLevel as keyof typeof labels]}
      </Badge>
    );
  };

  // Calculate metrics
  const totalStrategies = strategies.length;
  const activeStrategies = strategies.filter(s => s.status === 'active').length;
  const atRiskStrategies = strategies.filter(s => getRiskLevel(s, 'strategy') === 'at-risk' || getRiskLevel(s, 'strategy') === 'critical').length;

  const totalProjects = projects.length;
  const overdueProjects = projects.filter(t => {
    const dueDate = safeDate(t.dueDate);
    return dueDate && isPast(dueDate) && t.progress < 100;
  }).length;

  const totalActions = actions.length;
  const achievedActions = actions.filter(o => o.status === 'achieved').length;

  if (strategiesLoading || projectsLoading || actionsLoading) {
    return (
      <div className="min-h-screen flex bg-white dark:bg-gray-900">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 print:border-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-reports-header">
                Reports & Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Strategic planning insights and performance tracking
              </p>
            </div>
            <Button 
              onClick={handlePrint} 
              variant="outline"
              className="print:hidden"
              data-testid="button-export-pdf"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export to PDF
            </Button>
          </div>
        </header>

        <div ref={reportRef} className="p-6">
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card data-testid="card-active-strategies">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Active Strategies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-active-strategies">
                  {activeStrategies}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  of {totalStrategies} total
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-at-risk">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
                  At Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600" data-testid="text-at-risk">
                  {atRiskStrategies}
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  strategies need attention
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-overdue-projects">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  Overdue Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600" data-testid="text-overdue-projects">
                  {overdueProjects}
                </div>
                <div className="text-xs text-red-600 mt-1">
                  past due date
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-completion-rate">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Actions Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600" data-testid="text-completion-rate">
                  {totalActions > 0 ? Math.round((achievedActions / totalActions) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {achievedActions} of {totalActions}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Reports */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
            <TabsList className="mb-6">
              <TabsTrigger value="health" data-testid="tab-health">
                <Target className="w-4 h-4 mr-2" />
                Strategy Health
              </TabsTrigger>
              <TabsTrigger value="timeline" data-testid="tab-timeline">
                <Calendar className="w-4 h-4 mr-2" />
                Timeline Risk
              </TabsTrigger>
              <TabsTrigger value="ownership" data-testid="tab-ownership">
                <Users className="w-4 h-4 mr-2" />
                Ownership
              </TabsTrigger>
            </TabsList>

            {/* Strategy Health Overview */}
            <TabsContent value="health" className="space-y-4">
              <StrategyHealthReport
                strategies={strategies}
                projects={projects}
                actions={actions}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
                safeDate={safeDate}
              />
            </TabsContent>

            {/* Timeline Risk Report */}
            <TabsContent value="timeline" className="space-y-4">
              <TimelineRiskReport
                strategies={strategies}
                projects={projects}
                actions={actions}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
                safeDate={safeDate}
              />
            </TabsContent>

            {/* Ownership Report */}
            <TabsContent value="ownership" className="space-y-4">
              <OwnershipReport
                projects={projects}
                actions={actions}
                users={users}
                strategies={strategies}
                safeDate={safeDate}
              />
            </TabsContent>
          </Tabs>

          {/* Print view - show all reports */}
          <div className="hidden print:block space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-4">Strategy Health Overview</h2>
              <StrategyHealthReport
                strategies={strategies}
                projects={projects}
                actions={actions}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
                safeDate={safeDate}
              />
            </div>
            <div className="page-break">
              <h2 className="text-xl font-bold mb-4">Timeline Risk</h2>
              <TimelineRiskReport
                strategies={strategies}
                projects={projects}
                actions={actions}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
                safeDate={safeDate}
              />
            </div>
            <div className="page-break">
              <h2 className="text-xl font-bold mb-4">Resource & Ownership</h2>
              <OwnershipReport
                projects={projects}
                actions={actions}
                users={users}
                strategies={strategies}
                safeDate={safeDate}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Strategy Health Report Component
function StrategyHealthReport({ strategies, projects, actions, getRiskLevel, getRiskBadge, safeDate }: any) {
  const [openStrategies, setOpenStrategies] = useState<Set<string>>(new Set());
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());

  const toggleStrategy = (id: string) => {
    const newSet = new Set(openStrategies);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setOpenStrategies(newSet);
  };

  const toggleProject = (id: string) => {
    const newSet = new Set(openProjects);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setOpenProjects(newSet);
  };

  return (
    <Card data-testid="card-strategy-health">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Hierarchical Strategy View
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Complete hierarchy: Strategies → Projects → Actions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {strategies.map((strategy: any) => {
          const strategyProjects = projects.filter((t: any) => t.strategyId === strategy.id);
          const strategyRisk = getRiskLevel(strategy, 'strategy');
          const isOpen = openStrategies.has(strategy.id);

          return (
            <div key={strategy.id} className="border border-gray-200 dark:border-gray-700 rounded-lg" data-testid={`strategy-${strategy.id}`}>
              <Collapsible open={isOpen} onOpenChange={() => toggleStrategy(strategy.id)}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-3 flex-1">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: strategy.colorCode }}
                      />
                      <div className="text-left flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{strategy.title}</h3>
                        <p className="text-sm text-gray-500">{strategyProjects.length} projects</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right mr-4">
                        <Progress value={strategy.progress || 0} className="w-32 h-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400 mt-1 block">
                          {strategy.progress || 0}%
                        </span>
                      </div>
                      {getRiskBadge(strategyRisk)}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-8 pr-4 pb-4 space-y-2">
                    {strategyProjects.length === 0 ? (
                      <p className="text-sm text-gray-500 italic py-2">No projects defined</p>
                    ) : (
                      strategyProjects.map((project: any) => {
                        const projectActions = actions.filter((o: any) => o.projectId === project.id);
                        const projectRisk = getRiskLevel(project, 'project');
                        const isProjectOpen = openProjects.has(project.id);

                        return (
                          <div key={project.id} className="border-l-2 border-gray-300 dark:border-gray-600 ml-2" data-testid={`project-${project.id}`}>
                            <Collapsible open={isProjectOpen} onOpenChange={() => toggleProject(project.id)}>
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <div className="flex items-center space-x-2 flex-1">
                                    {isProjectOpen ? (
                                      <ChevronDown className="w-3 h-3 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-gray-500" />
                                    )}
                                    <div className="text-left flex-1">
                                      <h4 className="font-medium text-sm text-gray-900 dark:text-white">{project.title}</h4>
                                      <p className="text-xs text-gray-500">{projectActions.length} actions</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <Progress value={project.progress || 0} className="w-24 h-2" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400 w-10">
                                      {project.progress || 0}%
                                    </span>
                                    {getRiskBadge(projectRisk)}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="pl-6 pr-3 pb-2 space-y-1">
                                  {projectActions.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic py-1">No actions defined</p>
                                  ) : (
                                    projectActions.map((action: any) => {
                                      const actionRisk = getRiskLevel(action, 'action');
                                      const targetDate = safeDate(action.targetDate);
                                      const isOverdue = targetDate && isPast(targetDate) && action.status !== 'achieved';

                                      return (
                                        <div
                                          key={action.id}
                                          className="flex items-center justify-between p-2 text-sm"
                                          data-testid={`action-${action.id}`}
                                        >
                                          <div className="flex items-center space-x-2 flex-1">
                                            {action.status === 'achieved' ? (
                                              <CheckCircle className="w-3 h-3 text-green-600" />
                                            ) : (
                                              <Clock className="w-3 h-3 text-gray-400" />
                                            )}
                                            <span className={action.status === 'achieved' ? 'text-gray-500 line-through' : ''}>
                                              {action.title}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            {targetDate && (
                                              <span className="text-xs text-gray-500">
                                                {format(targetDate, 'MMM dd')}
                                              </span>
                                            )}
                                            {isOverdue && (
                                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs">
                                                Overdue
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}
        {strategies.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No strategies to display</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Timeline Risk Report Component
function TimelineRiskReport({ strategies, projects, actions, getRiskLevel, getRiskBadge, safeDate }: any) {
  const overdueProjects = projects.filter((t: any) => {
    const dueDate = safeDate(t.dueDate);
    return dueDate && isPast(dueDate) && t.progress < 100;
  });

  const upcomingProjects = projects.filter((t: any) => {
    const dueDate = safeDate(t.dueDate);
    if (!dueDate) return false;
    const daysUntilDue = differenceInDays(dueDate, new Date());
    return daysUntilDue >= 0 && daysUntilDue <= 30 && t.progress < 100;
  }).sort((a: any, b: any) => {
    const dateA = safeDate(a.dueDate);
    const dateB = safeDate(b.dueDate);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="space-y-6">
      {/* Overdue Projects */}
      <Card data-testid="card-overdue-timeline">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <XCircle className="w-5 h-5 mr-2" />
            Overdue Projects ({overdueProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueProjects.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500">No overdue projects</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueProjects.map((project: any) => {
                const strategy = strategies.find((s: any) => s.id === project.strategyId);
                const dueDate = safeDate(project.dueDate);
                const daysOverdue = dueDate ? differenceInDays(new Date(), dueDate) : 0;

                return (
                  <div
                    key={project.id}
                    className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20"
                    data-testid={`overdue-${project.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {strategy && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                        )}
                        <h4 className="font-semibold text-gray-900 dark:text-white">{project.title}</h4>
                      </div>
                      <Badge className="bg-red-600 text-white">
                        {daysOverdue} days overdue
                      </Badge>
                    </div>
                    {strategy && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Strategy: {strategy.title}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {dueDate && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Due: {format(dueDate, 'MMM dd, yyyy')}
                        </span>
                      )}
                      <div className="flex items-center space-x-2">
                        <Progress value={project.progress || 0} className="w-32 h-2" />
                        <span className="text-sm font-medium">{project.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card data-testid="card-upcoming-timeline">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Upcoming Deadlines (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingProjects.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming deadlines in the next 30 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingProjects.map((project: any) => {
                const strategy = strategies.find((s: any) => s.id === project.strategyId);
                const dueDate = safeDate(project.dueDate);
                const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : 0;
                const projectRisk = getRiskLevel(project, 'project');

                return (
                  <div
                    key={project.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    data-testid={`upcoming-${project.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {strategy && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                        )}
                        <h4 className="font-semibold text-gray-900 dark:text-white">{project.title}</h4>
                      </div>
                      {getRiskBadge(projectRisk)}
                    </div>
                    {strategy && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Strategy: {strategy.title}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {dueDate && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Due in {daysUntilDue} days ({format(dueDate, 'MMM dd, yyyy')})
                        </span>
                      )}
                      <div className="flex items-center space-x-2">
                        <Progress value={project.progress || 0} className="w-32 h-2" />
                        <span className="text-sm font-medium">{project.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Ownership Report Component
function OwnershipReport({ projects, actions, users, strategies, safeDate }: any) {
  const userPerformance = users.map((user: any) => {
    // Parse accountableLeaders JSON and filter projects assigned to this user
    const userProjects = projects.filter((t: any) => {
      try {
        const leaders = JSON.parse(t.accountableLeaders || '[]');
        return leaders.includes(user.id);
      } catch {
        return false;
      }
    });
    
    const completedProjects = userProjects.filter((t: any) => t.progress >= 100).length;
    const inProgressProjects = userProjects.filter((t: any) => t.progress > 0 && t.progress < 100).length;
    const overdueProjects = userProjects.filter((t: any) => {
      const dueDate = safeDate(t.dueDate);
      return dueDate && isPast(dueDate) && t.progress < 100;
    }).length;

    const avgProgress = userProjects.length > 0
      ? Math.round(userProjects.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / userProjects.length)
      : 0;

    return {
      user,
      totalProjects: userProjects.length,
      completedProjects: completedProjects,
      inProgressProjects: inProgressProjects,
      overdueProjects: overdueProjects,
      avgProgress,
      projects: userProjects,
    };
  }).filter((up: any) => up.totalProjects > 0);

  return (
    <div className="space-y-6">
      {userPerformance.map((perf: any) => (
        <Card key={perf.user.id} data-testid={`user-performance-${perf.user.id}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                  {perf.user.firstName[0]}{perf.user.lastName[0]}
                </div>
                <div>
                  <CardTitle>{perf.user.firstName} {perf.user.lastName}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{perf.user.role}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{perf.avgProgress}%</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Progress</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{perf.totalProjects}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Projects</div>
              </div>
              <div className="text-center p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{perf.completedProjects}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
              </div>
              <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{perf.inProgressProjects}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">In Progress</div>
              </div>
              <div className="text-center p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{perf.overdueProjects}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Overdue</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Assigned Projects</h4>
              {perf.projects.map((project: any) => {
                const strategy = strategies.find((s: any) => s.id === project.strategyId);
                const dueDate = safeDate(project.dueDate);
                const isOverdue = dueDate && isPast(dueDate) && project.progress < 100;

                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded"
                    data-testid={`user-project-${project.id}`}
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      {strategy && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: strategy.colorCode }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{project.title}</p>
                        {dueDate && (
                          <p className="text-xs text-gray-500">
                            Due: {format(dueDate, 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Progress value={project.progress || 0} className="w-24 h-2" />
                      <span className="text-sm font-medium w-12">{project.progress || 0}%</span>
                      {isOverdue && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {userPerformance.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No project assignments found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
