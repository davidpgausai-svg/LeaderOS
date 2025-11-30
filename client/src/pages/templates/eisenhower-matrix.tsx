import { useState } from "react";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, FileText, Zap, Calendar, Users, Trash2, Plus, X, PlayCircle } from "lucide-react";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";

type QuadrantType = "do" | "schedule" | "delegate" | "delete";

type Task = {
  id: string;
  text: string;
};

type MatrixData = {
  do: Task[];
  schedule: Task[];
  delegate: Task[];
  delete: Task[];
};

const defaultMatrix: MatrixData = {
  do: [
    { id: "1", text: "Critical project deadline today" },
    { id: "2", text: "Client emergency response" },
  ],
  schedule: [
    { id: "3", text: "Strategic planning session" },
    { id: "4", text: "Team development training" },
  ],
  delegate: [
    { id: "5", text: "Weekly status reports" },
    { id: "6", text: "Meeting coordination" },
  ],
  delete: [
    { id: "7", text: "Unproductive meetings" },
    { id: "8", text: "Social media browsing" },
  ],
};

const quadrantConfig = {
  do: {
    title: "Do First",
    subtitle: "Urgent & Important",
    icon: Zap,
    color: "red",
    borderColor: "border-red-500",
    textColor: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    description: "Crisis, deadlines, problems",
  },
  schedule: {
    title: "Schedule",
    subtitle: "Not Urgent & Important",
    icon: Calendar,
    color: "blue",
    borderColor: "border-blue-500",
    textColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    description: "Prevention, planning, improvement",
  },
  delegate: {
    title: "Delegate",
    subtitle: "Urgent & Not Important",
    icon: Users,
    color: "yellow",
    borderColor: "border-yellow-500",
    textColor: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    description: "Interruptions, some calls, some emails",
  },
  delete: {
    title: "Delete",
    subtitle: "Not Urgent & Not Important",
    icon: Trash2,
    color: "gray",
    borderColor: "border-gray-400",
    textColor: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900/30",
    description: "Time wasters, pleasant activities",
  },
};

export default function EisenhowerMatrixTemplate() {
  const [matrix, setMatrix] = useState<MatrixData>(defaultMatrix);
  const [newTasks, setNewTasks] = useState<Record<QuadrantType, string>>({
    do: "",
    schedule: "",
    delegate: "",
    delete: "",
  });
  const { toast } = useToast();

  const addTask = (quadrant: QuadrantType) => {
    if (!newTasks[quadrant].trim()) return;
    
    setMatrix((prev) => ({
      ...prev,
      [quadrant]: [
        ...prev[quadrant],
        { id: Date.now().toString(), text: newTasks[quadrant] },
      ],
    }));
    setNewTasks((prev) => ({ ...prev, [quadrant]: "" }));
  };

  const removeTask = (quadrant: QuadrantType, taskId: string) => {
    setMatrix((prev) => ({
      ...prev,
      [quadrant]: prev[quadrant].filter((t) => t.id !== taskId),
    }));
  };

  const exportDocx = async () => {
    toast({ title: "Generating Word Doc...", description: "Please wait while we prepare your download." });
    
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: "Eisenhower Matrix", heading: HeadingLevel.TITLE }),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "Quadrant 1: Do First (Urgent & Important)", heading: HeadingLevel.HEADING_1 }),
            ...matrix.do.map((task) => new Paragraph(`• ${task.text}`)),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "Quadrant 2: Schedule (Not Urgent & Important)", heading: HeadingLevel.HEADING_1 }),
            ...matrix.schedule.map((task) => new Paragraph(`• ${task.text}`)),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "Quadrant 3: Delegate (Urgent & Not Important)", heading: HeadingLevel.HEADING_1 }),
            ...matrix.delegate.map((task) => new Paragraph(`• ${task.text}`)),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "Quadrant 4: Delete (Not Urgent & Not Important)", heading: HeadingLevel.HEADING_1 }),
            ...matrix.delete.map((task) => new Paragraph(`• ${task.text}`)),
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
      link.download = "Eisenhower-Matrix.docx";
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

  const renderQuadrant = (type: QuadrantType) => {
    const config = quadrantConfig[type];
    const Icon = config.icon;

    return (
      <Card className={`border-l-4 ${config.borderColor} shadow-sm h-full`}>
        <CardHeader className={`pb-2 ${config.bgColor}`}>
          <CardTitle className={`flex items-center gap-2 ${config.textColor}`}>
            <Icon className="w-5 h-5" />
            {config.title}
          </CardTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400">{config.subtitle}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">{config.description}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2 min-h-[120px]">
            {matrix[type].map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md group"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{task.text}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={() => removeTask(type, task.id)}
                  data-testid={`button-remove-${type}-${task.id}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 pt-2 border-t dark:border-gray-700">
            <Input
              value={newTasks[type]}
              onChange={(e) => setNewTasks((prev) => ({ ...prev, [type]: e.target.value }))}
              placeholder="Add task..."
              className="text-sm h-8"
              onKeyDown={(e) => e.key === "Enter" && addTask(type)}
              data-testid={`input-new-${type}`}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => addTask(type)}
              data-testid={`button-add-${type}`}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/templates">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-templates">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Templates
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Eisenhower Matrix</h1>
                <p className="text-gray-600 dark:text-gray-400">Task Prioritization Framework</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-eisenhower-tutorial">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Tutorial
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[640px]">
                  <DialogHeader>
                    <DialogTitle>Eisenhower Matrix Tutorial</DialogTitle>
                  </DialogHeader>
                  <div className="aspect-video flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Tutorial video coming soon</p>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={exportDocx} data-testid="button-eisenhower-export-docx">
                <Download className="w-4 h-4 mr-2" />
                Download Word
              </Button>
            </div>
          </div>

          <div className="mb-4 text-center">
            <div className="inline-flex items-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">URGENT →</span>
              <span className="font-medium">NOT URGENT →</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">IMPORTANT ↓</p>
                {renderQuadrant("do")}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">IMPORTANT ↓</p>
                {renderQuadrant("schedule")}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">NOT IMPORTANT ↓</p>
                {renderQuadrant("delegate")}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">NOT IMPORTANT ↓</p>
                {renderQuadrant("delete")}
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">How to Use the Eisenhower Matrix</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quadrant 1: Do First</h4>
                <p>Tasks that are both urgent and important. Handle these immediately as they have clear deadlines or significant consequences.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quadrant 2: Schedule</h4>
                <p>Important but not urgent tasks. These contribute to long-term goals. Schedule dedicated time to work on them.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quadrant 3: Delegate</h4>
                <p>Urgent but not important tasks. These can often be delegated to others or handled with minimal effort.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quadrant 4: Delete</h4>
                <p>Neither urgent nor important. Consider eliminating these tasks as they don't contribute to your goals.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
