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
  completionDate?: string;
};

type Project = {
  id: string;
  title: string;
  strategyId: string;
  progress: number;
  status: string;
  startDate: string;
  dueDate: string;
  completionDate?: string;
  isArchived?: string;
  accountableLeaders: string; // JSON array of user IDs
};

type Action = {
  id: string;
  title: string;
  projectId: string;
  strategyId: string;
  status: string;
  targetDate: string;
  achievedDate?: string;
  isArchived?: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  fte?: string;
  salary?: number;
};

type ResourceAssignment = {
  id: string;
  projectId: string;
  userId: string;
  hoursPerWeek: string;
  organizationId: string;
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
  const [activeTab, setActiveTab] = useState("capacity");
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

  const { data: resourceAssignments = [] } = useQuery<ResourceAssignment[]>({
    queryKey: ["/api/resource-assignments"],
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card data-testid="card-active-strategies" className="py-2">
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <Target className="w-3 h-3 mr-1" />
                  Active Strategies
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2 px-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-active-strategies">
                  {activeStrategies}
                </div>
                <div className="text-[10px] text-gray-500">
                  of {totalStrategies} total
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-at-risk" className="py-2">
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1 text-yellow-600" />
                  At Risk
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2 px-3">
                <div className="text-2xl font-bold text-yellow-600" data-testid="text-at-risk">
                  {atRiskStrategies}
                </div>
                <div className="text-[10px] text-yellow-600">
                  strategies need attention
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-overdue-projects" className="py-2">
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <XCircle className="w-3 h-3 mr-1 text-red-600" />
                  Overdue Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2 px-3">
                <div className="text-2xl font-bold text-red-600" data-testid="text-overdue-projects">
                  {overdueProjects}
                </div>
                <div className="text-[10px] text-red-600">
                  past due date
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-completion-rate" className="py-2">
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                  Actions Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2 px-3">
                <div className="text-2xl font-bold text-green-600" data-testid="text-completion-rate">
                  {totalActions > 0 ? Math.round((achievedActions / totalActions) * 100) : 0}%
                </div>
                <div className="text-[10px] text-gray-500">
                  {achievedActions} of {totalActions}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Reports */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
            <TabsList className="mb-6 flex-wrap h-auto gap-1 overflow-x-auto">
              <TabsTrigger value="capacity" data-testid="tab-capacity">
                <Users className="w-4 h-4 mr-2" />
                Capacity
              </TabsTrigger>
              <TabsTrigger value="team-tags" data-testid="tab-team-tags">
                <Hash className="w-4 h-4 mr-2" />
                Team Tags
              </TabsTrigger>
              <TabsTrigger value="executive-goals" data-testid="tab-executive-goals">
                <Tag className="w-4 h-4 mr-2" />
                Executive Goals
              </TabsTrigger>
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

            {/* Capacity Report */}
            <TabsContent value="capacity" className="space-y-4">
              <CapacityReport
                users={users}
                projects={projects}
                strategies={strategies}
                resourceAssignments={resourceAssignments}
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

// Executive Goals Report Component - 18-Month Completions Table
function ExecutiveGoalsReport({ 
  executiveGoals, 
  strategyExecutiveGoalMappings, 
  strategies, 
  projects, 
  actions, 
  safeDate,
  isPrintView = false 
}: any) {
  const today = new Date();
  const lookbackDate = new Date(today);
  lookbackDate.setMonth(lookbackDate.getMonth() - 18);

  const isWithinLookback = (dateStr: string | null) => {
    if (!dateStr) return false;
    const date = safeDate(dateStr);
    if (!date) return false;
    return date >= lookbackDate && date <= today;
  };

  const formatCompletionDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = safeDate(dateStr);
    if (!date) return '-';
    return format(date, 'MMM dd, yyyy');
  };

  type CompletionItem = {
    id: string;
    type: 'strategy' | 'project' | 'action';
    title: string;
    completionDate: Date | null;
    completionDateStr: string | null;
    strategyId: string;
    strategyTitle: string;
    strategyColor: string;
    projectTitle?: string;
    isArchived?: boolean;
  };

  const buildCompletionData = () => {
    const completionsByGoal: Record<string, { goal: any; items: CompletionItem[] }> = {};

    executiveGoals.forEach((goal: any) => {
      completionsByGoal[goal.id] = { goal, items: [] };
    });

    strategyExecutiveGoalMappings.forEach((mapping: any) => {
      const goalId = mapping.executiveGoalId;
      if (!completionsByGoal[goalId]) return;

      const strategy = strategies.find((s: any) => s.id === mapping.strategyId);
      if (!strategy) return;

      if ((strategy.status === 'Completed' || strategy.status === 'Archived') && 
          strategy.completionDate && isWithinLookback(strategy.completionDate)) {
        completionsByGoal[goalId].items.push({
          id: strategy.id,
          type: 'strategy',
          title: strategy.title,
          completionDate: safeDate(strategy.completionDate),
          completionDateStr: strategy.completionDate,
          strategyId: strategy.id,
          strategyTitle: strategy.title,
          strategyColor: strategy.colorCode,
          isArchived: strategy.status === 'Archived',
        });
      }

      const strategyProjects = projects.filter((p: any) => p.strategyId === strategy.id);
      strategyProjects.forEach((project: any) => {
        if (project.status === 'C' && project.completionDate && isWithinLookback(project.completionDate)) {
          completionsByGoal[goalId].items.push({
            id: project.id,
            type: 'project',
            title: project.title,
            completionDate: safeDate(project.completionDate),
            completionDateStr: project.completionDate,
            strategyId: strategy.id,
            strategyTitle: strategy.title,
            strategyColor: strategy.colorCode,
            isArchived: project.isArchived === 'true',
          });
        }
      });

      const strategyActions = actions.filter((a: any) => a.strategyId === strategy.id);
      strategyActions.forEach((action: any) => {
        if (action.status === 'achieved' && action.achievedDate && isWithinLookback(action.achievedDate)) {
          const project = projects.find((p: any) => p.id === action.projectId);
          completionsByGoal[goalId].items.push({
            id: action.id,
            type: 'action',
            title: action.title,
            completionDate: safeDate(action.achievedDate),
            completionDateStr: action.achievedDate,
            strategyId: strategy.id,
            strategyTitle: strategy.title,
            strategyColor: strategy.colorCode,
            projectTitle: project?.title,
            isArchived: action.isArchived === 'true',
          });
        }
      });

      completionsByGoal[goalId].items.sort((a, b) => {
        if (!a.completionDate || !b.completionDate) return 0;
        return b.completionDate.getTime() - a.completionDate.getTime();
      });
    });

    return Object.values(completionsByGoal).filter(entry => entry.items.length > 0);
  };

  const completionData = buildCompletionData();
  const totalCompletions = completionData.reduce((sum, entry) => sum + entry.items.length, 0);

  const getTypeBadge = (type: 'strategy' | 'project' | 'action') => {
    switch (type) {
      case 'strategy':
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">Priority</Badge>;
      case 'project':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">Project</Badge>;
      case 'action':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">Action</Badge>;
    }
  };

  return (
    <div className="space-y-6" data-testid="executive-goals-report">
      {isPrintView ? (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Executive Goals - Completions Report</h3>
              <p className="text-sm text-gray-600">Rolling 18-Month Lookback</p>
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
                  <Award className="w-5 h-5 mr-2 text-primary" />
                  Executive Goals - Completions Report
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Completed Strategic Priorities, Projects, and Actions (18-month rolling lookback)
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p className="font-medium">{totalCompletions} total completions</p>
                <p>{format(lookbackDate, 'MMM yyyy')} - {format(today, 'MMM yyyy')}</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {executiveGoals.map((goal: any) => (
          <Badge key={goal.id} variant="outline" className="px-3 py-1">
            <Tag className="w-3 h-3 mr-1" />
            {goal.name}
          </Badge>
        ))}
      </div>

      {completionData.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No Completions in the Last 18 Months</p>
            <p className="text-sm text-gray-400">
              Completed strategies, projects, and actions will appear here once items are marked complete
            </p>
          </CardContent>
        </Card>
      ) : (
        completionData.map(({ goal, items }) => (
          <Card key={goal.id} className="print:break-inside-avoid">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                {goal.name}
                <Badge variant="secondary" className="ml-2">{items.length} completion{items.length !== 1 ? 's' : ''}</Badge>
              </CardTitle>
              {goal.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{goal.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Type</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Title</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Strategic Priority</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Project</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={`${item.type}-${item.id}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            {getTypeBadge(item.type)}
                            {item.isArchived && (
                              <Badge variant="outline" className="text-xs text-gray-500">Archived</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 font-medium">{item.title}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: item.strategyColor }} 
                            />
                            <span className="text-gray-600 dark:text-gray-400">{item.strategyTitle}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-gray-500">
                          {item.projectTitle || (item.type === 'project' ? item.title : '-')}
                        </td>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatCompletionDate(item.completionDateStr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {executiveGoals.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No Executive Goals Defined</p>
            <p className="text-sm text-gray-400">Create executive goals in Settings to see the completions report</p>
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
  // Get projects for a specific tag
  const getProjectsForTag = (tagId: string): any[] => {
    const mappings = projectTeamTags.filter((m: any) => m.teamTagId === tagId);
    const projectIds = mappings.map((m: any) => m.projectId);
    return projects.filter((p: any) => projectIds.includes(p.id));
  };

  // Get all tagged projects (for summary stats)
  const getAllTaggedProjects = (): any[] => {
    const allMappedProjectIds = Array.from(new Set(projectTeamTags.map((m: any) => m.projectId)));
    return projects.filter((p: any) => allMappedProjectIds.includes(p.id));
  };

  // Get actions for projects
  const getActionsForProjects = (projectList: any[]) => {
    const projectIds = projectList.map((p: any) => p.id);
    return actions.filter((a: any) => projectIds.includes(a.projectId));
  };

  // Summary stats for all tagged projects
  const allTaggedProjects = getAllTaggedProjects();
  const allTaggedActions = getActionsForProjects(allTaggedProjects);
  
  const completedActions = allTaggedActions.filter((a: any) => a.status === 'achieved');
  const overdueActions = allTaggedActions.filter((a: any) => {
    if (a.status === 'achieved') return false;
    const targetDate = safeDate(a.targetDate);
    return targetDate && isPast(targetDate);
  });
  const blockedActions = allTaggedActions.filter((a: any) => a.status === 'blocked');
  
  const overallProgress = allTaggedProjects.length > 0
    ? Math.round(allTaggedProjects.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / allTaggedProjects.length)
    : 0;

  const completedProjects = allTaggedProjects.filter((p: any) => p.progress >= 100);

  // Tag stats for collapsible hierarchy
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

  return (
    <div className="space-y-6" data-testid="team-tags-report">
      {isPrintView && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-6 w-6" />
            <h2 className="text-xl font-bold">Team Tags Report</h2>
          </div>
        </div>
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
            <div className="text-3xl font-bold text-purple-600">{allTaggedProjects.length}</div>
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
              {allTaggedActions.length > 0 ? Math.round((completedActions.length / allTaggedActions.length) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {completedActions.length} of {allTaggedActions.length}
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

      {/* Projects Grouped by Team Tag (Collapsible Hierarchy) */}
      <Card data-testid="card-projects-by-team-tag">
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <ListChecks className="w-4 h-4 mr-2" />
            Projects by Team Tag
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamTags.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No team tags created yet. Create tags in Settings to start organizing projects.
            </p>
          ) : (
            <div className="space-y-3">
              {tagStats.map((tag: any) => {
                const tagProjects = getProjectsForTag(tag.id);
                
                if (isPrintView) {
                  // Print view: always expanded
                  return (
                    <div key={tag.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800"
                        style={{ borderLeft: `4px solid ${tag.colorHex}` }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: tag.colorHex }}
                          />
                          <span className="font-medium">#{tag.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {tagProjects.length} project{tagProjects.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{tag.avgProgress}% avg</span>
                        </div>
                      </div>
                      {tagProjects.length > 0 && (
                        <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
                          {tagProjects.map((project: any) => {
                            const strategy = strategies.find((s: any) => s.id === project.strategyId);
                            const projectActions = actions.filter((a: any) => a.projectId === project.id);
                            const projectCompletedActions = projectActions.filter((a: any) => a.status === 'achieved');
                            
                            return (
                              <div 
                                key={project.id}
                                className="flex items-center justify-between p-2 border border-gray-100 dark:border-gray-700 rounded"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {strategy && (
                                      <div 
                                        className="w-2 h-2 rounded-full flex-shrink-0" 
                                        style={{ backgroundColor: strategy.colorCode }}
                                      />
                                    )}
                                    <span className="text-sm font-medium truncate">{project.title}</span>
                                  </div>
                                  {strategy && (
                                    <span className="text-xs text-gray-500 ml-4">{strategy.title}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <div className="text-right text-xs">
                                    <div className="font-medium">{project.progress || 0}%</div>
                                    <div className="text-gray-500">{projectCompletedActions.length}/{projectActions.length}</div>
                                  </div>
                                  <Progress value={project.progress || 0} className="w-16 h-1.5" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Interactive view: collapsible
                return (
                  <Collapsible key={tag.id} defaultOpen={tagProjects.length > 0 && tagProjects.length <= 5}>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <CollapsibleTrigger 
                        className="flex items-center justify-between w-full p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        style={{ borderLeft: `4px solid ${tag.colorHex}` }}
                        data-testid={`collapsible-tag-${tag.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <ChevronRight className="w-4 h-4 text-gray-500 transition-transform [[data-state=open]>&]:rotate-90" />
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: tag.colorHex }}
                          />
                          <span className="font-medium">#{tag.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {tagProjects.length} project{tagProjects.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{tag.avgProgress}% avg</span>
                          <Progress value={tag.avgProgress} className="w-16 h-1.5" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {tagProjects.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500 bg-white dark:bg-gray-900">
                            No projects assigned to this tag
                          </div>
                        ) : (
                          <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
                            {tagProjects.map((project: any) => {
                              const strategy = strategies.find((s: any) => s.id === project.strategyId);
                              const projectActions = actions.filter((a: any) => a.projectId === project.id);
                              const projectCompletedActions = projectActions.filter((a: any) => a.status === 'achieved');
                              
                              return (
                                <div 
                                  key={project.id}
                                  className="flex items-center justify-between p-2 border border-gray-100 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  data-testid={`tag-project-row-${tag.id}-${project.id}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      {strategy && (
                                        <div 
                                          className="w-2 h-2 rounded-full flex-shrink-0" 
                                          style={{ backgroundColor: strategy.colorCode }}
                                        />
                                      )}
                                      <span className="text-sm font-medium truncate">{project.title}</span>
                                    </div>
                                    {strategy && (
                                      <span className="text-xs text-gray-500 ml-4">{strategy.title}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-right text-xs">
                                      <div className="font-medium">{project.progress || 0}%</div>
                                      <div className="text-gray-500">{projectCompletedActions.length}/{projectActions.length}</div>
                                    </div>
                                    <Progress value={project.progress || 0} className="w-16 h-1.5" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
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

function CapacityReport({ 
  users, 
  projects, 
  strategies,
  resourceAssignments 
}: {
  users: User[];
  projects: Project[];
  strategies: Strategy[];
  resourceAssignments: ResourceAssignment[];
}) {
  const [viewMode, setViewMode] = useState<'current' | 'forecast'>('current');

  const getRelevantProjects = () => {
    if (viewMode === 'current') {
      return projects.filter(p => 
        p.status === 'OT' || 
        p.status === 'B'
      );
    } else {
      return projects.filter(p => 
        p.status === 'NYS'
      );
    }
  };

  const relevantProjects = getRelevantProjects();
  const relevantProjectIds = relevantProjects.map(p => p.id);

  const getUserCapacity = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const userAssignments = resourceAssignments.filter(
      ra => ra.userId === userId && relevantProjectIds.includes(ra.projectId)
    );

    const projectHours = userAssignments.reduce((sum, ra) => sum + parseFloat(ra.hoursPerWeek || '0'), 0);
    const serviceDeliveryHours = parseFloat(user.serviceDeliveryHours || '0');
    const totalHours = projectHours + serviceDeliveryHours;
    const maxHours = parseFloat(user.fte || '1') * 40;
    const capacityPercent = maxHours > 0 ? (totalHours / maxHours) * 100 : 0;

    const projectDetails = userAssignments.map(ra => {
      const project = projects.find(p => p.id === ra.projectId);
      const strategy = project ? strategies.find(s => s.id === project.strategyId) : null;
      return {
        assignment: ra,
        project,
        strategy,
        hours: parseFloat(ra.hoursPerWeek || '0')
      };
    });

    return {
      user,
      totalHours,
      maxHours,
      capacityPercent,
      projectDetails,
      serviceDeliveryHours,
      assignmentCount: userAssignments.length
    };
  };

  const usersWithCapacity = users
    .filter(u => u.role !== 'sme')
    .map(u => getUserCapacity(u.id))
    .filter(Boolean)
    .sort((a, b) => (b?.capacityPercent || 0) - (a?.capacityPercent || 0));

  const overCapacityUsers = usersWithCapacity.filter(u => u && u.totalHours > 40);
  const healthyUsers = usersWithCapacity.filter(u => u && u.totalHours >= 32 && u.totalHours <= 40);
  const underUtilizedUsers = usersWithCapacity.filter(u => u && u.totalHours < 32 && u.assignmentCount > 0);

  const getStatusBadge = (totalHours: number) => {
    if (totalHours > 40) {
      return <Badge variant="destructive" className="text-xs">Over Capacity</Badge>;
    } else if (totalHours >= 32) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Healthy</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">Under Utilized</Badge>;
    }
  };

  const projectColorMap = new Map<string, { title: string; color: string }>();
  usersWithCapacity.forEach(userCap => {
    if (!userCap) return;
    userCap.projectDetails.forEach(({ project, strategy }) => {
      if (project && !projectColorMap.has(project.id)) {
        projectColorMap.set(project.id, {
          title: project.title,
          color: strategy?.colorCode || '#6b7280'
        });
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Weekly Capacity Chart</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">View:</span>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'current' | 'forecast')}>
            <SelectTrigger className="w-32" data-testid="select-capacity-view-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="forecast">Forecast</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-assigned">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              People Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersWithCapacity.filter(u => u && u.assignmentCount > 0).length}</div>
            <div className="text-xs text-gray-500">of {users.filter(u => u.role !== 'sme').length} total</div>
          </CardContent>
        </Card>

        <Card data-testid="card-over-capacity">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Over Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overCapacityUsers.length}</div>
            <div className="text-xs text-gray-500">&gt;40h allocated</div>
          </CardContent>
        </Card>

        <Card data-testid="card-healthy">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Healthy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyUsers.length}</div>
            <div className="text-xs text-gray-500">32-40h allocated</div>
          </CardContent>
        </Card>

        <Card data-testid="card-under-utilized">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              <ArrowDownRight className="w-4 h-4 inline mr-1" />
              Under Utilized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{underUtilizedUsers.length}</div>
            <div className="text-xs text-gray-500">&lt;32h allocated</div>
          </CardContent>
        </Card>
      </div>

      {usersWithCapacity.filter(u => u && u.assignmentCount > 0).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">No resource assignments found</p>
            <p className="text-sm text-gray-400">Assign people to projects to see capacity utilization</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {usersWithCapacity
            .filter(u => u && u.assignmentCount > 0)
            .map(userCap => {
              if (!userCap) return null;
              const { user, totalHours, maxHours, projectDetails, serviceDeliveryHours } = userCap;
              const availableHours = Math.max(0, 40 - totalHours);

              return (
                <div key={user.id} className="space-y-2" data-testid={`capacity-user-${user.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-gray-500">
                          {user.fte || '1'} FTE • {maxHours}h capacity
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(totalHours)}
                      <span className="text-sm font-medium">{Math.round(totalHours)}h / {maxHours}h</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex text-[10px] text-gray-400 mb-1">
                      <span className="absolute left-0">0</span>
                      <span className="absolute left-1/4 -translate-x-1/2">10</span>
                      <span className="absolute left-1/2 -translate-x-1/2">20</span>
                      <span className="absolute left-3/4 -translate-x-1/2">30</span>
                      <span className="absolute right-0">40</span>
                    </div>
                    <div className="h-8 mt-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex relative">
                      {serviceDeliveryHours > 0 && (
                        <div
                          className="h-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ 
                            width: `${(serviceDeliveryHours / 40) * 100}%`, 
                            backgroundColor: '#D4A84B',
                            minWidth: '30px'
                          }}
                          title={`Service Delivery: ${serviceDeliveryHours}h`}
                          data-testid="capacity-bar-service-delivery"
                        >
                          {(serviceDeliveryHours / 40) * 100 >= 10 && <span>{Math.round(serviceDeliveryHours)}h</span>}
                        </div>
                      )}
                      {projectDetails.map(({ project, strategy, hours }, index) => {
                        const widthPercent = (hours / 40) * 100;
                        const color = strategy?.colorCode || '#6b7280';
                        return (
                          <div
                            key={project?.id || index}
                            className="h-full flex items-center justify-center text-white text-xs font-medium relative group"
                            style={{ 
                              width: `${widthPercent}%`, 
                              backgroundColor: color,
                              minWidth: hours > 0 ? '30px' : '0'
                            }}
                            title={`${project?.title || 'Unknown'}: ${hours}h`}
                            data-testid={`capacity-bar-${project?.id}`}
                          >
                            {widthPercent >= 10 && <span>{Math.round(hours)}h</span>}
                          </div>
                        );
                      })}
                      {availableHours > 0 && (
                        <div
                          className="h-full flex items-center justify-center text-gray-500 text-xs"
                          style={{ width: `${(availableHours / 40) * 100}%` }}
                        >
                          {availableHours >= 4 && <span>{Math.round(availableHours)}h</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-center text-[10px] text-gray-400 mt-1">Hours per Week</div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    {serviceDeliveryHours > 0 && (
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: '#D4A84B' }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">Service Delivery</span>
                      </div>
                    )}
                    {projectDetails.map(({ project, strategy }) => (
                      <div key={project?.id} className="flex items-center gap-1">
                        <div 
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: strategy?.colorCode || '#6b7280' }}
                        />
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={project?.title}>
                          {project?.title || 'Unknown'}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-gray-700" />
                      <span className="text-gray-500">Available Capacity</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="py-4">
          <div className="text-xs text-gray-500 mb-2 font-medium">All Projects in View</div>
          <div className="flex flex-wrap gap-4">
            {Array.from(projectColorMap.entries()).map(([projectId, { title, color }]) => (
              <div key={projectId} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[180px]" title={title}>
                  {title}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-500">Available Capacity</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
