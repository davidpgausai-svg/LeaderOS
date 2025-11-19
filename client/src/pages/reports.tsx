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

type Tactic = {
  id: string;
  title: string;
  strategyId: string;
  progress: number;
  status: string;
  startDate: string;
  dueDate: string;
  assignedTo: string;
};

type Outcome = {
  id: string;
  title: string;
  tacticId: string;
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

  const { data: tactics = [], isLoading: tacticsLoading } = useQuery<Tactic[]>({
    queryKey: ["/api/tactics"],
  });

  const { data: outcomes = [], isLoading: outcomesLoading } = useQuery<Outcome[]>({
    queryKey: ["/api/outcomes"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Strategic Report - ${format(new Date(), 'yyyy-MM-dd')}`,
  });

  // Helper function to determine risk level
  const getRiskLevel = (item: any, type: 'strategy' | 'tactic' | 'outcome'): 'on-track' | 'at-risk' | 'critical' | 'blocked' => {
    const today = new Date();
    
    if (type === 'outcome') {
      if (item.status === 'achieved') return 'on-track';
      if (item.status === 'blocked') return 'blocked';
      const targetDate = new Date(item.targetDate);
      if (isPast(targetDate)) return 'critical';
      const daysUntilDue = differenceInDays(targetDate, today);
      if (daysUntilDue <= 7) return 'at-risk';
      return 'on-track';
    }

    if (type === 'tactic' || type === 'strategy') {
      const progress = item.progress || 0;
      const dueDate = new Date(type === 'tactic' ? item.dueDate : item.targetDate);
      
      if (progress >= 100) return 'on-track';
      if (isPast(dueDate)) return 'critical';
      
      const totalDays = differenceInDays(dueDate, new Date(item.startDate));
      const elapsed = differenceInDays(today, new Date(item.startDate));
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

  const totalTactics = tactics.length;
  const overdueTactics = tactics.filter(t => {
    const dueDate = new Date(t.dueDate);
    return isPast(dueDate) && t.progress < 100;
  }).length;

  const totalOutcomes = outcomes.length;
  const achievedOutcomes = outcomes.filter(o => o.status === 'achieved').length;

  if (strategiesLoading || tacticsLoading || outcomesLoading) {
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
                  {overdueTactics}
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
                  {totalOutcomes > 0 ? Math.round((achievedOutcomes / totalOutcomes) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {achievedOutcomes} of {totalOutcomes}
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
                tactics={tactics}
                outcomes={outcomes}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
              />
            </TabsContent>

            {/* Timeline Risk Report */}
            <TabsContent value="timeline" className="space-y-4">
              <TimelineRiskReport
                strategies={strategies}
                tactics={tactics}
                outcomes={outcomes}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
              />
            </TabsContent>

            {/* Ownership Report */}
            <TabsContent value="ownership" className="space-y-4">
              <OwnershipReport
                tactics={tactics}
                outcomes={outcomes}
                users={users}
                strategies={strategies}
              />
            </TabsContent>
          </Tabs>

          {/* Print view - show all reports */}
          <div className="hidden print:block space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-4">Strategy Health Overview</h2>
              <StrategyHealthReport
                strategies={strategies}
                tactics={tactics}
                outcomes={outcomes}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
              />
            </div>
            <div className="page-break">
              <h2 className="text-xl font-bold mb-4">Timeline Risk</h2>
              <TimelineRiskReport
                strategies={strategies}
                tactics={tactics}
                outcomes={outcomes}
                getRiskLevel={getRiskLevel}
                getRiskBadge={getRiskBadge}
              />
            </div>
            <div className="page-break">
              <h2 className="text-xl font-bold mb-4">Resource & Ownership</h2>
              <OwnershipReport
                tactics={tactics}
                outcomes={outcomes}
                users={users}
                strategies={strategies}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Strategy Health Report Component
function StrategyHealthReport({ strategies, tactics, outcomes, getRiskLevel, getRiskBadge }: any) {
  const [openStrategies, setOpenStrategies] = useState<Set<string>>(new Set());
  const [openTactics, setOpenTactics] = useState<Set<string>>(new Set());

  const toggleStrategy = (id: string) => {
    const newSet = new Set(openStrategies);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setOpenStrategies(newSet);
  };

  const toggleTactic = (id: string) => {
    const newSet = new Set(openTactics);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setOpenTactics(newSet);
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
          const strategyTactics = tactics.filter((t: any) => t.strategyId === strategy.id);
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
                        <p className="text-sm text-gray-500">{strategyTactics.length} projects</p>
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
                    {strategyTactics.length === 0 ? (
                      <p className="text-sm text-gray-500 italic py-2">No projects defined</p>
                    ) : (
                      strategyTactics.map((tactic: any) => {
                        const tacticOutcomes = outcomes.filter((o: any) => o.tacticId === tactic.id);
                        const tacticRisk = getRiskLevel(tactic, 'tactic');
                        const isTacticOpen = openTactics.has(tactic.id);

                        return (
                          <div key={tactic.id} className="border-l-2 border-gray-300 dark:border-gray-600 ml-2" data-testid={`tactic-${tactic.id}`}>
                            <Collapsible open={isTacticOpen} onOpenChange={() => toggleTactic(tactic.id)}>
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <div className="flex items-center space-x-2 flex-1">
                                    {isTacticOpen ? (
                                      <ChevronDown className="w-3 h-3 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-gray-500" />
                                    )}
                                    <div className="text-left flex-1">
                                      <h4 className="font-medium text-sm text-gray-900 dark:text-white">{tactic.title}</h4>
                                      <p className="text-xs text-gray-500">{tacticOutcomes.length} actions</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <Progress value={tactic.progress || 0} className="w-24 h-2" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400 w-10">
                                      {tactic.progress || 0}%
                                    </span>
                                    {getRiskBadge(tacticRisk)}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="pl-6 pr-3 pb-2 space-y-1">
                                  {tacticOutcomes.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic py-1">No actions defined</p>
                                  ) : (
                                    tacticOutcomes.map((outcome: any) => {
                                      const outcomeRisk = getRiskLevel(outcome, 'outcome');
                                      const isOverdue = isPast(new Date(outcome.targetDate)) && outcome.status !== 'achieved';

                                      return (
                                        <div
                                          key={outcome.id}
                                          className="flex items-center justify-between p-2 text-sm"
                                          data-testid={`outcome-${outcome.id}`}
                                        >
                                          <div className="flex items-center space-x-2 flex-1">
                                            {outcome.status === 'achieved' ? (
                                              <CheckCircle className="w-3 h-3 text-green-600" />
                                            ) : (
                                              <Clock className="w-3 h-3 text-gray-400" />
                                            )}
                                            <span className={outcome.status === 'achieved' ? 'text-gray-500 line-through' : ''}>
                                              {outcome.title}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-500">
                                              {format(new Date(outcome.targetDate), 'MMM dd')}
                                            </span>
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
function TimelineRiskReport({ strategies, tactics, outcomes, getRiskLevel, getRiskBadge }: any) {
  const overdueTactics = tactics.filter((t: any) => {
    const dueDate = new Date(t.dueDate);
    return isPast(dueDate) && t.progress < 100;
  });

  const upcomingTactics = tactics.filter((t: any) => {
    const dueDate = new Date(t.dueDate);
    const daysUntilDue = differenceInDays(dueDate, new Date());
    return daysUntilDue >= 0 && daysUntilDue <= 30 && t.progress < 100;
  }).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="space-y-6">
      {/* Overdue Projects */}
      <Card data-testid="card-overdue-timeline">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <XCircle className="w-5 h-5 mr-2" />
            Overdue Projects ({overdueTactics.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueTactics.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500">No overdue projects</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueTactics.map((tactic: any) => {
                const strategy = strategies.find((s: any) => s.id === tactic.strategyId);
                const daysOverdue = differenceInDays(new Date(), new Date(tactic.dueDate));

                return (
                  <div
                    key={tactic.id}
                    className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20"
                    data-testid={`overdue-${tactic.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {strategy && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                        )}
                        <h4 className="font-semibold text-gray-900 dark:text-white">{tactic.title}</h4>
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
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Due: {format(new Date(tactic.dueDate), 'MMM dd, yyyy')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Progress value={tactic.progress || 0} className="w-32 h-2" />
                        <span className="text-sm font-medium">{tactic.progress || 0}%</span>
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
          {upcomingTactics.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming deadlines in the next 30 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTactics.map((tactic: any) => {
                const strategy = strategies.find((s: any) => s.id === tactic.strategyId);
                const daysUntilDue = differenceInDays(new Date(tactic.dueDate), new Date());
                const tacticRisk = getRiskLevel(tactic, 'tactic');

                return (
                  <div
                    key={tactic.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    data-testid={`upcoming-${tactic.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {strategy && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                        )}
                        <h4 className="font-semibold text-gray-900 dark:text-white">{tactic.title}</h4>
                      </div>
                      {getRiskBadge(tacticRisk)}
                    </div>
                    {strategy && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Strategy: {strategy.title}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Due in {daysUntilDue} days ({format(new Date(tactic.dueDate), 'MMM dd, yyyy')})
                      </span>
                      <div className="flex items-center space-x-2">
                        <Progress value={tactic.progress || 0} className="w-32 h-2" />
                        <span className="text-sm font-medium">{tactic.progress || 0}%</span>
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
function OwnershipReport({ tactics, outcomes, users, strategies }: any) {
  const userPerformance = users.map((user: any) => {
    const userTactics = tactics.filter((t: any) => t.assignedTo === user.id);
    const completedTactics = userTactics.filter((t: any) => t.progress >= 100).length;
    const inProgressTactics = userTactics.filter((t: any) => t.progress > 0 && t.progress < 100).length;
    const overdueTactics = userTactics.filter((t: any) => {
      const dueDate = new Date(t.dueDate);
      return isPast(dueDate) && t.progress < 100;
    }).length;

    const avgProgress = userTactics.length > 0
      ? Math.round(userTactics.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / userTactics.length)
      : 0;

    return {
      user,
      totalProjects: userTactics.length,
      completedProjects: completedTactics,
      inProgressProjects: inProgressTactics,
      overdueProjects: overdueTactics,
      avgProgress,
      tactics: userTactics,
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
              {perf.tactics.map((tactic: any) => {
                const strategy = strategies.find((s: any) => s.id === tactic.strategyId);
                const isOverdue = isPast(new Date(tactic.dueDate)) && tactic.progress < 100;

                return (
                  <div
                    key={tactic.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded"
                    data-testid={`user-tactic-${tactic.id}`}
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      {strategy && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: strategy.colorCode }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{tactic.title}</p>
                        <p className="text-xs text-gray-500">
                          Due: {format(new Date(tactic.dueDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Progress value={tactic.progress || 0} className="w-24 h-2" />
                      <span className="text-sm font-medium w-12">{tactic.progress || 0}%</span>
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
