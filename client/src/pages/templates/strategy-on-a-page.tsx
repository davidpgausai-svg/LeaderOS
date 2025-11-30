import { useState } from "react";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, FileText, Plus, X, Target, Compass, Flag, BarChart3, Rocket, AlertTriangle, PlayCircle } from "lucide-react";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

type Objective = {
  id: string;
  text: string;
  kpis: string[];
};

type Priority = {
  id: string;
  name: string;
  objectives: Objective[];
};

type Initiative = {
  id: string;
  name: string;
  priorityId: string;
};

type Risk = {
  id: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  likelihood: "High" | "Medium" | "Low";
  mitigation: string;
  contingency: string;
};

type StrategyData = {
  mission: string;
  vision: string;
  priorities: Priority[];
  initiatives: Initiative[];
  risks: Risk[];
};

const defaultData: StrategyData = {
  mission: "",
  vision: "",
  priorities: [
    { id: "1", name: "", objectives: [{ id: "1-1", text: "", kpis: [""] }] }
  ],
  initiatives: [{ id: "1", name: "", priorityId: "" }],
  risks: [{
    id: "1",
    description: "",
    impact: "Medium",
    likelihood: "Medium",
    mitigation: "",
    contingency: ""
  }]
};

export default function StrategyOnAPage() {
  const [data, setData] = useState<StrategyData>(defaultData);
  const { toast } = useToast();

  const addPriority = () => {
    if (data.priorities.length >= 5) {
      toast({
        title: "Maximum priorities reached",
        description: "Best practice recommends 3-5 strategic priorities.",
        variant: "destructive"
      });
      return;
    }
    const newId = Date.now().toString();
    setData(prev => ({
      ...prev,
      priorities: [...prev.priorities, {
        id: newId,
        name: "",
        objectives: [{ id: `${newId}-1`, text: "", kpis: [""] }]
      }]
    }));
  };

  const removePriority = (id: string) => {
    if (data.priorities.length <= 1) return;
    setData(prev => ({
      ...prev,
      priorities: prev.priorities.filter(p => p.id !== id)
    }));
  };

  const updatePriority = (id: string, name: string) => {
    setData(prev => ({
      ...prev,
      priorities: prev.priorities.map(p =>
        p.id === id ? { ...p, name } : p
      )
    }));
  };

  const addObjective = (priorityId: string) => {
    const newId = `${priorityId}-${Date.now()}`;
    setData(prev => ({
      ...prev,
      priorities: prev.priorities.map(p =>
        p.id === priorityId
          ? { ...p, objectives: [...p.objectives, { id: newId, text: "", kpis: [""] }] }
          : p
      )
    }));
  };

  const removeObjective = (priorityId: string, objectiveId: string) => {
    setData(prev => ({
      ...prev,
      priorities: prev.priorities.map(p =>
        p.id === priorityId
          ? { ...p, objectives: p.objectives.filter(o => o.id !== objectiveId) }
          : p
      )
    }));
  };

  const updateObjective = (priorityId: string, objectiveId: string, text: string) => {
    setData(prev => ({
      ...prev,
      priorities: prev.priorities.map(p =>
        p.id === priorityId
          ? {
              ...p,
              objectives: p.objectives.map(o =>
                o.id === objectiveId ? { ...o, text } : o
              )
            }
          : p
      )
    }));
  };

  const addKpi = (priorityId: string, objectiveId: string) => {
    setData(prev => ({
      ...prev,
      priorities: prev.priorities.map(p =>
        p.id === priorityId
          ? {
              ...p,
              objectives: p.objectives.map(o =>
                o.id === objectiveId ? { ...o, kpis: [...o.kpis, ""] } : o
              )
            }
          : p
      )
    }));
  };

  const removeKpi = (priorityId: string, objectiveId: string, kpiIndex: number) => {
    setData(prev => ({
      ...prev,
      priorities: prev.priorities.map(p =>
        p.id === priorityId
          ? {
              ...p,
              objectives: p.objectives.map(o =>
                o.id === objectiveId
                  ? { ...o, kpis: o.kpis.filter((_, i) => i !== kpiIndex) }
                  : o
              )
            }
          : p
      )
    }));
  };

  const updateKpi = (priorityId: string, objectiveId: string, kpiIndex: number, value: string) => {
    setData(prev => ({
      ...prev,
      priorities: prev.priorities.map(p =>
        p.id === priorityId
          ? {
              ...p,
              objectives: p.objectives.map(o =>
                o.id === objectiveId
                  ? { ...o, kpis: o.kpis.map((k, i) => i === kpiIndex ? value : k) }
                  : o
              )
            }
          : p
      )
    }));
  };

  const addInitiative = () => {
    setData(prev => ({
      ...prev,
      initiatives: [...prev.initiatives, { id: Date.now().toString(), name: "", priorityId: "" }]
    }));
  };

  const removeInitiative = (id: string) => {
    if (data.initiatives.length <= 1) return;
    setData(prev => ({
      ...prev,
      initiatives: prev.initiatives.filter(i => i.id !== id)
    }));
  };

  const updateInitiative = (id: string, field: keyof Initiative, value: string) => {
    setData(prev => ({
      ...prev,
      initiatives: prev.initiatives.map(i =>
        i.id === id ? { ...i, [field]: value } : i
      )
    }));
  };

  const addRisk = () => {
    setData(prev => ({
      ...prev,
      risks: [...prev.risks, {
        id: Date.now().toString(),
        description: "",
        impact: "Medium",
        likelihood: "Medium",
        mitigation: "",
        contingency: ""
      }]
    }));
  };

  const removeRisk = (id: string) => {
    if (data.risks.length <= 1) return;
    setData(prev => ({
      ...prev,
      risks: prev.risks.filter(r => r.id !== id)
    }));
  };

  const updateRisk = (id: string, field: keyof Risk, value: string) => {
    setData(prev => ({
      ...prev,
      risks: prev.risks.map(r =>
        r.id === id ? { ...r, [field]: value } : r
      )
    }));
  };

  const exportDocx = async () => {
    toast({ title: "Generating Word Doc...", description: "Please wait while we prepare your download." });
    
    try {
      const children: Paragraph[] = [
        new Paragraph({ text: "Strategy on a Page", heading: HeadingLevel.TITLE }),
        new Paragraph({ text: "" }),
        
        new Paragraph({ text: "Mission", heading: HeadingLevel.HEADING_1 }),
        new Paragraph(data.mission || "(Not specified)"),
        new Paragraph({ text: "" }),
        
        new Paragraph({ text: "Vision", heading: HeadingLevel.HEADING_1 }),
        new Paragraph(data.vision || "(Not specified)"),
        new Paragraph({ text: "" }),
        
        new Paragraph({ text: "Strategic Priorities", heading: HeadingLevel.HEADING_1 }),
      ];

      data.priorities.forEach((priority, pIndex) => {
        children.push(new Paragraph({
          text: `Priority ${pIndex + 1}: ${priority.name || "(Unnamed)"}`,
          heading: HeadingLevel.HEADING_2
        }));
        
        priority.objectives.forEach((obj, oIndex) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: `Objective ${oIndex + 1}: `, bold: true }), new TextRun(obj.text || "(Not specified)")]
          }));
          
          if (obj.kpis.filter(k => k.trim()).length > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: "KPIs:", italics: true })] }));
            obj.kpis.filter(k => k.trim()).forEach(kpi => {
              children.push(new Paragraph(`  • ${kpi}`));
            });
          }
        });
        children.push(new Paragraph({ text: "" }));
      });

      children.push(new Paragraph({ text: "Key Initiatives", heading: HeadingLevel.HEADING_1 }));
      data.initiatives.filter(i => i.name.trim()).forEach(initiative => {
        const linkedPriority = data.priorities.find(p => p.id === initiative.priorityId);
        children.push(new Paragraph(`• ${initiative.name}${linkedPriority?.name ? ` (${linkedPriority.name})` : ""}`));
      });
      children.push(new Paragraph({ text: "" }));

      children.push(new Paragraph({ text: "Risks & Mitigations", heading: HeadingLevel.HEADING_1 }));
      data.risks.filter(r => r.description.trim()).forEach((risk, index) => {
        children.push(new Paragraph({
          text: `Risk ${index + 1}: ${risk.description}`,
          heading: HeadingLevel.HEADING_2
        }));
        children.push(new Paragraph(`Impact: ${risk.impact} | Likelihood: ${risk.likelihood}`));
        if (risk.mitigation) children.push(new Paragraph(`Mitigation: ${risk.mitigation}`));
        if (risk.contingency) children.push(new Paragraph(`Contingency: ${risk.contingency}`));
        children.push(new Paragraph({ text: "" }));
      });

      children.push(new Paragraph({ 
        text: `Generated on ${new Date().toLocaleDateString()}`, 
      }));

      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const blob = await Packer.toBlob(doc);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Strategy-on-a-Page.docx";
      link.click();
      toast({ title: "Download Complete", className: "bg-green-600 text-white border-none" });
    } catch (err) {
      console.error("DOCX Export Error:", err);
      toast({ 
        title: "Export Failed", 
        description: "Could not generate Word document.", 
        variant: "destructive" 
      });
    }
  };

  const getSeverityColor = (level: "High" | "Medium" | "Low") => {
    switch (level) {
      case "High": return "text-red-600 dark:text-red-400";
      case "Medium": return "text-yellow-600 dark:text-yellow-400";
      case "Low": return "text-green-600 dark:text-green-400";
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/templates">
                <Button variant="ghost" size="sm" data-testid="button-soap-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Strategy on a Page</h1>
                <p className="text-gray-600 dark:text-gray-400">Enterprise Strategic Planning Framework</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-soap-tutorial">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Tutorial
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[640px]">
                  <DialogHeader>
                    <DialogTitle>Strategy on a Page Tutorial</DialogTitle>
                  </DialogHeader>
                  <div className="aspect-video flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Tutorial video coming soon</p>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={exportDocx} data-testid="button-soap-export-docx">
                <Download className="w-4 h-4 mr-2" />
                Download Word
              </Button>
            </div>
          </div>

          <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Compass className="w-5 h-5" />
                  Mission & Vision
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mission" className="text-sm font-medium">Mission Statement</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Why does the enterprise exist? What value does it bring?
                  </p>
                  <Textarea
                    id="mission"
                    value={data.mission}
                    onChange={(e) => setData(prev => ({ ...prev, mission: e.target.value }))}
                    placeholder="Enter your organization's mission statement..."
                    className="min-h-[80px]"
                    data-testid="input-soap-mission"
                  />
                </div>
                <div>
                  <Label htmlFor="vision" className="text-sm font-medium">Vision Statement</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Where must the organization be in 3-5 years?
                  </p>
                  <Textarea
                    id="vision"
                    value={data.vision}
                    onChange={(e) => setData(prev => ({ ...prev, vision: e.target.value }))}
                    placeholder="Enter your organization's vision statement..."
                    className="min-h-[80px]"
                    data-testid="input-soap-vision"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Flag className="w-5 h-5" />
                    Strategic Priorities ({data.priorities.length}/5)
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addPriority}
                    disabled={data.priorities.length >= 5}
                    data-testid="button-soap-add-priority"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Priority
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enterprise-level pillars (3-5) describing what must be achieved in 12-36 months
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {data.priorities.map((priority, pIndex) => (
                  <div key={priority.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-medium text-gray-500">Priority {pIndex + 1}</span>
                      <Input
                        value={priority.name}
                        onChange={(e) => updatePriority(priority.id, e.target.value)}
                        placeholder="e.g., Workforce & Culture, Digital Excellence"
                        className="flex-1"
                        data-testid={`input-soap-priority-${priority.id}`}
                      />
                      {data.priorities.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePriority(priority.id)}
                          data-testid={`button-soap-remove-priority-${priority.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4 ml-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-gray-600 dark:text-gray-400">Objectives & KPIs</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addObjective(priority.id)}
                          data-testid={`button-soap-add-objective-${priority.id}`}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Objective
                        </Button>
                      </div>

                      {priority.objectives.map((objective, oIndex) => (
                        <div key={objective.id} className="p-3 border rounded bg-white dark:bg-gray-900">
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-gray-400 mt-2">{oIndex + 1}.</span>
                            <div className="flex-1 space-y-2">
                              <Input
                                value={objective.text}
                                onChange={(e) => updateObjective(priority.id, objective.id, e.target.value)}
                                placeholder="Achieve ___ by ___ so that ___"
                                data-testid={`input-soap-objective-${objective.id}`}
                              />
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs text-gray-500">
                                    <BarChart3 className="w-3 h-3 inline mr-1" />
                                    Success Metrics / KPIs
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => addKpi(priority.id, objective.id)}
                                    data-testid={`button-soap-add-kpi-${objective.id}`}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                {objective.kpis.map((kpi, kIndex) => (
                                  <div key={kIndex} className="flex items-center gap-1">
                                    <Input
                                      value={kpi}
                                      onChange={(e) => updateKpi(priority.id, objective.id, kIndex, e.target.value)}
                                      placeholder="e.g., Net Patient Revenue per Case Mix"
                                      className="text-sm h-8"
                                      data-testid={`input-soap-kpi-${objective.id}-${kIndex}`}
                                    />
                                    {objective.kpis.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => removeKpi(priority.id, objective.id, kIndex)}
                                        data-testid={`button-soap-remove-kpi-${objective.id}-${kIndex}`}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            {priority.objectives.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeObjective(priority.id, objective.id)}
                                data-testid={`button-soap-remove-objective-${objective.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <Rocket className="w-5 h-5" />
                    Key Initiatives
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addInitiative}
                    data-testid="button-soap-add-initiative"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Initiative
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Strategic investments, programs, or multi-step projects required to achieve objectives
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.initiatives.map((initiative, index) => (
                  <div key={initiative.id} className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 w-6">{index + 1}.</span>
                    <Input
                      value={initiative.name}
                      onChange={(e) => updateInitiative(initiative.id, "name", e.target.value)}
                      placeholder="Initiative name"
                      className="flex-1"
                      data-testid={`input-soap-initiative-${initiative.id}`}
                    />
                    <Select
                      value={initiative.priorityId}
                      onValueChange={(value) => updateInitiative(initiative.id, "priorityId", value)}
                    >
                      <SelectTrigger className="w-[180px]" data-testid={`select-soap-initiative-priority-${initiative.id}`}>
                        <SelectValue placeholder="Link to Priority">
                          {data.priorities.find(p => p.id === initiative.priorityId)?.name || "Link to Priority"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {data.priorities.filter(p => p.name.trim()).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {data.initiatives.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInitiative(initiative.id)}
                        data-testid={`button-soap-remove-initiative-${initiative.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="w-5 h-5" />
                    Risks & Mitigations
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addRisk}
                    data-testid="button-soap-add-risk"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Risk
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Strategic risks that could compromise the plan
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.risks.map((risk, index) => (
                  <div key={risk.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Risk {index + 1}</span>
                      {data.risks.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRisk(risk.id)}
                          data-testid={`button-soap-remove-risk-${risk.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={risk.description}
                          onChange={(e) => updateRisk(risk.id, "description", e.target.value)}
                          placeholder="Describe the risk..."
                          className="min-h-[60px]"
                          data-testid={`input-soap-risk-desc-${risk.id}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Impact</Label>
                          <Select
                            value={risk.impact}
                            onValueChange={(value) => updateRisk(risk.id, "impact", value)}
                          >
                            <SelectTrigger data-testid={`select-soap-risk-impact-${risk.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High"><span className="text-red-600">High</span></SelectItem>
                              <SelectItem value="Medium"><span className="text-yellow-600">Medium</span></SelectItem>
                              <SelectItem value="Low"><span className="text-green-600">Low</span></SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Likelihood</Label>
                          <Select
                            value={risk.likelihood}
                            onValueChange={(value) => updateRisk(risk.id, "likelihood", value)}
                          >
                            <SelectTrigger data-testid={`select-soap-risk-likelihood-${risk.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High"><span className="text-red-600">High</span></SelectItem>
                              <SelectItem value="Medium"><span className="text-yellow-600">Medium</span></SelectItem>
                              <SelectItem value="Low"><span className="text-green-600">Low</span></SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Mitigation Strategy</Label>
                        <Input
                          value={risk.mitigation}
                          onChange={(e) => updateRisk(risk.id, "mitigation", e.target.value)}
                          placeholder="How will this risk be mitigated?"
                          data-testid={`input-soap-risk-mitigation-${risk.id}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Contingency Trigger</Label>
                        <Input
                          value={risk.contingency}
                          onChange={(e) => updateRisk(risk.id, "contingency", e.target.value)}
                          placeholder="When should contingency plans activate?"
                          data-testid={`input-soap-risk-contingency-${risk.id}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
