import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { MetricCard } from "@/components/cards/metric-card";
import { FrameworkCard } from "@/components/strategic-framework/framework-card";
import { ActivityFeed } from "@/components/lists/activity-feed";
import { CreateStrategyModal } from "@/components/modals/create-strategy-modal";
import { CreateTacticModal } from "@/components/modals/create-tactic-modal";
import { Button } from "@/components/ui/button";
import {
  Target,
  CheckSquare,
  TrendingUp,
  Users,
  Plus,
  Download,
  BarChart3,
} from "lucide-react";

export default function Dashboard() {
  const { currentRole } = useRole();
  const [isCreateStrategyOpen, setIsCreateStrategyOpen] = useState(false);
  const [isCreateTacticOpen, setIsCreateTacticOpen] = useState(false);



  const { data: strategies, isLoading: strategiesLoading } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: tactics, isLoading: tacticsLoading } = useQuery({
    queryKey: ["/api/tactics"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/activities"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: outcomes } = useQuery({
    queryKey: ["/api/outcomes"],
  });

  // Calculate metrics
  const activeStrategies = (strategies as any[])?.filter((s: any) => s.status === 'active').length || 0;
  const totalTactics = (tactics as any[])?.length || 0;
  const completedTactics = (tactics as any[])?.filter((t: any) => t.status === 'completed').length || 0;
  const completionRate = totalTactics > 0 ? Math.round((completedTactics / totalTactics) * 100) : 0;

  // Enhance activities with users
  const activitiesWithUsers = (activities as any[])?.map((activity: any) => ({
    ...activity,
    user: (users as any[])?.find((user: any) => user.id === activity.userId)
  })) || [];

  if (strategiesLoading || tacticsLoading || activitiesLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Strategic Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Organizational Strategic Framework & Performance Overview</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              {currentRole === 'admin' && (
                <Button onClick={() => setIsCreateStrategyOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Strategy
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Active Strategies"
                value={activeStrategies}
                change={{ value: "+12%", label: "from last quarter", trend: "up" }}
                icon={Target}
                iconBgColor="bg-blue-100"
                iconColor="text-blue-600"
              />
              <MetricCard
                title="Total Tactics"
                value={totalTactics}
                change={{ value: "+8%", label: "from last month", trend: "up" }}
                icon={CheckSquare}
                iconBgColor="bg-green-100"
                iconColor="text-green-600"
              />
              <MetricCard
                title="Completion Rate"
                value={`${completionRate}%`}
                change={{ value: "+5%", label: "this quarter", trend: "up" }}
                icon={TrendingUp}
                iconBgColor="bg-purple-100"
                iconColor="text-purple-600"
              />
              <MetricCard
                title="Team Members"
                value={(users as any[])?.length || 0}
                change={{ value: "+3%", label: "this month", trend: "up" }}
                icon={Users}
                iconBgColor="bg-orange-100"
                iconColor="text-orange-600"
              />
            </div>

            {/* Strategies Overview Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Strategies Overview</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Current organizational strategies with tactics and outcomes tracking
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </div>

              {/* Strategy Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {(strategies as any[])?.map((strategy) => {
                  const strategyTactics = (tactics as any[])?.filter(t => t.strategyId === strategy.id) || [];
                  const strategyOutcomes = (outcomes as any[])?.filter(o => o.strategyId === strategy.id) || [];
                  
                  return (
                    <FrameworkCard
                      key={strategy.id}
                      title={strategy.title.toUpperCase()}
                      goal={strategy.goal || strategy.description}
                      description={strategy.description}
                      tactics={strategyTactics.map(t => t.title)}
                      outcomes={strategyOutcomes.map(o => o.title)}
                      colorCode={strategy.colorCode || "#3B82F6"}
                      icon={<Target className="w-5 h-5" />}
                      status={strategy.status}
                    />
                  );
                })}
              </div>
            </div>

            {/* Activity Feed and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <ActivityFeed activities={activitiesWithUsers} />
              </div>

              {/* Quick Actions Panel */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => setIsCreateStrategyOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Strategy
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => setIsCreateTacticOpen(true)}
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Add New Tactic
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Track New Outcome
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <CreateStrategyModal 
        isOpen={isCreateStrategyOpen} 
        onClose={() => setIsCreateStrategyOpen(false)} 
      />
      
      <CreateTacticModal 
        isOpen={isCreateTacticOpen} 
        onClose={() => setIsCreateTacticOpen(false)} 
      />
    </div>
  );
}