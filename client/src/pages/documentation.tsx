import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
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

  const contentData: Record<string, { title: string; description: string; content: string; videoUrl: string }> = {
    overview: {
      title: "Welcome to LeaderOS",
      description: "A comprehensive strategic planning platform for organizational excellence",
      content: "LeaderOS helps your organization manage strategic initiatives from high-level strategies down to actionable tasks. This documentation will guide you through all features and capabilities.",
      videoUrl: "https://www.youtube.com/embed/Uz2lcXfsHRk?si=bPGnoiwdglqgTVn4"
    },
    dashboard: {
      title: "Dashboard",
      description: "Understanding your strategic overview",
      content: "The Dashboard provides a high-level view of all your strategic initiatives, showing progress, upcoming milestones, and areas that need attention.",
      videoUrl: "https://www.youtube.com/embed/XNjNo1RJGYA?si=zGP2JCxldQKjIbIB"
    },
    strategies: {
      title: "Strategies",
      description: "Managing high-level strategic objectives",
      content: "Strategies represent your organization's high-level objectives. Learn how to create, edit, and track progress on your strategic initiatives.",
      videoUrl: "https://www.youtube.com/embed/V58aAb34Gz0?si=_IBbkvmd5x1dKSwC"
    },
    projects: {
      title: "Projects",
      description: "Breaking down strategies into executable projects",
      content: "Projects are the tactical implementations of your strategies. Learn how to create projects, assign accountable leaders, and track progress.",
      videoUrl: "https://www.youtube.com/embed/qQyGC-Fk9fw?si=9PDl6m1_Pb9KUfjK"
    },
    actions: {
      title: "Actions",
      description: "Managing individual tasks and action items",
      content: "Actions are the specific tasks that need to be completed. Learn how to create actions, set targets, update status, and track completion.",
      videoUrl: "https://www.youtube.com/embed/p0OSu3rhiK0?si=Jzb-y06wdUSvO6Eg"
    },
    timeline: {
      title: "Timeline",
      description: "Visualizing your strategic roadmap",
      content: "The Timeline provides a Gantt-style view of all strategies, projects, and actions, helping you see dependencies and identify scheduling conflicts.",
      videoUrl: "https://www.youtube.com/embed/Wqi-d-nZiGM?si=woaOLQHQGQreaAIO"
    },
    "meeting-notes": {
      title: "Meeting Notes",
      description: "Creating report-out meeting documentation",
      content: "Create structured meeting notes with dynamic project and action selection, then export to PDF for distribution.",
      videoUrl: "https://www.youtube.com/embed/r9s2m2VpaDU?si=rdGgt6xDE22gJwav"
    },
    reports: {
      title: "Reports & Analytics",
      description: "Understanding performance metrics and insights",
      content: "Access comprehensive reports including Strategy Health, Timeline Risk, and Ownership views to track organizational performance.",
      videoUrl: "https://www.youtube.com/embed/whfqDz9hrOs?si=V0pXwxF-u-PEPCnC"
    },
    settings: {
      title: "Settings",
      description: "Configuring users, permissions, and system settings",
      content: "Manage users, assign roles, configure strategy access, and set organizational preferences like timezone settings.",
      videoUrl: "https://www.youtube.com/embed/whfqDz9hrOs?si=VU7vPSmRhA3eAkaF"
    }
  };

  const currentContent = contentData[activeTab] || contentData.overview;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F7' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Glassmorphism Header */}
        <header 
          className="sticky top-0 z-10 px-8 py-6 border-b"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#007AFF' }}
              >
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 
                  className="text-4xl font-bold tracking-tight"
                  style={{ color: '#1D1D1F' }}
                  data-testid="text-documentation-header"
                >
                  Documentation
                </h1>
                <p style={{ color: '#86868B' }} className="mt-1 text-lg">
                  Learn how to use LeaderOS effectively
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            {/* Tab Navigation - Pill Style */}
            <div 
              className="flex flex-wrap gap-2 mb-8 p-2 rounded-2xl"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
            >
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeTab === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm
                      transition-all duration-200 ease-out
                      ${isActive 
                        ? 'shadow-sm' 
                        : 'hover:bg-white/50'
                      }
                    `}
                    style={{
                      backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                      color: isActive ? '#007AFF' : '#86868B',
                    }}
                    data-testid={`tab-${section.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.name}
                  </button>
                );
              })}
            </div>

            {/* Content Card - High Border Radius */}
            <div 
              className="rounded-3xl p-8"
              style={{ 
                backgroundColor: '#FFFFFF',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
              }}
            >
              {/* Card Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  {(() => {
                    const section = sections.find(s => s.id === activeTab);
                    const Icon = section?.icon || BookOpen;
                    return (
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: '#007AFF' }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    );
                  })()}
                  <h2 
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: '#1D1D1F' }}
                  >
                    {currentContent.title}
                  </h2>
                </div>
                <p 
                  className="text-lg"
                  style={{ color: '#86868B' }}
                >
                  {currentContent.description}
                </p>
              </div>

              {/* Card Content */}
              <div className="space-y-8">
                <p 
                  className="text-lg leading-relaxed"
                  style={{ color: '#1D1D1F' }}
                >
                  {currentContent.content}
                </p>

                {activeTab === "overview" && (
                  <p style={{ color: '#86868B' }} className="text-base">
                    Use the tabs above to navigate to specific sections, or browse through each section sequentially to learn about all features.
                  </p>
                )}

                {/* Video Container */}
                <div 
                  className="rounded-2xl overflow-hidden"
                  style={{ 
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={currentContent.videoUrl}
                      title={`${currentContent.title} Video`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>

                {/* Settings Additional Content */}
                {activeTab === "settings" && (
                  <div className="space-y-8 pt-4">
                    <div 
                      className="rounded-2xl p-6"
                      style={{ backgroundColor: '#F5F5F7' }}
                    >
                      <h3 
                        className="text-xl font-semibold mb-3"
                        style={{ color: '#1D1D1F' }}
                      >
                        Settings Overview
                      </h3>
                      <p style={{ color: '#1D1D1F' }}>
                        The Settings module serves as the centralized command center for personal configuration, role management, strategic ordering, and security oversight.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        { title: "Profile", desc: "Update your personal information, role attributes, and identifiers." },
                        { title: "Notifications", desc: "Configure alert preferences for milestones, approvals, and activity." },
                        { title: "Appearance", desc: "Customize display mode, layout preferences, and visual settings." }
                      ].map((item) => (
                        <div 
                          key={item.title}
                          className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02]"
                          style={{ 
                            backgroundColor: '#FFFFFF',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                          }}
                        >
                          <h4 
                            className="font-semibold mb-2"
                            style={{ color: '#1D1D1F' }}
                          >
                            {item.title}
                          </h4>
                          <p 
                            className="text-sm"
                            style={{ color: '#86868B' }}
                          >
                            {item.desc}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div 
                      className="rounded-2xl p-6"
                      style={{ backgroundColor: '#F5F5F7' }}
                    >
                      <h3 
                        className="text-xl font-semibold mb-4"
                        style={{ color: '#1D1D1F' }}
                      >
                        Administrator Settings
                      </h3>
                      <p className="mb-4" style={{ color: '#1D1D1F' }}>
                        Administrators gain access to an elevated settings module designed for enterprise-level governance.
                      </p>
                      
                      <div className="space-y-3">
                        {[
                          { role: "Administrator", desc: "Full system governance including user provisioning and strategy creation." },
                          { role: "Co-Administrator", desc: "Same platform authorities as Administrators." },
                          { role: "Co-Lead", desc: "Create and manage Projects and Actions." },
                          { role: "SME", desc: "Tagging and attribution purposes only, no system access." }
                        ].map((role) => (
                          <div 
                            key={role.role}
                            className="flex items-start gap-3 p-3 rounded-xl"
                            style={{ backgroundColor: '#FFFFFF' }}
                          >
                            <span 
                              className="px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                              style={{ 
                                backgroundColor: '#007AFF',
                                color: '#FFFFFF'
                              }}
                            >
                              {role.role}
                            </span>
                            <p 
                              className="text-sm"
                              style={{ color: '#86868B' }}
                            >
                              {role.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p style={{ color: '#86868B' }} className="text-sm">
                Need more help? Contact your organization administrator.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
