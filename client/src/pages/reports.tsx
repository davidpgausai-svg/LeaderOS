import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { ActivityFeed } from "@/components/lists/activity-feed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Target,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

export default function Reports() {
  const { currentRole } = useRole();
  const [reportType, setReportType] = useState("overview");

  const { data: strategies, isLoading: strategiesLoading } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: tactics, isLoading: tacticsLoading } = useQuery({
    queryKey: ["/api/tactics"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: activities } = useQuery({
    queryKey: ["/api/activities"],
  });

  // Enhance activities with users for change log
  const activitiesWithUsers = (activities as any[])?.map((activity: any) => ({
    ...activity,
    user: (users as any[])?.find((user: any) => user.id === activity.userId)
  })) || [];

  // Enhance data for reporting
  const strategiesWithTactics = (strategies as any[])?.map((strategy: any) => ({
    ...strategy,
    tactics: (tactics as any[])?.filter((tactic: any) => tactic.strategyId === strategy.id) || []
  })) || [];

  const tacticsWithDetails = (tactics as any[])?.map((tactic: any) => ({
    ...tactic,
    strategy: (strategies as any[])?.find((s: any) => s.id === tactic.strategyId),
    assignee: (users as any[])?.find((u: any) => u.id === tactic.assignedTo),
  })) || [];

  // Calculate key metrics
  const totalStrategies = (strategies as any[])?.length || 0;
  const activeStrategies = (strategies as any[])?.filter((s: any) => s.status === 'active').length || 0;
  const completedStrategies = (strategies as any[])?.filter((s: any) => s.status === 'completed').length || 0;
  
  const totalTactics = (tactics as any[])?.length || 0;
  const completedTactics = (tactics as any[])?.filter((t: any) => (t.progress || 0) >= 100).length || 0;
  const inProgressTactics = (tactics as any[])?.filter((t: any) => (t.progress || 0) > 0 && (t.progress || 0) < 100).length || 0;
  const overdueTactics = (tactics as any[])?.filter((t: any) => {
    if ((t.progress || 0) >= 100) return false;
    return new Date(t.dueDate) < new Date();
  }).length || 0;

  // Calculate overall completion rate to match dashboard (strategies + tactics combined)
  const totalItems = totalStrategies + totalTactics;
  const completedItems = completedStrategies + completedTactics;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Team performance metrics
  const teamPerformance = (users as any[])?.map((user: any) => {
    const assignedTactics = tacticsWithDetails.filter(t => t.assignedTo === user.id);
    const completedCount = assignedTactics.filter(t => (t.progress || 0) >= 100).length;
    const totalCount = assignedTactics.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    return {
      ...user,
      assignedTactics: totalCount,
      completedTactics: completedCount,
      completionRate
    };
  }) || [];

  // Strategy progress breakdown
  const strategyProgress = strategiesWithTactics.map((strategy: any) => {
    const completed = strategy.tactics.filter((t: any) => (t.progress || 0) >= 100).length;
    const total = strategy.tactics.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      ...strategy,
      completedTactics: completed,
      totalTactics: total,
      progress
    };
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (strategiesLoading || tacticsLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Strategic planning performance and insights
              </p>
            </div>
            <div className="flex items-center">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="changelog">Change Log</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {reportType === 'changelog' ? (
            // Change Log Report
            <Card data-testid="card-change-log">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Change Log
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track all strategic framework activities and changes
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activitiesWithUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">No activity yet</h3>
                      <p className="text-gray-500">Activities will appear here as changes are made to strategies and tactics.</p>
                    </div>
                  ) : (
                    <ActivityFeed activities={activitiesWithUsers} />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Key Metrics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="card-total-strategies">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Strategies</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-strategies">{totalStrategies}</div>
                <div className="text-xs text-green-600 mt-1">
                  +{activeStrategies} active
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-completion-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-completion-rate">{completionRate}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {completedTactics}/{totalTactics} tactics
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-active-tactics">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tactics</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-tactics">{inProgressTactics}</div>
                <div className="text-xs text-blue-600 mt-1">
                  In progress
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-overdue-tactics">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-overdue-tactics">{overdueTactics}</div>
                <div className="text-xs text-red-600 mt-1">
                  Need attention
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strategy Progress Overview */}
          <Card data-testid="card-strategy-progress">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Strategy Progress Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategyProgress.slice(0, 5).map((strategy: any) => (
                  <div key={strategy.id} className="space-y-2" data-testid={`strategy-progress-${strategy.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm" data-testid="text-strategy-title">{strategy.title}</h4>
                        <p className="text-xs text-gray-500">
                          {strategy.completedTactics}/{strategy.totalTactics} tactics completed
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium" data-testid="text-progress-percentage">
                          {strategy.progress}%
                        </span>
                      </div>
                    </div>
                    <Progress value={strategy.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-team-performance">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamPerformance.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" 
                         data-testid={`team-member-${member.id}`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {member.initials}
                        </div>
                        <div>
                          <p className="font-medium text-sm" data-testid="text-member-name">{member.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium" data-testid="text-member-completion-rate">
                          {member.completionRate}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {member.completedTactics}/{member.assignedTactics} complete
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Summary */}
            <Card data-testid="card-recent-activity">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800 dark:text-green-200">Completed</span>
                    </div>
                    <span className="text-green-600 font-bold" data-testid="text-completed-count">
                      {completedTactics}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800 dark:text-blue-200">In Progress</span>
                    </div>
                    <span className="text-blue-600 font-bold" data-testid="text-in-progress-count">
                      {inProgressTactics}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium text-yellow-800 dark:text-yellow-200">Not Started</span>
                    </div>
                    <span className="text-yellow-600 font-bold" data-testid="text-not-started-count">
                      {totalTactics - completedTactics - inProgressTactics}
                    </span>
                  </div>

                  {overdueTactics > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="font-medium text-red-800 dark:text-red-200">Overdue</span>
                      </div>
                      <span className="text-red-600 font-bold" data-testid="text-overdue-count">
                        {overdueTactics}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Strategy Breakdown */}
          {currentRole === 'executive' && (
            <Card data-testid="card-detailed-breakdown">
              <CardHeader>
                <CardTitle>Detailed Strategy Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {strategiesWithTactics.map((strategy: any) => (
                    <div key={strategy.id} className="border-l-4 border-primary pl-4" data-testid={`detailed-strategy-${strategy.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold" data-testid="text-detailed-strategy-title">{strategy.title}</h4>
                        <Badge className={
                          strategy.status === 'completed' ? 'bg-green-100 text-green-800' :
                          strategy.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {strategy.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{strategy.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Start Date:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {new Date(strategy.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Target Date:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {new Date(strategy.targetDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Total Tactics:</span>
                          <p className="text-gray-600 dark:text-gray-400">{strategy.tactics.length}</p>
                        </div>
                        <div>
                          <span className="font-medium">Metrics:</span>
                          <p className="text-gray-600 dark:text-gray-400">{strategy.metrics}</p>
                        </div>
                      </div>
                      
                      {strategy.tactics.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium mb-2">Associated Tactics:</h5>
                          <div className="space-y-2">
                            {strategy.tactics.slice(0, 3).map((tactic: any) => (
                              <div key={tactic.id} className="flex items-center text-sm" data-testid={`tactic-${tactic.id}`}>
                                {getStatusIcon(tactic.status)}
                                <span className="ml-2 flex-1">{tactic.title}</span>
                                <span className="text-gray-500">{tactic.progress}%</span>
                              </div>
                            ))}
                            {strategy.tactics.length > 3 && (
                              <p className="text-xs text-gray-500 ml-6">
                                +{strategy.tactics.length - 3} more tactics
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}