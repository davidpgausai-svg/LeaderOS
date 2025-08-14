import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { MetricCard } from "@/components/cards/metric-card";
import { FrameworkCard } from "@/components/strategic-framework/framework-card";

import { CreateStrategyModal } from "@/components/modals/create-strategy-modal";
import { CreateTacticModal } from "@/components/modals/create-tactic-modal";
import { Button } from "@/components/ui/button";
import {
  Target,
  CheckSquare,
  TrendingUp,
  Users,
  Plus,
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

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: outcomes } = useQuery({
    queryKey: ["/api/outcomes"],
  });

  // Calculate metrics
  const activeStrategies = (strategies as any[])?.filter((s: any) => s.status === 'active').length || 0;
  const totalTactics = (tactics as any[])?.length || 0;
  const completedTactics = (tactics as any[])?.filter((t: any) => (t.progress || 0) >= 100).length || 0;
  const completedStrategies = (strategies as any[])?.filter((s: any) => s.status === 'completed').length || 0;
  const totalStrategies = (strategies as any[])?.length || 0;
  
  // Calculate overall strategic completion rate (strategies + tactics combined)
  const totalItems = totalStrategies + totalTactics;
  const completedItems = completedStrategies + completedTactics;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (strategiesLoading || tacticsLoading) {
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Strategic Dashboard (FY26 - FY30)</h1>
              <p className="text-gray-600 dark:text-gray-400">Strategic Framework</p>
            </div>
            <div className="flex space-x-3">
              {currentRole === 'administrator' && (
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
                title="Completion Rate"
                value={`${completionRate}%`}
                change={{ value: `${completedItems}/${totalItems}`, label: "overall progress", trend: "neutral" }}
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

              </div>

              {/* Strategy Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {(strategies as any[])?.map((strategy) => {
                  const strategyTactics = (tactics as any[])?.filter(t => t.strategyId === strategy.id) || [];
                  const strategyOutcomes = (outcomes as any[])?.filter(o => o.strategyId === strategy.id) || [];
                  
                  // Calculate actual progress based on tactic progress values
                  const totalTacticProgress = strategyTactics.reduce((sum, tactic) => sum + (tactic.progress || 0), 0);
                  const averageProgress = strategyTactics.length > 0 ? Math.round(totalTacticProgress / strategyTactics.length) : 0;
                  
                  return (
                    <FrameworkCard
                      key={strategy.id}
                      title={strategy.title.toUpperCase()}
                      goal={strategy.goal || strategy.description}
                      description={strategy.description}
                      tactics={strategyTactics}
                      outcomes={strategyOutcomes}
                      colorCode={strategy.colorCode || "#3B82F6"}
                      icon={<Target className="w-5 h-5" />}
                      status={strategy.status}
                      actualProgress={averageProgress}
                    />
                  );
                })}
              </div>
            </div>


          </div>
        </main>
      </div>
      <CreateStrategyModal 
        open={isCreateStrategyOpen} 
        onOpenChange={setIsCreateStrategyOpen} 
      />
      <CreateTacticModal 
        isOpen={isCreateTacticOpen} 
        onClose={() => setIsCreateTacticOpen(false)} 
      />
    </div>
  );
}