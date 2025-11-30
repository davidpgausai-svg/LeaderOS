import { useState } from "react";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, FileText, Target, BarChart2, CheckCircle, Clock, Compass } from "lucide-react";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";

type SmartGoal = {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  goalStatement: string;
};

const defaultGoal: SmartGoal = {
  specific: "Increase customer satisfaction score",
  measurable: "From current 78% to 90% satisfaction rate",
  achievable: "Through improved response times and personalized service training",
  relevant: "Supports our strategic priority of customer-centric growth",
  timeBound: "By the end of Q4 2024",
  goalStatement: "Increase customer satisfaction from 78% to 90% by end of Q4 2024 through improved response times and personalized service training.",
};

export default function SmartGoalsTemplate() {
  const [goal, setGoal] = useState<SmartGoal>(defaultGoal);
  const { toast } = useToast();

  const handleChange = (field: keyof SmartGoal, value: string) => {
    setGoal((prev) => ({ ...prev, [field]: value }));
  };

  const generateGoalStatement = () => {
    const statement = `${goal.specific} ${goal.measurable} ${goal.achievable} ${goal.relevant} ${goal.timeBound}`;
    setGoal((prev) => ({ ...prev, goalStatement: statement }));
    toast({ title: "Goal statement generated!", description: "Review and refine as needed." });
  };

  const exportDocx = async () => {
    toast({ title: "Generating Word Doc...", description: "Please wait while we prepare your download." });
    
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: "SMART Goals Framework", heading: HeadingLevel.TITLE }),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "S - Specific", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(goal.specific),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "M - Measurable", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(goal.measurable),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "A - Achievable", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(goal.achievable),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "R - Relevant", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(goal.relevant),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "T - Time-bound", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(goal.timeBound),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "Complete Goal Statement", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(goal.goalStatement),
            new Paragraph({ text: "" }),
            
            new Paragraph({ 
              text: `Generated on ${new Date().toLocaleDateString()}`, 
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "SMART-Goals.docx";
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

  const smartItems = [
    { key: "specific" as const, letter: "S", title: "Specific", icon: Target, color: "blue", description: "What exactly do you want to achieve?" },
    { key: "measurable" as const, letter: "M", title: "Measurable", icon: BarChart2, color: "green", description: "How will you know when you've achieved it?" },
    { key: "achievable" as const, letter: "A", title: "Achievable", icon: CheckCircle, color: "yellow", description: "How will you accomplish this goal?" },
    { key: "relevant" as const, letter: "R", title: "Relevant", icon: Compass, color: "purple", description: "Why is this goal important?" },
    { key: "timeBound" as const, letter: "T", title: "Time-bound", icon: Clock, color: "red", description: "When will you achieve this goal?" },
  ];

  const colorMap: Record<string, string> = {
    blue: "border-l-blue-500 text-blue-600 dark:text-blue-400",
    green: "border-l-green-500 text-green-600 dark:text-green-400",
    yellow: "border-l-yellow-500 text-yellow-600 dark:text-yellow-400",
    purple: "border-l-purple-500 text-purple-600 dark:text-purple-400",
    red: "border-l-red-500 text-red-600 dark:text-red-400",
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/templates">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-templates">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Templates
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SMART Goals</h1>
                <p className="text-gray-600 dark:text-gray-400">Project Management Framework</p>
              </div>
            </div>
            <Button variant="outline" onClick={exportDocx} data-testid="button-smart-export-docx">
              <Download className="w-4 h-4 mr-2" />
              Download Word
            </Button>
          </div>

          <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
            {smartItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.key} className={`border-l-4 ${colorMap[item.color]} shadow-sm`}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`flex items-center gap-2 ${colorMap[item.color].split(' ').slice(1).join(' ')}`}>
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-lg">
                        {item.letter}
                      </div>
                      <Icon className="w-5 h-5" />
                      {item.title}
                    </CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-10">{item.description}</p>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={goal[item.key]}
                      onChange={(e) => handleChange(item.key, e.target.value)}
                      className="bg-white dark:bg-gray-800"
                      data-testid={`input-${item.key}`}
                    />
                  </CardContent>
                </Card>
              );
            })}

            <div className="pt-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold text-gray-900 dark:text-white">Complete Goal Statement</Label>
                <Button variant="outline" size="sm" onClick={generateGoalStatement} data-testid="button-generate-statement">
                  Generate from above
                </Button>
              </div>
              <textarea
                value={goal.goalStatement}
                onChange={(e) => handleChange("goalStatement", e.target.value)}
                className="w-full h-32 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm leading-relaxed dark:text-white"
                placeholder="Your complete SMART goal statement..."
                data-testid="textarea-goal-statement"
              />
            </div>
          </div>

          <div className="mt-8 p-6 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tips for Writing SMART Goals</h3>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li><strong>Specific:</strong> Clearly define what you want to accomplish. Avoid vague language.</li>
              <li><strong>Measurable:</strong> Include numbers, percentages, or concrete metrics to track progress.</li>
              <li><strong>Achievable:</strong> Set challenging but realistic goals within your capabilities.</li>
              <li><strong>Relevant:</strong> Ensure the goal aligns with your broader objectives and priorities.</li>
              <li><strong>Time-bound:</strong> Set a clear deadline to create urgency and focus.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
