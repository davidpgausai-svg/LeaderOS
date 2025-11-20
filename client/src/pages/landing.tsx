import { Button } from "@/components/ui/button";
import { Target, CheckSquare, TrendingUp, BarChart3 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: Target,
      title: "Strategy Management",
      description: "Create and track high-level organizational strategies with Change Continuum framework"
    },
    {
      icon: CheckSquare,
      title: "Project Execution",
      description: "Manage projects with milestones, assignments, and automated progress tracking"
    },
    {
      icon: TrendingUp,
      title: "Action Tracking",
      description: "Monitor deliverables and outcomes with real-time status updates"
    },
    {
      icon: BarChart3,
      title: "Comprehensive Reports",
      description: "Generate insights with timeline views and performance analytics"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Planner</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Strategic Planning Platform
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Align your organization's strategies, projects, and actions with a comprehensive planning and execution platform
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
            Sign in with your Replit account to access the strategic planning platform
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="text-lg px-8 py-6"
            data-testid="button-login"
          >
            Sign In with Replit
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Executive Planner - Strategic planning for organizational excellence
          </p>
        </div>
      </footer>
    </div>
  );
}