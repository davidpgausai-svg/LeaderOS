import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, ClipboardList, LayoutGrid, Clock, FileText, ChevronRight, FileSpreadsheet, Radar, Swords, Atom } from "lucide-react";
import type { TemplateType } from "@shared/schema";

type TemplateInfo = {
  id: string;
  title: string;
  description: string;
  icon: typeof Target;
  category: string;
  readTime: string;
  path: string;
  color: string;
};

const templates: TemplateInfo[] = [
  {
    id: "strategy-on-a-page",
    title: "Strategy on a Page",
    description: "Comprehensive enterprise framework with mission, vision, priorities, objectives, KPIs, initiatives, and risk management.",
    icon: FileSpreadsheet,
    category: "Strategic Planning",
    readTime: "10 min",
    path: "/templates/strategy-on-a-page",
    color: "text-indigo-600",
  },
  {
    id: "pestle",
    title: "PESTLE Analysis",
    description: "Evaluate Political, Economic, Social, Technological, Legal, and Environmental macro-factors affecting your strategy.",
    icon: Radar,
    category: "Strategic Planning",
    readTime: "15 min",
    path: "/templates/pestle",
    color: "text-teal-600",
  },
  {
    id: "porters-five-forces",
    title: "Porter's Five Forces",
    description: "Analyze competitive dynamics through New Entrants, Supplier Power, Buyer Power, Substitutes, and Rivalry to inform strategic positioning.",
    icon: Swords,
    category: "Strategic Planning",
    readTime: "15 min",
    path: "/templates/porters-five-forces",
    color: "text-rose-600",
  },
  {
    id: "swot",
    title: "SWOT Analysis",
    description: "Analyze strengths, weaknesses, opportunities, and threats to inform strategic decisions.",
    icon: Target,
    category: "Strategic Planning",
    readTime: "5 min",
    path: "/templates/swot",
    color: "text-green-600",
  },
  {
    id: "smart-goals",
    title: "SMART Goals",
    description: "Define Specific, Measurable, Achievable, Relevant, and Time-bound objectives for clarity and focus.",
    icon: ClipboardList,
    category: "Project Management",
    readTime: "4 min",
    path: "/templates/smart-goals",
    color: "text-blue-600",
  },
  {
    id: "eisenhower-matrix",
    title: "Eisenhower Matrix",
    description: "Prioritize tasks by urgency and importance to maximize productivity and focus on what matters.",
    icon: LayoutGrid,
    category: "Daily Tasks",
    readTime: "3 min",
    path: "/templates/eisenhower-matrix",
    color: "text-purple-600",
  },
  {
    id: "first-principles",
    title: "First Principles Thinking",
    description: "Elon Musk's framework for breakthrough problem-solving. Break problems to fundamentals and rebuild from truth.",
    icon: Atom,
    category: "Strategic Planning",
    readTime: "12 min",
    path: "/templates/first-principles",
    color: "text-cyan-600",
  },
];

const defaultCategories = ["All Templates", "Strategic Planning", "Project Management", "Daily Tasks"];

export default function Templates() {
  const [selectedCategory, setSelectedCategory] = useState("All Templates");

  const { data: customTemplateTypes = [] } = useQuery<TemplateType[]>({
    queryKey: ["/api/template-types"],
  });

  const allCategories = [
    ...defaultCategories,
    ...customTemplateTypes.map(t => t.name).filter(name => !defaultCategories.includes(name))
  ];

  const filteredTemplates = selectedCategory === "All Templates"
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header - Apple HIG Glassmorphism */}
        <header
          className="px-6 py-5 sticky top-0 z-10"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#5856D6' }}
              >
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>Templates</h1>
                <p style={{ color: '#86868B' }}>
                  Strategic planning, project management, and productivity frameworks
                </p>
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger 
                className="w-[200px] rounded-xl border-0" 
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}
                data-testid="select-template-category"
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {allCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Link key={template.id} href={template.path}>
                  <Card 
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg group h-full border-0 rounded-2xl"
                    style={{ 
                      backgroundColor: 'white',
                      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)'
                    }}
                    data-testid={`card-template-${template.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${template.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {template.category}
                        </span>
                      </div>
                      <CardTitle className="mt-4 text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                        {template.title}
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {template.readTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Interactive
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No templates found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                No templates match the selected category.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
