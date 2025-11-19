import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Link2,
  Save,
  Target,
  Search,
  ExternalLink
} from "lucide-react";

type Strategy = {
  id: string;
  title: string;
  colorCode: string;
};

type Tactic = {
  id: string;
  title: string;
  strategyId: string;
  status: string;
  isArchived?: string;
  strategy?: Strategy;
};

type CommunicationTemplate = {
  id: string;
  tacticId: string;
  milestoneNumber: number;
  templateUrl: string | null;
};

const MILESTONE_TITLES = [
  "Stakeholder & Readiness Assessment",
  "Executive Governance Review",
  "Directors Meeting Authorization",
  "Strategic Communication Deployment",
  "Staff Meetings & Huddles Activation",
  "Education & Enablement Completion",
  "Operational Feedback + Governance Close-Out"
];

export default function CommunicationTemplates() {
  const { canEditTactics } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTacticId, setSelectedTacticId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});

  const { data: tactics } = useQuery({
    queryKey: ["/api/tactics"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/communication-templates", selectedTacticId],
    enabled: !!selectedTacticId,
  });

  const tacticsWithDetails = (tactics as Tactic[])?.map((tactic) => ({
    ...tactic,
    strategy: (strategies as Strategy[])?.find((s) => s.id === tactic.strategyId),
  })) || [];

  const filteredTactics = tacticsWithDetails
    .filter(t => !t.isArchived || t.isArchived === "false")
    .filter((tactic) => {
      const matchesSearch = tactic.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStrategy = strategyFilter === "all" || tactic.strategyId === strategyFilter;
      return matchesSearch && matchesStrategy;
    });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/communication-templates/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communication-templates", selectedTacticId] });
      toast({
        title: "Success",
        description: "Template URL saved successfully",
      });
      setEditedUrls({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save template URL",
        variant: "destructive",
      });
    },
  });

  const handleUrlChange = (templateId: string, value: string) => {
    setEditedUrls(prev => ({
      ...prev,
      [templateId]: value,
    }));
  };

  const handleSaveUrl = (templateId: string, currentUrl: string | null) => {
    const newUrl = editedUrls[templateId] !== undefined ? editedUrls[templateId] : currentUrl;
    updateTemplateMutation.mutate({
      id: templateId,
      updates: {
        templateUrl: newUrl || null,
      }
    });
  };

  const selectedTactic = tacticsWithDetails.find(t => t.id === selectedTacticId);
  
  const templatesByMilestone = MILESTONE_TITLES.map((title, index) => {
    const milestoneNumber = index + 1;
    const template = (templates as CommunicationTemplate[])?.find(t => t.milestoneNumber === milestoneNumber);
    return {
      milestoneNumber,
      title,
      template,
    };
  });

  const canEdit = canEditTactics();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Communication Templates
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage hyperlinks to communication templates for each project milestone
              </p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Select Project
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-project"
                    />
                  </div>
                  <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                    <SelectTrigger className="w-full sm:w-64" data-testid="select-strategy-filter">
                      <SelectValue placeholder="Filter by strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Strategies</SelectItem>
                      {(strategies as Strategy[])?.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select value={selectedTacticId} onValueChange={setSelectedTacticId}>
                  <SelectTrigger data-testid="select-project">
                    <SelectValue placeholder="Choose a project to manage templates..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTactics.map((tactic) => (
                      <SelectItem key={tactic.id} value={tactic.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tactic.strategy?.colorCode || "#3B82F6" }}
                          />
                          <span>{tactic.title}</span>
                          <Badge variant="outline" className="ml-2">{tactic.strategy?.title}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedTacticId && selectedTactic && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedTactic.strategy?.colorCode || "#3B82F6" }}
                      />
                      {selectedTactic.title}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      7 Milestones - Template Links
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  {templatesLoading ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">Loading templates...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {templatesByMilestone.map(({ milestoneNumber, title, template }) => {
                        const currentUrl = template?.templateUrl || null;
                        const editedUrl = editedUrls[template?.id || ""];
                        const displayUrl = editedUrl !== undefined ? editedUrl : currentUrl;
                        const hasChanges = editedUrl !== undefined;

                        return (
                          <div
                            key={milestoneNumber}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                  Milestone {milestoneNumber}: {title}
                                </h3>
                                
                                <div className="space-y-2 mt-3">
                                  <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <Input
                                      type="url"
                                      placeholder="Enter template URL (e.g., https://docs.google.com/...)"
                                      value={displayUrl || ""}
                                      onChange={(e) => template && handleUrlChange(template.id, e.target.value)}
                                      disabled={!canEdit || !template}
                                      className="flex-1"
                                      data-testid={`input-url-${milestoneNumber}`}
                                    />
                                  </div>

                                  {displayUrl && (
                                    <a
                                      href={displayUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 ml-6"
                                      data-testid={`link-open-${milestoneNumber}`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Open Template
                                    </a>
                                  )}
                                </div>
                              </div>

                              {canEdit && template && hasChanges && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveUrl(template.id, currentUrl)}
                                  disabled={updateTemplateMutation.isPending}
                                  data-testid={`button-save-${milestoneNumber}`}
                                >
                                  <Save className="w-4 h-4 mr-1.5" />
                                  Save
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!selectedTacticId && (
              <div className="text-center py-12">
                <Link2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Project Selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select a project above to manage its communication template links
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
