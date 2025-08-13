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
  Award,
  Heart,
  Shield,
  Sparkles,
  Settings,
} from "lucide-react";

export default function Dashboard() {
  const { currentRole } = useRole();
  const [isCreateStrategyOpen, setIsCreateStrategyOpen] = useState(false);
  const [isCreateTacticOpen, setIsCreateTacticOpen] = useState(false);

  // Strategic Framework Data based on your organizational framework
  const strategicFramework = [
    {
      title: "QUALITY",
      goal: "Deliver outstanding clinical care, research and education through continuous improvement and innovation.",
      description: "Achieve Exemplary Performance",
      icon: <Award className="w-5 h-5" />,
      colorCode: "#D4A574", // Gold/Bronze
      status: "Active",
      strategies: [
        "Establish clear performance measures across the full organizational spectrum",
        "Accelerate time to implementation for innovations and patient academic programs and clinical care",
        "Enhance reliability of care through use of best practices to reduce clinical variability",
        "Promote exceptional MU Health as an exemplary organization"
      ],
      outcomes: [
        "Improved Quality Metrics",
        "Research Excellence & Advancements", 
        "Educational Program Design",
        "Innovative Care Delivery Models",
        "Programs of Distinction",
        "Health Outcomes"
      ]
    },
    {
      title: "ENGAGEMENT",
      goal: "Attract, develop and retain a committed team.",
      description: "Cultivate an Inspirational Environment",
      icon: <Users className="w-5 h-5" />,
      colorCode: "#8DB4D2", // Blue
      status: "Active",
      strategies: [
        "Build a culture that encourages communication, improves patient satisfaction",
        "Modernize compensation and staffing models to be competitive",
        "Recognize, develop and retain talent",
        "Implement leadership development and succession planning programs",
        "Establish the systems and processes to improve growth and efficiency"
      ],
      outcomes: [
        "Recruitment and Retention",
        "Wellbeing",
        "Engagement",
        "Responsive Staffing"
      ]
    },
    {
      title: "SERVICE",
      goal: "Exceed expectations of those we serve.",
      description: "Deliver an Exceptional Experience", 
      icon: <Heart className="w-5 h-5" />,
      colorCode: "#A67C5A", // Brown
      status: "Active",
      strategies: [
        "Create a clear vision for the exemplary experience and service orientation",
        "Foster a collaborative, team-based approach that enhances the patient experience",
        "Transform the digital experience to be best-in-class, accessible and convenient",
        "Invest in infrastructure improvements that positively impact the overall experience and ease access"
      ],
      outcomes: [
        "Patient Experience",
        "Brand Perception/Patient Loyalty",
        "Learner, Clinician, Staff and Resident Experience",
        "Community Partnerships",
        "Access",
        "Hassle-Free Environment",
        "Enrollment/Success Rates"
      ]
    },
    {
      title: "STEWARDSHIP", 
      goal: "Create and maintain an aligned, efficient, and sustainable organization.",
      description: "Ensure Organizational Resilience and Success",
      icon: <Shield className="w-5 h-5" />,
      colorCode: "#B8860B", // Dark Golden Rod
      status: "Active", 
      strategies: [
        "Invest in the infrastructure required to support organizational growth",
        "Establish formal partnerships and align resources to ensure sustainable financial efficiency",
        "Align resources and enterprise to ensure value is realized",
        "Evolve financial strategies in new market financial strategies"
      ],
      outcomes: [
        "Philanthropic Metrics",
        "Focused Infrastructure Investment", 
        "Financial Performance"
      ]
    },
    {
      title: "GROWTH",
      goal: "Expand to meet the evolving healthcare needs of Missourians and beyond.",
      description: "Deepen and Broaden Our Impact",
      icon: <TrendingUp className="w-5 h-5" />,
      colorCode: "#4A90A4", // Steel Blue
      status: "Active",
      strategies: [
        "Develop a scalable framework to support healthcare facilities",
        "Strengthen and grow research and clinical excellence where our expertise yields",
        "Collaborate with organizations that share values to address gaps and expand access"
      ],
      outcomes: [
        "Market Share",
        "Clinical Trials",
        "Publications", 
        "Research Expenditures",
        "Size and Number of Training Programs",
        "International Collaboration",
        "Intentional Expansion"
      ]
    }
  ];

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

  // Calculate metrics
  const activeStrategies = (strategies as any[])?.filter((s: any) => s.status === 'active').length || 0;
  const totalTactics = (tactics as any[])?.length || 0;
  const completedTactics = (tactics as any[])?.filter((t: any) => t.status === 'completed').length || 0;
  const completionRate = totalTactics > 0 ? Math.round((completedTactics / totalTactics) * 100) : 0;

  // Enhance strategies with tactics
  const strategiesWithTactics = (strategies as any[])?.map((strategy: any) => ({
    ...strategy,
    tactics: (tactics as any[])?.filter((tactic: any) => tactic.strategyId === strategy.id) || []
  })) || [];

  // Enhance activities with users
  const activitiesWithUsers = (activities as any[])?.map((activity: any) => ({
    ...activity,
    user: (users as any[])?.find((user: any) => user.id === activity.userId)
  })) || [];

  if (strategiesLoading || tacticsLoading || activitiesLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentRole === 'executive' ? 'Executive Dashboard' : 'Leader Dashboard'}
              </h2>
              <p className="text-gray-600 mt-1">
                {currentRole === 'executive' 
                  ? 'Manage strategies and track organizational alignment'
                  : 'View assigned strategies and track progress'
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {currentRole === 'executive' && (
                <Button onClick={() => setIsCreateStrategyOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Strategy
                </Button>
              )}
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Active Strategies"
              value={activeStrategies}
              change={{ value: "+8.2%", label: "from last quarter", trend: "up" }}
              icon={Target}
              iconBgColor="bg-blue-100"
              iconColor="text-blue-600"
            />
            <MetricCard
              title="Total Tactics"
              value={totalTactics}
              change={{ value: "+15.3%", label: "from last month", trend: "up" }}
              icon={CheckSquare}
              iconBgColor="bg-green-100"
              iconColor="text-green-600"
            />
            <MetricCard
              title="Completion Rate"
              value={`${completionRate}%`}
              change={{ value: "+5.1%", label: "this quarter", trend: "up" }}
              icon={TrendingUp}
              iconBgColor="bg-yellow-100"
              iconColor="text-yellow-600"
            />
            <MetricCard
              title="Team Alignment"
              value="92%"
              change={{ value: "+2.8%", label: "this month", trend: "up" }}
              icon={Users}
              iconBgColor="bg-purple-100"
              iconColor="text-purple-600"
            />
          </div>

          {/* Strategy Overview Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Strategies List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Active Strategies</h3>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {strategiesWithTactics.slice(0, 5).map((strategy) => (
                  <StrategyCard key={strategy.id} strategy={strategy} />
                ))}
              </div>
            </div>

            {/* Strategy Flow Visualization */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Strategy Flow</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Hierarchical view of strategies and tactics
                </p>
              </div>
              <div className="p-6">
                <StrategyFlow strategies={strategiesWithTactics} />
              </div>
            </div>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                <ActivityFeed activities={activitiesWithUsers} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                {currentRole === 'executive' && (
                  <Button
                    className="w-full justify-start"
                    onClick={() => setIsCreateStrategyOpen(true)}
                  >
                    <Target className="mr-3 h-4 w-4" />
                    Create Strategy
                  </Button>
                )}
                <Button
                  className="w-full justify-start"
                  variant="secondary"
                  onClick={() => setIsCreateTacticOpen(true)}
                >
                  <CheckSquare className="mr-3 h-4 w-4" />
                  Assign Tactic
                </Button>
                <Button className="w-full justify-start" variant="secondary">
                  <BarChart3 className="mr-3 h-4 w-4" />
                  View Reports
                </Button>
                <Button className="w-full justify-start" variant="secondary">
                  <Users className="mr-3 h-4 w-4" />
                  Manage Team
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CreateStrategyModal
        open={isCreateStrategyOpen}
        onOpenChange={setIsCreateStrategyOpen}
      />
      <CreateTacticModal
        open={isCreateTacticOpen}
        onOpenChange={setIsCreateTacticOpen}
      />
    </div>
  );
}
