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
  Tag,
  Award,
  Briefcase,
  ListChecks,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type ExecutiveGoal = {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdBy: string;
  createdAt: string;
};

type StrategyExecutiveGoal = {
  id: string;
  strategyId: string;
  executiveGoalId: string;
  organizationId: string;
};

type TeamTag = {
  id: string;
  name: string;
  colorHex: string;
  organizationId: string;
};

type ProjectTeamTag = {
  id: string;
  projectId: string;
  teamTagId: string;
  organizationId: string;
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

  const { data: executiveGoals = [] } = useQuery<ExecutiveGoal[]>({
    queryKey: ["/api/executive-goals"],
  });

  const { data: strategyExecutiveGoalMappings = [] } = useQuery<StrategyExecutiveGoal[]>({
    queryKey: ["/api/strategy-executive-goals"],
  });

  const { data: teamTags = [] } = useQuery<TeamTag[]>({
    queryKey: ["/api/team-tags"],
  });

  const { data: projectTeamTags = [] } = useQuery<ProjectTeamTag[]>({
    queryKey: ["/api/project-team-tags"],
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
  const getRiskLevel = (item: any, type: 'strategy' | 'project' | 'action', strategyProjects?: any[]): 'on-track' | 'at-risk' | 'critical' | 'blocked' => {
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

    if (type === 'strategy') {
      // Strategy risk is based on its projects' risk levels
      if (!strategyProjects || strategyProjects.length === 0) return 'on-track';
      
      const projectRisks = strategyProjects.map(p => getRiskLevel(p, 'project'));
      
      // If any project is critical, strategy is critical
      if (projectRisks.includes('critical')) return 'critical';
      // If any project is at-risk, strategy is at-risk
      if (projectRisks.includes('at-risk')) return 'at-risk';
      // If any project is blocked, strategy is at-risk (not critical)
      if (projectRisks.includes('blocked')) return 'at-risk';
      
      return 'on-track';
    }

    if (type === 'project') {
      const progress = item.progress || 0;
      const dueDate = safeDate(item.dueDate);
      
      if (!dueDate) return 'on-track';
      if (progress >= 100) return 'on-track';
      if (isPast(dueDate)) return 'critical';
      
      const startDate = safeDate(item.startDate);
      if (!startDate) return 'on-track';
      
      const totalDays = differenceInDays(dueDate, startDate);
      const elapsed = differenceInDays(today, startDate);
      
      // Don't penalize early-stage projects
      if (elapsed <= 0 || totalDays <= 0) return 'on-track';
      
      const expectedProgress = (elapsed / totalDays) * 100;
      
      // Only flag as at-risk if we're past 10% of timeline
      if (expectedProgress < 10) return 'on-track';
      
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
  const atRiskStrategies = strategies.filter(s => {
    const strategyProjects = projects.filter((t: any) => t.strategyId === s.id);
    const risk = getRiskLevel(s, 'strategy', strategyProjects);
    return risk === 'at-risk' || risk === 'critical';
  }).length;

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
              <TabsTrigger value="executive-goals" data-testid="tab-executive-goals">
                <Tag className="w-4 h-4 mr-2" />
                Executive Goals
              </TabsTrigger>
              <TabsTrigger value="team-tags" data-testid="tab-team-tags">
                <Hash className="w-4 h-4 mr-2" />
                Team Tags
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

            {/* Executive Goals Report */}
            <TabsContent value="executive-goals" className="space-y-4">
              <ExecutiveGoalsReport
                executiveGoals={executiveGoals}
                strategyExecutiveGoalMappings={strategyExecutiveGoalMappings}
                strategies={strategies}
                projects={projects}
                actions={actions}
                safeDate={safeDate}
              />
            </TabsContent>

            {/* Team Tags Report */}
            <TabsContent value="team-tags" className="space-y-4">
              <TeamTagsReport
                teamTags={teamTags}
                projectTeamTags={projectTeamTags}
                projects={projects}
                strategies={strategies}
                actions={actions}
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
            <div className="page-break">
              <h2 className="text-xl font-bold mb-4">Executive Goals Briefing</h2>
              <ExecutiveGoalsReport
                executiveGoals={executiveGoals}
                strategyExecutiveGoalMappings={strategyExecutiveGoalMappings}
                strategies={strategies}
                projects={projects}
                actions={actions}
                safeDate={safeDate}
                isPrintView={true}
              />
            </div>
            <div className="page-break">
              <h2 className="text-xl font-bold mb-4">Team Tags Report</h2>
              <TeamTagsReport
                teamTags={teamTags}
                projectTeamTags={projectTeamTags}
                projects={projects}
                strategies={strategies}
                actions={actions}
                safeDate={safeDate}
                isPrintView={true}
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
          const strategyRisk = getRiskLevel(strategy, 'strategy', strategyProjects);
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

// Executive Goals Report Component - Executive Briefing Format
function ExecutiveGoalsReport({ 
  executiveGoals, 
  strategyExecutiveGoalMappings, 
  strategies, 
  projects, 
  actions, 
  safeDate,
  isPrintView = false 
}: any) {
  const [lookbackMonths, setLookbackMonths] = useState<string>("3");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("all");

  const today = new Date();
  const lookbackDate = new Date(today);
  lookbackDate.setMonth(lookbackDate.getMonth() - parseInt(lookbackMonths));

  const getStrategiesForGoal = (goalId: string) => {
    if (goalId === "all") {
      const allMappedStrategyIds = strategyExecutiveGoalMappings.map((m: any) => m.strategyId);
      return strategies.filter((s: any) => allMappedStrategyIds.includes(s.id));
    }
    const mappings = strategyExecutiveGoalMappings.filter((m: any) => m.executiveGoalId === goalId);
    const strategyIds = mappings.map((m: any) => m.strategyId);
    return strategies.filter((s: any) => strategyIds.includes(s.id));
  };

  const getProjectsForStrategies = (strategyList: any[]) => {
    const strategyIds = strategyList.map((s: any) => s.id);
    return projects.filter((p: any) => strategyIds.includes(p.strategyId));
  };

  const getActionsForProjects = (projectList: any[]) => {
    const projectIds = projectList.map((p: any) => p.id);
    return actions.filter((a: any) => projectIds.includes(a.projectId));
  };

  const isWithinLookback = (dateStr: string | null) => {
    if (!dateStr) return false;
    const date = safeDate(dateStr);
    if (!date) return false;
    return date >= lookbackDate && date <= today;
  };

  const alignedStrategies = getStrategiesForGoal(selectedGoalId);
  const alignedProjects = getProjectsForStrategies(alignedStrategies);
  const alignedActions = getActionsForProjects(alignedProjects);

  const completedActions = alignedActions.filter((a: any) => a.status === 'achieved');
  const recentCompletions = completedActions.filter((a: any) => {
    const targetDate = safeDate(a.targetDate);
    return targetDate && isWithinLookback(a.targetDate);
  });

  const overdueActions = alignedActions.filter((a: any) => {
    if (a.status === 'achieved') return false;
    const targetDate = safeDate(a.targetDate);
    return targetDate && isPast(targetDate);
  });

  const blockedActions = alignedActions.filter((a: any) => a.status === 'blocked');

  const atRiskItems = [...overdueActions, ...blockedActions.filter((a: any) => !overdueActions.find((o: any) => o.id === a.id))];

  const overallProgress = alignedStrategies.length > 0
    ? Math.round(alignedStrategies.reduce((sum: number, s: any) => sum + (s.progress || 0), 0) / alignedStrategies.length)
    : 0;

  const completedProjects = alignedProjects.filter((p: any) => p.progress >= 100);
  
  const recentlyCompletedProjects = completedProjects.filter((p: any) => {
    const dueDate = safeDate(p.dueDate);
    return dueDate && isWithinLookback(p.dueDate);
  });

  const progressDistribution = {
    notStarted: alignedStrategies.filter((s: any) => (s.progress || 0) === 0).length,
    early: alignedStrategies.filter((s: any) => (s.progress || 0) > 0 && (s.progress || 0) < 25).length,
    inProgress: alignedStrategies.filter((s: any) => (s.progress || 0) >= 25 && (s.progress || 0) < 75).length,
    nearComplete: alignedStrategies.filter((s: any) => (s.progress || 0) >= 75 && (s.progress || 0) < 100).length,
    complete: alignedStrategies.filter((s: any) => (s.progress || 0) >= 100).length,
  };

  const upcomingMilestones = alignedActions.filter((a: any) => {
    if (a.status === 'achieved') return false;
    const targetDate = safeDate(a.targetDate);
    if (!targetDate) return false;
    const daysUntil = differenceInDays(targetDate, today);
    return daysUntil >= 0 && daysUntil <= 30;
  }).sort((a: any, b: any) => {
    const dateA = safeDate(a.targetDate);
    const dateB = safeDate(b.targetDate);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  }).slice(0, 5);

  const selectedGoal = executiveGoals.find((g: any) => g.id === selectedGoalId);

  return (
    <div className="space-y-6" data-testid="executive-goals-report">
      {isPrintView ? (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Executive Goals Briefing</h3>
              <p className="text-sm text-gray-600">
                {selectedGoalId === "all" ? "All Executive Goals" : selectedGoal?.name || "All Goals"} • {lookbackMonths} Month Lookback
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Generated: {format(today, 'MMM dd, yyyy')}</p>
              <p>Period: {format(lookbackDate, 'MMM yyyy')} - {format(today, 'MMM yyyy')}</p>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center">
                  <Tag className="w-5 h-5 mr-2 text-primary" />
                  Executive Goals Briefing
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Strategic alignment and progress report for executive review
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                  <SelectTrigger className="w-[200px]" data-testid="select-executive-goal">
                    <SelectValue placeholder="Select Goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Executive Goals</SelectItem>
                    {executiveGoals.map((goal: any) => (
                      <SelectItem key={goal.id} value={goal.id}>{goal.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={lookbackMonths} onValueChange={setLookbackMonths}>
                  <SelectTrigger className="w-[160px]" data-testid="select-lookback">
                    <SelectValue placeholder="Lookback Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Month Lookback</SelectItem>
                    <SelectItem value="6">6 Month Lookback</SelectItem>
                    <SelectItem value="9">9 Month Lookback</SelectItem>
                    <SelectItem value="12">12 Month Lookback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {selectedGoalId !== "all" && selectedGoal && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Award className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-lg">{selectedGoal.name}</h3>
                {selectedGoal.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedGoal.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <Card data-testid="metric-strategies" className="print:shadow-none print:border">
          <CardContent className="pt-6 print:pt-3 print:pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 print:text-xs">Aligned Priorities</p>
                <p className="text-3xl font-bold text-primary print:text-xl">{alignedStrategies.length}</p>
              </div>
              <Target className="w-8 h-8 text-primary/30 print:hidden" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-projects" className="print:shadow-none print:border">
          <CardContent className="pt-6 print:pt-3 print:pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 print:text-xs">Projects Complete</p>
                <p className="text-3xl font-bold text-green-600 print:text-xl">{completedProjects.length}<span className="text-lg text-gray-400 print:text-sm">/{alignedProjects.length}</span></p>
              </div>
              <Briefcase className="w-8 h-8 text-green-600/30 print:hidden" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-actions" className="print:shadow-none print:border">
          <CardContent className="pt-6 print:pt-3 print:pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 print:text-xs">Actions Achieved</p>
                <p className="text-3xl font-bold text-blue-600 print:text-xl">{completedActions.length}<span className="text-lg text-gray-400 print:text-sm">/{alignedActions.length}</span></p>
              </div>
              <ListChecks className="w-8 h-8 text-blue-600/30 print:hidden" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-progress" className="print:shadow-none print:border">
          <CardContent className="pt-6 print:pt-3 print:pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 print:text-xs">Overall Progress</p>
                <p className="text-3xl font-bold print:text-xl">{overallProgress}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-gray-400/30 print:hidden" />
            </div>
            <Progress value={overallProgress} className="mt-3 h-2 print:mt-1" />
          </CardContent>
        </Card>
      </div>

      {alignedStrategies.length > 0 && (
        <Card data-testid="card-progress-distribution" className="print:break-inside-avoid">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Current Progress Snapshot
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">Strategy distribution by completion stage</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24 mb-3">
              {[
                { label: 'Not Started', value: progressDistribution.notStarted, color: 'bg-gray-300 dark:bg-gray-600' },
                { label: '1-24%', value: progressDistribution.early, color: 'bg-red-400' },
                { label: '25-74%', value: progressDistribution.inProgress, color: 'bg-amber-400' },
                { label: '75-99%', value: progressDistribution.nearComplete, color: 'bg-blue-400' },
                { label: 'Complete', value: progressDistribution.complete, color: 'bg-green-500' },
              ].map((bar, index) => {
                const maxVal = Math.max(
                  progressDistribution.notStarted,
                  progressDistribution.early,
                  progressDistribution.inProgress,
                  progressDistribution.nearComplete,
                  progressDistribution.complete,
                  1
                );
                const heightPercent = (bar.value / maxVal) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{bar.value}</span>
                    <div 
                      className={`w-full ${bar.color} rounded-t transition-all`}
                      style={{ height: `${Math.max(heightPercent, 4)}%`, minHeight: bar.value > 0 ? '8px' : '4px' }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1 text-[10px] text-gray-500">
              {['Not Started', '1-24%', '25-74%', '75-99%', 'Complete'].map((label, i) => (
                <div key={i} className="flex-1 text-center truncate">{label}</div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Completed in last {lookbackMonths} months:</span>
                <span className="font-medium text-green-600">{recentCompletions.length} actions, {recentlyCompletedProjects.length} projects</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Based on target dates within the lookback period</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6 print:gap-3 print:grid-cols-2">
        <Card data-testid="card-aligned-priorities" className="print:shadow-none print:border print:break-inside-avoid">
          <CardHeader className="pb-3 print:pb-2">
            <CardTitle className="text-base flex items-center print:text-sm">
              <Target className="w-4 h-4 mr-2 print:w-3 print:h-3" />
              Aligned Strategic Priorities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alignedStrategies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No strategies aligned to {selectedGoalId === "all" ? "any executive goals" : "this goal"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alignedStrategies.map((strategy: any) => {
                  const strategyProjects = projects.filter((p: any) => p.strategyId === strategy.id);
                  const progress = strategy.progress || 0;
                  const trend = progress >= 50 ? "up" : "down";
                  
                  return (
                    <div key={strategy.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: strategy.colorCode }} 
                          />
                          <span className="font-medium text-sm">{strategy.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {trend === "up" ? (
                            <ArrowUpRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="font-bold text-sm">{progress}%</span>
                        </div>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                      <p className="text-xs text-gray-500 mt-2">
                        {strategyProjects.length} project{strategyProjects.length !== 1 ? 's' : ''} • 
                        Target: {format(new Date(strategy.targetDate), 'MMM yyyy')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 print:space-y-3">
          <Card data-testid="card-recent-completions" className="print:shadow-none print:border print:break-inside-avoid">
            <CardHeader className="pb-3 print:pb-2">
              <CardTitle className="text-base flex items-center text-green-600 print:text-sm">
                <CheckCircle className="w-4 h-4 mr-2 print:w-3 print:h-3" />
                Recent Completions ({lookbackMonths}mo)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentCompletions.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center print:py-2">No completions in this period</p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto print:max-h-none print:overflow-visible">
                  {recentCompletions.slice(0, 5).map((action: any) => {
                    const project = projects.find((p: any) => p.id === action.projectId);
                    return (
                      <div key={action.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span className="truncate">{action.title}</span>
                        {project && (
                          <span className="text-xs text-gray-400 flex-shrink-0">({project.title})</span>
                        )}
                      </div>
                    );
                  })}
                  {recentCompletions.length > 5 && (
                    <p className="text-xs text-gray-400 mt-1">+{recentCompletions.length - 5} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-at-risk" className="print:shadow-none print:border print:break-inside-avoid">
            <CardHeader className="pb-3 print:pb-2">
              <CardTitle className="text-base flex items-center text-red-600 print:text-sm">
                <AlertTriangle className="w-4 h-4 mr-2 print:w-3 print:h-3" />
                At-Risk Items ({atRiskItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atRiskItems.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No items at risk</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {atRiskItems.slice(0, 5).map((action: any) => {
                    const project = projects.find((p: any) => p.id === action.projectId);
                    const isOverdue = action.status !== 'blocked' && safeDate(action.targetDate) && isPast(safeDate(action.targetDate));
                    
                    return (
                      <div key={action.id} className="flex items-center gap-2 text-sm">
                        {action.status === 'blocked' ? (
                          <XCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{action.title}</span>
                        <Badge className={`text-xs flex-shrink-0 ${
                          action.status === 'blocked' 
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {action.status === 'blocked' ? 'Blocked' : 'Overdue'}
                        </Badge>
                      </div>
                    );
                  })}
                  {atRiskItems.length > 5 && (
                    <p className="text-xs text-gray-400 mt-1">+{atRiskItems.length - 5} more items need attention</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card data-testid="card-upcoming-milestones" className="print:shadow-none print:border print:break-inside-avoid">
        <CardHeader className="pb-3 print:pb-2">
          <CardTitle className="text-base flex items-center print:text-sm">
            <Calendar className="w-4 h-4 mr-2 print:w-3 print:h-3" />
            Upcoming Milestones (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingMilestones.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No milestones in the next 30 days</p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {upcomingMilestones.map((action: any) => {
                const project = projects.find((p: any) => p.id === action.projectId);
                const strategy = strategies.find((s: any) => s.id === action.strategyId);
                const targetDate = safeDate(action.targetDate);
                const daysUntil = targetDate ? differenceInDays(targetDate, today) : 0;
                
                return (
                  <div 
                    key={action.id} 
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {strategy && (
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: strategy.colorCode }} 
                        />
                      )}
                      <span className="text-xs font-medium text-gray-500">
                        {daysUntil === 0 ? 'Today' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <p className="text-sm font-medium line-clamp-2">{action.title}</p>
                    {targetDate && (
                      <p className="text-xs text-gray-500 mt-1">{format(targetDate, 'MMM dd')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {executiveGoals.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No Executive Goals Defined</p>
            <p className="text-sm text-gray-400">Create executive goals in Settings to see alignment reports</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Team Tags Report Component
function TeamTagsReport({ 
  teamTags, 
  projectTeamTags, 
  projects, 
  strategies,
  actions, 
  safeDate,
  isPrintView = false 
}: any) {
  const [selectedTagId, setSelectedTagId] = useState<string>("all");
  const today = new Date();

  // Get projects for a specific tag
  const getProjectsForTag = (tagId: string): any[] => {
    if (tagId === "all") {
      const allMappedProjectIds = projectTeamTags.map((m: any) => m.projectId);
      return projects.filter((p: any) => allMappedProjectIds.includes(p.id));
    }
    const mappings = projectTeamTags.filter((m: any) => m.teamTagId === tagId);
    const projectIds = mappings.map((m: any) => m.projectId);
    return projects.filter((p: any) => projectIds.includes(p.id));
  };

  // Get tags for a specific project
  const getTagsForProject = (projectId: string): any[] => {
    const tagIds = projectTeamTags
      .filter((m: any) => m.projectId === projectId)
      .map((m: any) => m.teamTagId);
    return teamTags.filter((t: any) => tagIds.includes(t.id));
  };

  // Get actions for projects
  const getActionsForProjects = (projectList: any[]) => {
    const projectIds = projectList.map((p: any) => p.id);
    return actions.filter((a: any) => projectIds.includes(a.projectId));
  };

  // Stats for selected tag(s)
  const taggedProjects = getProjectsForTag(selectedTagId);
  const taggedActions = getActionsForProjects(taggedProjects);
  
  const completedActions = taggedActions.filter((a: any) => a.status === 'achieved');
  const overdueActions = taggedActions.filter((a: any) => {
    if (a.status === 'achieved') return false;
    const targetDate = safeDate(a.targetDate);
    return targetDate && isPast(targetDate);
  });
  const blockedActions = taggedActions.filter((a: any) => a.status === 'blocked');
  
  const overallProgress = taggedProjects.length > 0
    ? Math.round(taggedProjects.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / taggedProjects.length)
    : 0;

  const completedProjects = taggedProjects.filter((p: any) => p.progress >= 100);
  const inProgressProjects = taggedProjects.filter((p: any) => p.progress > 0 && p.progress < 100);
  const notStartedProjects = taggedProjects.filter((p: any) => (p.progress || 0) === 0);

  // Tag utilization stats
  const tagStats = teamTags.map((tag: any) => {
    const tagProjects = getProjectsForTag(tag.id);
    const tagActions = getActionsForProjects(tagProjects);
    const completedTagActions = tagActions.filter((a: any) => a.status === 'achieved');
    const avgProgress = tagProjects.length > 0
      ? Math.round(tagProjects.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / tagProjects.length)
      : 0;
    
    return {
      ...tag,
      projectCount: tagProjects.length,
      actionCount: tagActions.length,
      completedActions: completedTagActions.length,
      avgProgress,
    };
  }).sort((a: any, b: any) => b.projectCount - a.projectCount);

  const selectedTag = teamTags.find((t: any) => t.id === selectedTagId);

  return (
    <div className="space-y-6" data-testid="team-tags-report">
      {isPrintView ? (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-6 w-6" />
            <h2 className="text-xl font-bold">Team Tags Report</h2>
          </div>
        </div>
      ) : (
        <Card data-testid="card-tag-selector">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Team Tag:</span>
              </div>
              <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                <SelectTrigger className="w-[240px]" data-testid="select-team-tag-filter">
                  <SelectValue placeholder="Select a team tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tagged Projects</SelectItem>
                  {teamTags.map((tag: any) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.colorHex }}
                        />
                        #{tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTag && (
                <Badge 
                  className="px-3 py-1"
                  style={{ 
                    backgroundColor: `${selectedTag.colorHex}20`,
                    color: selectedTag.colorHex,
                    borderColor: selectedTag.colorHex
                  }}
                >
                  #{selectedTag.name}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-tagged-projects">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-purple-600" />
              Tagged Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{taggedProjects.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              {completedProjects.length} complete
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-avg-progress">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
              Avg Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{overallProgress}%</div>
            <Progress value={overallProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="stat-actions-complete">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Actions Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {taggedActions.length > 0 ? Math.round((completedActions.length / taggedActions.length) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {completedActions.length} of {taggedActions.length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-at-risk">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{overdueActions.length + blockedActions.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              {overdueActions.length} overdue, {blockedActions.length} blocked
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tag Utilization Overview */}
      <Card data-testid="card-tag-utilization">
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Team Tag Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tagStats.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No team tags created yet</p>
          ) : (
            <div className="space-y-4">
              {tagStats.map((tag: any) => (
                <div key={tag.id} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32 flex-shrink-0">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: tag.colorHex }}
                    />
                    <span className="text-sm font-medium truncate">#{tag.name}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Progress value={tag.avgProgress} className="h-2 flex-1" />
                      <span className="text-xs text-gray-500 w-10">{tag.avgProgress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                    <span>{tag.projectCount} projects</span>
                    <span>{tag.completedActions}/{tag.actionCount} actions</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects List by Tag */}
      <Card data-testid="card-tagged-projects-list">
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <ListChecks className="w-4 h-4 mr-2" />
            Projects by Tag {selectedTag ? `- #${selectedTag.name}` : '(All)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taggedProjects.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              {teamTags.length === 0 
                ? "No team tags created yet. Create tags in Settings to start organizing projects."
                : "No projects have been tagged yet. Assign tags to projects on the Strategies page."
              }
            </p>
          ) : (
            <div className="space-y-3">
              {taggedProjects.map((project: any) => {
                const strategy = strategies.find((s: any) => s.id === project.strategyId);
                const projectTags = getTagsForProject(project.id);
                const projectActions = actions.filter((a: any) => a.projectId === project.id);
                const projectCompletedActions = projectActions.filter((a: any) => a.status === 'achieved');
                
                return (
                  <div 
                    key={project.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    data-testid={`project-row-${project.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {strategy && (
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                        )}
                        <span className="font-medium truncate">{project.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {strategy && (
                          <span className="text-xs text-gray-500">{strategy.title}</span>
                        )}
                        {projectTags.map((tag: any) => (
                          <Badge
                            key={tag.id}
                            className="text-xs px-1.5 py-0"
                            style={{
                              backgroundColor: `${tag.colorHex}20`,
                              color: tag.colorHex,
                            }}
                          >
                            #{tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-medium">{project.progress || 0}%</div>
                        <div className="text-xs text-gray-500">
                          {projectCompletedActions.length}/{projectActions.length} actions
                        </div>
                      </div>
                      <Progress value={project.progress || 0} className="w-24 h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {teamTags.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No Team Tags Defined</p>
            <p className="text-sm text-gray-400">Create team tags in Settings to see utilization reports</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
