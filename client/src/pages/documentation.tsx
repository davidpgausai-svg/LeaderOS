import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChartLine, 
  Target, 
  CheckSquare, 
  TrendingUp, 
  Calendar, 
  PenLine, 
  BarChart3, 
  Settings,
  BookOpen,
  Video,
  FileText,
} from "lucide-react";

export default function Documentation() {
  const [activeTab, setActiveTab] = useState("overview");

  const sections = [
    { id: "overview", name: "Overview", icon: BookOpen },
    { id: "dashboard", name: "Dashboard", icon: ChartLine },
    { id: "strategies", name: "Strategies", icon: Target },
    { id: "projects", name: "Projects", icon: CheckSquare },
    { id: "actions", name: "Actions", icon: TrendingUp },
    { id: "timeline", name: "Timeline", icon: Calendar },
    { id: "meeting-notes", name: "Meeting Notes", icon: PenLine },
    { id: "reports", name: "Reports", icon: BarChart3 },
    { id: "settings", name: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-primary mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-documentation-header">
                Documentation
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Learn how to use StrategicFlow effectively
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto mb-6">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger 
                    key={section.id} 
                    value={section.id}
                    className="flex items-center"
                    data-testid={`tab-${section.id}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {section.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Welcome to StrategicFlow
                  </CardTitle>
                  <CardDescription>
                    A comprehensive strategic planning platform for organizational excellence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <p>
                      StrategicFlow helps your organization manage strategic initiatives from high-level strategies
                      down to actionable tasks. This documentation will guide you through all features and capabilities.
                    </p>
                    
                    <h3 className="text-lg font-semibold mt-6 mb-3">Getting Started</h3>
                    <p>
                      Use the tabs above to navigate to specific sections, or browse through each section sequentially
                      to learn about all features.
                    </p>

                    <div className="mt-4 rounded-lg overflow-hidden">
                      <iframe
                        style={{ width: '100%', height: '500px', border: 'none' }}
                        src="https://www.canva.com/design/DAG5qUBx5pc/WHjTeHjS3Hyp34uEj8O8Rw/watch?utm_content=DAG5qUBx5pc&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h4e0992992d"
                        allowFullScreen
                        loading="lazy"
                        title="Getting Started Video"
                      ></iframe>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ChartLine className="w-5 h-5 mr-2" />
                    Dashboard Guide
                  </CardTitle>
                  <CardDescription>
                    Understanding your strategic overview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <h3 className="text-lg font-semibold">Overview</h3>
                    <p>
                      The Dashboard provides a high-level view of all your strategic initiatives, showing progress,
                      upcoming milestones, and areas that need attention.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        📝 Add your custom content here: Explain dashboard widgets, metrics, and how to interpret the data.
                        Include screenshots, video tutorials, or step-by-step walkthroughs.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Strategies Tab */}
            <TabsContent value="strategies" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Strategies Guide
                  </CardTitle>
                  <CardDescription>
                    Managing high-level strategic objectives
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <h3 className="text-lg font-semibold">Creating and Managing Strategies</h3>
                    <p>
                      Strategies represent your organization's high-level objectives. Learn how to create, edit,
                      and track progress on your strategic initiatives.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        📝 Add your custom content here: Document how to create strategies, assign owners,
                        set target dates, and use the Change Continuum Framework fields.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckSquare className="w-5 h-5 mr-2" />
                    Projects Guide
                  </CardTitle>
                  <CardDescription>
                    Breaking down strategies into executable projects
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <h3 className="text-lg font-semibold">Project Management</h3>
                    <p>
                      Projects are the tactical implementations of your strategies. Learn how to create projects,
                      assign accountable leaders, and track progress.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        📝 Add your custom content here: Explain project creation, accountable leaders, barriers,
                        communication URLs, and how projects roll up to strategies.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Actions Guide
                  </CardTitle>
                  <CardDescription>
                    Managing individual tasks and action items
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <h3 className="text-lg font-semibold">Action Management</h3>
                    <p>
                      Actions are the specific tasks that need to be completed. Learn how to create actions,
                      set targets, update status, and track completion.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        📝 Add your custom content here: Document action statuses (in progress, achieved, blocked),
                        target values, measurement units, and quick status updates.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Timeline Guide
                  </CardTitle>
                  <CardDescription>
                    Visualizing your strategic roadmap
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <h3 className="text-lg font-semibold">Timeline Visualization</h3>
                    <p>
                      The Timeline provides a Gantt-style view of all strategies, projects, and actions,
                      helping you see dependencies and identify scheduling conflicts.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        📝 Add your custom content here: Explain how to read the timeline, filter by strategy,
                        navigate dates, and interpret the "today" indicator and completion metrics.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Meeting Notes Tab */}
            <TabsContent value="meeting-notes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PenLine className="w-5 h-5 mr-2" />
                    Meeting Notes Guide
                  </CardTitle>
                  <CardDescription>
                    Creating report-out meeting documentation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <h3 className="text-lg font-semibold">Meeting Notes & Reports</h3>
                    <p>
                      Create structured meeting notes with dynamic project and action selection,
                      then export to PDF for distribution.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        📝 Add your custom content here: Document how to create meeting notes, select specific
                        projects/actions to include, add notes, and export to PDF.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Reports & Analytics Guide
                  </CardTitle>
                  <CardDescription>
                    Understanding performance metrics and insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <h3 className="text-lg font-semibold">Reports & Analytics</h3>
                    <p>
                      Access comprehensive reports including Strategy Health, Timeline Risk, and Ownership views
                      to track organizational performance.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        📝 Add your custom content here: Explain the three report tabs (Strategy Health, Timeline Risk,
                        Ownership), how risk levels are calculated, and how to export reports.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Settings Guide
                  </CardTitle>
                  <CardDescription>
                    Configuring users, permissions, and system settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <h3 className="text-lg font-semibold">Settings & Administration</h3>
                    <p>
                      Manage users, assign roles, configure strategy access, and set organizational preferences
                      like timezone settings.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        📝 Add your custom content here: Document user roles (Administrator, Co-Lead, View, SME),
                        strategy assignments, timezone settings, and permission levels.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
