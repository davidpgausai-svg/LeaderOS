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
  FileText,
  Presentation,
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
  pptUrl: string | null;
  wordUrl: string | null;
};

export default function CommunicationTemplates() {
  const { canEditTactics } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTacticId, setSelectedTacticId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [editedTemplates, setEditedTemplates] = useState<Record<string, CommunicationTemplate>>({});

  const { data: tactics, isLoading: tacticsLoading } = useQuery({
    queryKey: ["/api/tactics"],
  });

  const { data: strategies } = useQuery({
    queryKey: ["/api/strategies"],
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/communication-templates", selectedTacticId],
    enabled: !!selectedTacticId,
  });

  // Enhance tactics with strategy data
  const tacticsWithDetails = (tactics as Tactic[])?.map((tactic) => ({
    ...tactic,
    strategy: (strategies as Strategy[])?.find((s) => s.id === tactic.strategyId),
  })) || [];

  // Filter tactics
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
        description: "Communication template updated successfully",
      });
      setEditedTemplates({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update communication template",
        variant: "destructive",
      });
    },
  });

  const handleTemplateChange = (template: CommunicationTemplate, field: 'pptUrl' | 'wordUrl', value: string) => {
    setEditedTemplates(prev => ({
      ...prev,
      [template.id]: {
        ...template,
        ...prev[template.id],
        [field]: value || null,
      }
    }));
  };

  const handleSaveTemplate = (templateId: string) => {
    const edited = editedTemplates[templateId];
    if (edited) {
      updateTemplateMutation.mutate({
        id: templateId,
        updates: {
          pptUrl: edited.pptUrl,
          wordUrl: edited.wordUrl,
        }
      });
    }
  };

  const selectedTactic = tacticsWithDetails.find(t => t.id === selectedTacticId);
  const sortedTemplates = (templates as CommunicationTemplate[])?.sort((a, b) => a.milestoneNumber - b.milestoneNumber) || [];

  const canEdit = canEditTactics();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Communication Templates
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage PowerPoint and Word document templates for each project milestone
              </p>
            </div>

            {/* Project Selection Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Select Project
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filters */}
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

                {/* Project Selector */}
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

            {/* Templates Editor */}
            {selectedTacticId && selectedTactic && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: selectedTactic.strategy?.colorCode || "#3B82F6" }}
                        />
                        {selectedTactic.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        7 Milestones - Communication Templates
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {templatesLoading ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">Loading templates...</p>
                    </div>
                  ) : sortedTemplates.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">No templates found for this project.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {sortedTemplates.map((template) => {
                        const edited = editedTemplates[template.id] || template;
                        const hasChanges = !!editedTemplates[template.id];

                        return (
                          <div
                            key={template.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Milestone {template.milestoneNumber}
                              </h3>
                              {hasChanges && (
                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                  Unsaved Changes
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* PowerPoint URL */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                  <Presentation className="w-4 h-4 text-orange-500" />
                                  PowerPoint Template URL
                                </label>
                                <Input
                                  type="url"
                                  placeholder="https://..."
                                  value={edited.pptUrl || ""}
                                  onChange={(e) => handleTemplateChange(template, 'pptUrl', e.target.value)}
                                  disabled={!canEdit}
                                  data-testid={`input-ppt-${template.milestoneNumber}`}
                                />
                                {edited.pptUrl && (
                                  <a
                                    href={edited.pptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Open PowerPoint
                                  </a>
                                )}
                              </div>

                              {/* Word URL */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-blue-500" />
                                  Word Document URL
                                </label>
                                <Input
                                  type="url"
                                  placeholder="https://..."
                                  value={edited.wordUrl || ""}
                                  onChange={(e) => handleTemplateChange(template, 'wordUrl', e.target.value)}
                                  disabled={!canEdit}
                                  data-testid={`input-word-${template.milestoneNumber}`}
                                />
                                {edited.wordUrl && (
                                  <a
                                    href={edited.wordUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Open Word Document
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Save Button */}
                            {canEdit && hasChanges && (
                              <div className="flex justify-end pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveTemplate(template.id)}
                                  disabled={updateTemplateMutation.isPending}
                                  data-testid={`button-save-${template.milestoneNumber}`}
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  {updateTemplateMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!selectedTacticId && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Project Selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select a project above to manage its communication templates
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
