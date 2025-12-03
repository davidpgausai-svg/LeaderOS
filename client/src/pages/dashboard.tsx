import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { MetricCard } from "@/components/cards/metric-card";
import { FrameworkCard } from "@/components/strategic-framework/framework-card";

import { CreateStrategyModal } from "@/components/modals/create-strategy-modal";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
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
  const { currentRole, canCreateStrategies } = useRole();
  const [isCreateStrategyOpen, setIsCreateStrategyOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);



  const { data: strategies, isLoading: strategiesLoading } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: actions } = useQuery({
    queryKey: ["/api/actions"],
  });

  // Calculate metrics
  const activeStrategies = (strategies as any[])?.filter((s: any) => s.status === 'active').length || 0;
  const totalProjects = (projects as any[])?.length || 0;
  const completedProjects = (projects as any[])?.filter((t: any) => (t.progress || 0) >= 100).length || 0;
  const completedStrategies = (strategies as any[])?.filter((s: any) => s.status === 'completed').length || 0;
  const totalStrategies = (strategies as any[])?.length || 0;
  
  // Calculate overall strategic completion rate (strategies + projects combined)
  const totalItems = totalStrategies + totalProjects;
  const completedItems = completedStrategies + completedProjects;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (strategiesLoading || projectsLoading) {
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
    <div className="flex h-screen bg-fog dark:bg-navy">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-navy-dark shadow-sm border-b border-fog-dark dark:border-graphite-dark px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy dark:text-white">Design the Strategy. Deliver the Outcomes.</h1>
            </div>
            <div className="flex space-x-3">
              {canCreateStrategies() && (
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
                iconBgColor="bg-teal/20"
                iconColor="text-teal"
              />

              <MetricCard
                title="Strategy & Project Completion"
                value={`${completionRate}%`}
                change={{ value: `${completedItems}/${totalItems}`, label: "strategies & projects", trend: "neutral" }}
                icon={TrendingUp}
                iconBgColor="bg-lime/20"
                iconColor="text-lime-dark"
              />
              <MetricCard
                title="Team Members"
                value={(users as any[])?.length || 0}
                change={{ value: "+3%", label: "this month", trend: "up" }}
                icon={Users}
                iconBgColor="bg-navy/10"
                iconColor="text-navy dark:text-teal-light"
              />
            </div>

            {/* Strategies Overview Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-navy dark:text-white">Strategies Overview</h2>
                  <p className="text-graphite dark:text-fog-dark mt-1">
                    Current organizational strategies with projects and actions tracking
                  </p>
                </div>

              </div>

              {/* Strategy Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {(strategies as any[])?.map((strategy) => {
                  const strategyProjects = (projects as any[])?.filter(t => t.strategyId === strategy.id) || [];
                  const strategyActions = (actions as any[])?.filter(o => o.strategyId === strategy.id) || [];
                  
                  // Calculate actual progress based on project progress values
                  const totalProjectProgress = strategyProjects.reduce((sum, project) => sum + (project.progress || 0), 0);
                  const averageProgress = strategyProjects.length > 0 ? Math.round(totalProjectProgress / strategyProjects.length) : 0;
                  
                  return (
                    <FrameworkCard
                      key={strategy.id}
                      strategyId={strategy.id}
                      title={strategy.title.toUpperCase()}
                      goal={strategy.goal || strategy.description}
                      description={strategy.description}
                      projects={strategyProjects}
                      actions={strategyActions}
                      colorCode={strategy.colorCode || "#3B82F6"}
                      icon={<Target className="w-5 h-5" />}
                      status={strategy.status}
                      actualProgress={averageProgress}
                      caseForChange={strategy.caseForChange}
                      visionStatement={strategy.visionStatement}
                      successMetrics={strategy.successMetrics}
                      stakeholderMap={strategy.stakeholderMap}
                      readinessRating={strategy.readinessRating}
                      riskExposureRating={strategy.riskExposureRating}
                      changeChampionAssignment={strategy.changeChampionAssignment}
                      reinforcementPlan={strategy.reinforcementPlan}
                      benefitsRealizationPlan={strategy.benefitsRealizationPlan}
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
      <CreateProjectModal 
        isOpen={isCreateProjectOpen} 
        onClose={() => setIsCreateProjectOpen(false)} 
      />
    </div>
  );
}