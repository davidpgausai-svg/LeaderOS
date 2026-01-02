import { useState } from "react";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Layers, Plus, Trash2, PlayCircle, Target, TrendingUp, Compass, BarChart3 } from "lucide-react";
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";

type Strategy = {
  id: string;
  name: string;
  measures: string[];
};

type Goal = {
  id: string;
  name: string;
  target: string;
};

type Initiative = {
  id: string;
  name: string;
  owner: string;
  timeline: string;
  linkedStrategy: string;
};

const defaultObjective = "Become the market leader in sustainable consumer products by 2027";

const defaultGoals: Goal[] = [
  { id: "1", name: "Increase market share", target: "35% market share by end of FY27" },
  { id: "2", name: "Improve customer satisfaction", target: "NPS score of 70+" },
  { id: "3", name: "Achieve carbon neutrality", target: "Net-zero operations by 2026" },
];

const defaultStrategies: Strategy[] = [
  { 
    id: "1", 
    name: "Product Innovation", 
    measures: ["Launch 5 new sustainable products per year", "R&D investment at 8% of revenue"] 
  },
  { 
    id: "2", 
    name: "Customer Experience Excellence", 
    measures: ["Response time under 2 hours", "First-contact resolution rate 85%+"] 
  },
  { 
    id: "3", 
    name: "Operational Sustainability", 
    measures: ["100% renewable energy in facilities", "50% reduction in packaging waste"] 
  },
];

const defaultInitiatives: Initiative[] = [
  { id: "1", name: "Green packaging redesign", owner: "Product Team", timeline: "Q2 2025", linkedStrategy: "Operational Sustainability" },
  { id: "2", name: "Customer portal upgrade", owner: "Digital Team", timeline: "Q3 2025", linkedStrategy: "Customer Experience Excellence" },
  { id: "3", name: "Bio-based materials R&D", owner: "Innovation Lab", timeline: "Q1-Q4 2025", linkedStrategy: "Product Innovation" },
];

export default function OgsmTemplate() {
  const [objective, setObjective] = useState(defaultObjective);
  const [goals, setGoals] = useState<Goal[]>(defaultGoals);
  const [strategies, setStrategies] = useState<Strategy[]>(defaultStrategies);
  const [initiatives, setInitiatives] = useState<Initiative[]>(defaultInitiatives);
  const { toast } = useToast();

  const addGoal = () => {
    setGoals([...goals, { id: Date.now().toString(), name: "", target: "" }]);
  };

  const updateGoal = (id: string, field: keyof Goal, value: string) => {
    setGoals(goals.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const addStrategy = () => {
    setStrategies([...strategies, { id: Date.now().toString(), name: "", measures: [""] }]);
  };

  const updateStrategy = (id: string, name: string) => {
    setStrategies(strategies.map(s => s.id === id ? { ...s, name } : s));
  };

  const removeStrategy = (id: string) => {
    setStrategies(strategies.filter(s => s.id !== id));
  };

  const addMeasure = (strategyId: string) => {
    setStrategies(strategies.map(s => 
      s.id === strategyId ? { ...s, measures: [...s.measures, ""] } : s
    ));
  };

  const updateMeasure = (strategyId: string, measureIndex: number, value: string) => {
    setStrategies(strategies.map(s => 
      s.id === strategyId 
        ? { ...s, measures: s.measures.map((m, i) => i === measureIndex ? value : m) }
        : s
    ));
  };

  const removeMeasure = (strategyId: string, measureIndex: number) => {
    setStrategies(strategies.map(s => 
      s.id === strategyId 
        ? { ...s, measures: s.measures.filter((_, i) => i !== measureIndex) }
        : s
    ));
  };

  const addInitiative = () => {
    setInitiatives([...initiatives, { id: Date.now().toString(), name: "", owner: "", timeline: "", linkedStrategy: "" }]);
  };

  const updateInitiative = (id: string, field: keyof Initiative, value: string) => {
    setInitiatives(initiatives.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeInitiative = (id: string) => {
    setInitiatives(initiatives.filter(i => i.id !== id));
  };

  const exportDocx = async () => {
    toast({ title: "Generating Word Doc...", description: "Please wait while we prepare your download." });

    try {
      const goalsContent = goals.map(g => 
        new Paragraph({ text: `• ${g.name}: ${g.target}`, spacing: { after: 100 } })
      );

      const strategiesContent: Paragraph[] = [];
      strategies.forEach(s => {
        strategiesContent.push(new Paragraph({ text: s.name, heading: HeadingLevel.HEADING_2 }));
        s.measures.forEach(m => {
          strategiesContent.push(new Paragraph({ text: `  • ${m}`, spacing: { after: 50 } }));
        });
        strategiesContent.push(new Paragraph({ text: "" }));
      });

      const initiativeRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Initiative", alignment: AlignmentType.CENTER })], width: { size: 30, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: "Owner", alignment: AlignmentType.CENTER })], width: { size: 20, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: "Timeline", alignment: AlignmentType.CENTER })], width: { size: 20, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: "Linked Strategy", alignment: AlignmentType.CENTER })], width: { size: 30, type: WidthType.PERCENTAGE } }),
          ],
        }),
        ...initiatives.map(i => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(i.name)] }),
            new TableCell({ children: [new Paragraph(i.owner)] }),
            new TableCell({ children: [new Paragraph(i.timeline)] }),
            new TableCell({ children: [new Paragraph(i.linkedStrategy)] }),
          ],
        })),
      ];

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: "OGSM Framework", heading: HeadingLevel.TITLE }),
            new Paragraph({ text: `Generated on ${new Date().toLocaleDateString()}`, spacing: { after: 400 } }),
            
            new Paragraph({ text: "Objective", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: objective, spacing: { after: 400 } }),
            
            new Paragraph({ text: "Goals", heading: HeadingLevel.HEADING_1 }),
            ...goalsContent,
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "Strategies & Measures", heading: HeadingLevel.HEADING_1 }),
            ...strategiesContent,
            
            new Paragraph({ text: "Initiative Backlog", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "" }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 },
              },
              rows: initiativeRows,
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "OGSM-Framework.docx";
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

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header
          className="px-6 py-5 sticky top-0 z-10"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/templates">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-templates">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#EA580C' }}
              >
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>OGSM Framework</h1>
                <p style={{ color: '#86868B' }}>
                  Objective, Goals, Strategies, Measures
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-ogsm-tutorial">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    About OGSM
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[640px]">
                  <DialogHeader>
                    <DialogTitle>About the OGSM Framework</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-gray-600">
                    <p>
                      <strong>OGSM</strong> (Objective, Goals, Strategies, Measures) is a strategic planning framework 
                      that turns broad objectives into measurable outcomes on a single page.
                    </p>
                    <div className="space-y-2">
                      <p><strong>O - Objective:</strong> The inspiring, qualitative vision you're working toward.</p>
                      <p><strong>G - Goals:</strong> 3-5 quantified targets that define success.</p>
                      <p><strong>S - Strategies:</strong> 3-7 strategic pillars or approaches to achieve goals.</p>
                      <p><strong>M - Measures:</strong> Specific KPIs for each strategy to track progress.</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Learn more at <a href="https://www.ogsm.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ogsm.com</a>
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={exportDocx} data-testid="button-export-docx">
                <Download className="w-4 h-4 mr-2" />
                Export Word
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <Card className="border-0 rounded-2xl border-l-4 border-l-orange-500" style={{ backgroundColor: 'white', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Target className="w-5 h-5" />
                  Objective
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Define your inspiring, qualitative objective..."
                  className="min-h-[80px] text-lg"
                  data-testid="input-objective"
                />
                <p className="text-xs text-gray-500 mt-2">
                  The single, inspiring statement that defines your strategic direction.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 rounded-2xl border-l-4 border-l-blue-500" style={{ backgroundColor: 'white', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                  Goals (3-5 quantified targets)
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addGoal} data-testid="button-add-goal">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Goal
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {goals.map((goal, idx) => (
                  <div key={goal.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl" data-testid={`goal-${idx}`}>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={goal.name}
                        onChange={(e) => updateGoal(goal.id, "name", e.target.value)}
                        placeholder="Goal name (e.g., Increase market share)"
                        className="font-medium"
                        data-testid={`input-goal-name-${idx}`}
                      />
                      <Input
                        value={goal.target}
                        onChange={(e) => updateGoal(goal.id, "target", e.target.value)}
                        placeholder="Quantified target (e.g., 35% by end of FY27)"
                        className="text-sm"
                        data-testid={`input-goal-target-${idx}`}
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeGoal(goal.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-remove-goal-${idx}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 rounded-2xl border-l-4 border-l-emerald-500" style={{ backgroundColor: 'white', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-emerald-600">
                  <Compass className="w-5 h-5" />
                  Strategies & Measures
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addStrategy} data-testid="button-add-strategy">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Strategy
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {strategies.map((strategy, sIdx) => (
                  <div key={strategy.id} className="p-4 bg-gray-50 rounded-xl" data-testid={`strategy-${sIdx}`}>
                    <div className="flex gap-3 items-center mb-3">
                      <Input
                        value={strategy.name}
                        onChange={(e) => updateStrategy(strategy.id, e.target.value)}
                        placeholder="Strategy name (e.g., Product Innovation)"
                        className="font-medium flex-1"
                        data-testid={`input-strategy-name-${sIdx}`}
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeStrategy(strategy.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-remove-strategy-${sIdx}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="pl-4 space-y-2">
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        Measures (KPIs)
                      </Label>
                      {strategy.measures.map((measure, mIdx) => (
                        <div key={mIdx} className="flex gap-2 items-center">
                          <Input
                            value={measure}
                            onChange={(e) => updateMeasure(strategy.id, mIdx, e.target.value)}
                            placeholder="KPI or measure (e.g., Launch 5 new products per year)"
                            className="text-sm"
                            data-testid={`input-measure-${sIdx}-${mIdx}`}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeMeasure(strategy.id, mIdx)}
                            className="text-gray-400 hover:text-red-500"
                            data-testid={`button-remove-measure-${sIdx}-${mIdx}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => addMeasure(strategy.id)}
                        className="text-emerald-600 text-xs"
                        data-testid={`button-add-measure-${sIdx}`}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Measure
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 rounded-2xl border-l-4 border-l-purple-500" style={{ backgroundColor: 'white', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Layers className="w-5 h-5" />
                  Initiative Backlog
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addInitiative} data-testid="button-add-initiative">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Initiative
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium text-gray-600">Initiative</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600">Owner</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600">Timeline</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600">Linked Strategy</th>
                        <th className="py-2 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {initiatives.map((initiative, idx) => (
                        <tr key={initiative.id} className="border-b hover:bg-gray-50" data-testid={`initiative-${idx}`}>
                          <td className="py-2 px-2">
                            <Input
                              value={initiative.name}
                              onChange={(e) => updateInitiative(initiative.id, "name", e.target.value)}
                              placeholder="Initiative name"
                              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                              data-testid={`input-initiative-name-${idx}`}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              value={initiative.owner}
                              onChange={(e) => updateInitiative(initiative.id, "owner", e.target.value)}
                              placeholder="Owner"
                              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                              data-testid={`input-initiative-owner-${idx}`}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              value={initiative.timeline}
                              onChange={(e) => updateInitiative(initiative.id, "timeline", e.target.value)}
                              placeholder="Q1 2025"
                              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                              data-testid={`input-initiative-timeline-${idx}`}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              value={initiative.linkedStrategy}
                              onChange={(e) => updateInitiative(initiative.id, "linkedStrategy", e.target.value)}
                              placeholder="Strategy name"
                              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                              data-testid={`input-initiative-strategy-${idx}`}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeInitiative(initiative.id)}
                              className="text-gray-400 hover:text-red-500 p-1"
                              data-testid={`button-remove-initiative-${idx}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
