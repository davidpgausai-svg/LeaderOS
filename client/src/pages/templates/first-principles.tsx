import { useState } from "react";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Download, ChevronDown, ChevronUp, PlayCircle,
  Target, Layers, Atom, Construction, Settings2, Lightbulb, 
  Rocket, Battery, HelpCircle, GraduationCap, Quote
} from "lucide-react";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

type CanvasData = {
  problemStatement: string;
  endStateTruth: string;
  legacyAssumptions: string;
  irreducibleComponents: string;
  groundUpRebuild: string;
  smartConstraints: string;
  phase1Actions: string;
  phase2Actions: string;
  minimumViableStructure: string;
};

const defaultCanvasData: CanvasData = {
  problemStatement: `What problem or system are you analyzing?

Example: "Our enterprise software deployment takes 6 months and costs $2M per implementation."`,
  endStateTruth: `What is the perfect outcome if you had no constraints, no legacy baggage, and no existing system to protect?

Key Questions:
- What outcome must this achieve at its purest level?
- What does the world look like if this works perfectly?
- What problem completely disappears?

Example: "Software deploys instantly, costs near-zero, and requires no specialized expertise."`,
  legacyAssumptions: `List every rule, tradition, and default you are subconsciously accepting. Then aggressively question each one.

Key Questions:
- What am I assuming that is not a law of physics?
- What would a newcomer with zero history think?
- What would break if I removed this?
- Where did this rule come from?

Example Assumptions to Challenge:
- "Enterprise software must be customized on-site"
- "Implementation requires certified consultants"
- "Complex integrations need months of testing"`,
  irreducibleComponents: `Break the problem into its simplest building blocks - the pieces that cannot be broken down further. These are the "atoms" of your system.

Categories to Consider:
- Data objects and events
- Core workflows and triggers
- Actor roles and permissions
- Required invariants (things that must always be true)
- Core transactions
- Performance/security constraints
- Dependencies that ARE laws, not habits

Example: "The irreducible components are: user data, configuration file, runtime environment, network connection."`,
  groundUpRebuild: `Design the solution bottom-up using ONLY the irreducible components - nothing legacy, nothing assumed.

Key Questions:
- If I were designing this from scratch today, knowing what I know now, how would it work?
- How would SpaceX/Amazon/McKinsey build it if starting clean?
- What is the simplest possible architecture?

Example: "Cloud-native SaaS with zero installation, self-service configuration, and automatic updates."`,
  smartConstraints: `Now add back ONLY the constraints that are truly required (budget, timeline, compliance, tech stack, governance) - but in a way that does NOT distort the foundation.

Real Constraints to Consider:
- Regulatory compliance requirements
- Existing contractual obligations
- Budget and timeline realities
- Team skills and capacity
- Integration requirements with systems that cannot change`,
  phase1Actions: `What is the minimum viable step forward that delivers value now?

Example: "Pilot with 3 customers using containerized deployment, no customization."`,
  phase2Actions: `What comes after Phase 1 succeeds?

Example: "Self-service onboarding portal, automated configuration wizard."`,
  minimumViableStructure: `What is the simplest version that proves the concept works?

Example: "Single-tenant cloud instance with template-based configuration."`,
};

const examples = [
  {
    id: "spacex",
    title: "SpaceX Rocket Costs",
    icon: Rocket,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    problem: "In 2002, rockets cost up to $65 million to purchase - too expensive for Mars missions.",
    traditionalThinking: "Rockets have always been expensive, so they'll stay expensive.",
    firstPrinciples: [
      "Question: Why do rockets cost $65M?",
      "Break down: What is a rocket made of? Aerospace-grade aluminum, titanium, copper, carbon fiber.",
      "Check fundamentals: Raw materials cost only ~2% of the final rocket price.",
      "Rebuild: Manufacture rocket components in-house from raw materials.",
    ],
    result: "SpaceX cut rocket launch costs by nearly 10x while remaining profitable. They also pioneered reusable rockets (Falcon 9), further slashing costs.",
  },
  {
    id: "tesla",
    title: "Tesla Battery Packs",
    icon: Battery,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950",
    problem: "Electric vehicle batteries were prohibitively expensive at $600/kWh.",
    traditionalThinking: "Battery packs are really expensive and that's just the way they'll always be.",
    firstPrinciples: [
      "Question: Must batteries always cost $600/kWh?",
      "Break down: What are the material constituents? Cobalt, nickel, aluminum, carbon, polymers.",
      "Check fundamentals: Material cost on London Metal Exchange: ~$80/kWh (not $600!).",
      "Rebuild: Think of clever ways to combine these materials into battery cell shapes.",
    ],
    result: "Tesla dramatically reduced battery costs, making EVs commercially viable and accelerating the transition to sustainable energy.",
  },
];

const questionBank = {
  truth: [
    "What is the real job-to-be-done?",
    "If nothing existed yet, how would I design this?",
    "What outcome must this achieve at its purest level?",
    "What does the world look like if this works perfectly?",
  ],
  assumptions: [
    "What am I treating as a law that is actually a preference?",
    "Where did this rule come from?",
    "What would a newcomer with zero history think?",
    "What conventions exist only because of history?",
  ],
  atoms: [
    "What are the smallest pieces this breaks into?",
    "What components actually drive value?",
    "What inputs and outputs are truly fundamental?",
    "What constraints are non-negotiable (physics, math, compliance)?",
  ],
  build: [
    "What would a world-class team do if they had no legacy?",
    "How do I make the elegant version of this system?",
    "What is the simplest possible architecture?",
    "How would this look if built today with current knowledge?",
  ],
  constraints: [
    "What constraints matter, and which ones are negotiable?",
    "What's the smallest viable step forward?",
    "What real-world limitations must be added back?",
    "How do I add constraints without distorting the foundation?",
  ],
};

const skillPhases = [
  {
    phase: "Phase 1",
    title: "Awareness",
    description: "Start noticing when you're relying on assumptions, patterns, or defaults.",
    practices: [
      "Catch yourself saying 'that's how it's always been done'",
      "Notice when you copy solutions without questioning them",
      "Identify industry 'best practices' you've never challenged",
    ],
  },
  {
    phase: "Phase 2",
    title: "Reduction",
    description: "Practice breaking problems into fundamentals.",
    practices: [
      "Data → objects/events",
      "Workflows → steps/triggers",
      "Processes → inputs/outputs",
      "Goals → constraints/outcomes",
    ],
  },
  {
    phase: "Phase 3",
    title: "Rebuild",
    description: "Design something from scratch weekly to train the 'blank-sheet muscle'.",
    practices: [
      "Redesign a workflow you use daily",
      "Reimagine a policy from first principles",
      "Architect a software module without legacy constraints",
      "Create a decision-making process from the ground up",
    ],
  },
  {
    phase: "Phase 4",
    title: "Constraint Management",
    description: "Learn to reintroduce limitations without compromising the foundation.",
    practices: [
      "Distinguish between hard constraints (physics, laws) and soft constraints (habits, preferences)",
      "Add constraints incrementally, testing the foundation each time",
      "Find creative ways to work within constraints without distorting the core design",
    ],
  },
  {
    phase: "Phase 5",
    title: "Institutionalization",
    description: "Turn First Principles thinking into a scalable capability.",
    practices: [
      "Create templates and canvases for your team",
      "Build decision loops that enforce this reasoning",
      "Document your first principles analyses as playbooks",
      "Train others in the methodology",
    ],
  },
];

export default function FirstPrinciplesTemplate() {
  const [canvasData, setCanvasData] = useState<CanvasData>(defaultCanvasData);
  const [expandedExamples, setExpandedExamples] = useState<string[]>(["spacex"]);
  const [expandedPhases, setExpandedPhases] = useState<string[]>(["Phase 1"]);
  const { toast } = useToast();

  const handleTextChange = (field: keyof CanvasData, value: string) => {
    setCanvasData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleExample = (id: string) => {
    setExpandedExamples((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) =>
      prev.includes(phase) ? prev.filter((p) => p !== phase) : [...prev, phase]
    );
  };

  const exportDocx = async () => {
    toast({ title: "Generating Word Doc...", description: "Please wait while we prepare your download." });

    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: "First Principles Thinking Canvas", heading: HeadingLevel.TITLE }),
            new Paragraph({ text: "Elon Musk's Framework for Breakthrough Problem-Solving" }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "Problem Statement", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: canvasData.problemStatement }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "Step 1: Define the End-State Truth", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: canvasData.endStateTruth }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "Step 2: Strip Away All Assumptions", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: canvasData.legacyAssumptions }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "Step 3: Identify the Irreducible Components", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: canvasData.irreducibleComponents }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "Step 4: Rebuild From Truth, Not Tradition", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: canvasData.groundUpRebuild }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "Step 5: Reintroduce Constraints Intelligently", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: canvasData.smartConstraints }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "Implementation Plan", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "Phase 1 Actions:", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: canvasData.phase1Actions }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "Phase 2 Actions:", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: canvasData.phase2Actions }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "Minimum Viable Structure:", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: canvasData.minimumViableStructure }),
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
      link.download = "First-Principles-Canvas.docx";
      link.click();
      toast({ title: "Download Complete", className: "bg-green-600 text-white border-none" });
    } catch (err) {
      console.error("DOCX Export Error:", err);
      toast({
        title: "Export Failed",
        description: "Could not generate Word document.",
        variant: "destructive",
      });
    }
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">First Principles Thinking</h1>
                <p className="text-gray-600 dark:text-gray-400">Elon Musk's Framework for Breakthrough Problem-Solving</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-first-principles-tutorial">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Tutorial
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[640px]">
                  <DialogHeader>
                    <DialogTitle>First Principles Thinking Tutorial</DialogTitle>
                  </DialogHeader>
                  <div className="aspect-video">
                    <iframe
                      width="100%"
                      height="100%"
                      src="https://www.youtube.com/embed/NV3sBlRgzTI?si=LrZX2X5xmzqzZ9Ey"
                      title="First Principles Thinking Tutorial"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                      className="rounded-lg"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={exportDocx} data-testid="button-first-principles-export-docx">
                <Download className="w-4 h-4 mr-2" />
                Download Word
              </Button>
            </div>
          </div>

          <Tabs defaultValue="canvas" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4" data-testid="tabs-first-principles">
              <TabsTrigger value="canvas" data-testid="tab-canvas">
                <Layers className="w-4 h-4 mr-2" />
                Canvas
              </TabsTrigger>
              <TabsTrigger value="examples" data-testid="tab-examples">
                <Lightbulb className="w-4 h-4 mr-2" />
                Examples
              </TabsTrigger>
              <TabsTrigger value="questions" data-testid="tab-questions">
                <HelpCircle className="w-4 h-4 mr-2" />
                Question Bank
              </TabsTrigger>
              <TabsTrigger value="skills" data-testid="tab-skills">
                <GraduationCap className="w-4 h-4 mr-2" />
                Skill Development
              </TabsTrigger>
            </TabsList>

            <TabsContent value="canvas" className="space-y-6">
              <Card className="border-2 border-gray-200 dark:border-gray-800">
                <CardHeader className="bg-gray-100 dark:bg-gray-900">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-gray-600" />
                    Problem Statement
                  </CardTitle>
                  <CardDescription>Define the problem or system you're analyzing</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <textarea
                    className="w-full h-32 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed dark:text-white"
                    value={canvasData.problemStatement}
                    onChange={(e) => handleTextChange("problemStatement", e.target.value)}
                    data-testid="textarea-problem-statement"
                  />
                </CardContent>
              </Card>

              <div className="grid gap-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <Badge variant="outline" className="mr-2">Step 1</Badge>
                      <Target className="w-5 h-5" />
                      Define the End-State Truth
                    </CardTitle>
                    <CardDescription>What must be true if you had no constraints or legacy baggage?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      className="w-full h-48 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed dark:text-white"
                      value={canvasData.endStateTruth}
                      onChange={(e) => handleTextChange("endStateTruth", e.target.value)}
                      data-testid="textarea-end-state-truth"
                    />
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardTitle className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
                      <Badge variant="outline" className="mr-2">Step 2</Badge>
                      <Layers className="w-5 h-5" />
                      Strip Away All Assumptions
                    </CardTitle>
                    <CardDescription>List and aggressively question every rule, tradition, and default</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      className="w-full h-48 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm leading-relaxed dark:text-white"
                      value={canvasData.legacyAssumptions}
                      onChange={(e) => handleTextChange("legacyAssumptions", e.target.value)}
                      data-testid="textarea-legacy-assumptions"
                    />
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="text-purple-600 dark:text-purple-400 flex items-center gap-2">
                      <Badge variant="outline" className="mr-2">Step 3</Badge>
                      <Atom className="w-5 h-5" />
                      Identify the Irreducible Components
                    </CardTitle>
                    <CardDescription>Break down to the simplest building blocks that cannot be broken down further</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      className="w-full h-48 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm leading-relaxed dark:text-white"
                      value={canvasData.irreducibleComponents}
                      onChange={(e) => handleTextChange("irreducibleComponents", e.target.value)}
                      data-testid="textarea-irreducible-components"
                    />
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="text-green-600 dark:text-green-400 flex items-center gap-2">
                      <Badge variant="outline" className="mr-2">Step 4</Badge>
                      <Construction className="w-5 h-5" />
                      Rebuild From Truth, Not Tradition
                    </CardTitle>
                    <CardDescription>Construct the ideal version bottom-up using only irreducible components</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      className="w-full h-48 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm leading-relaxed dark:text-white"
                      value={canvasData.groundUpRebuild}
                      onChange={(e) => handleTextChange("groundUpRebuild", e.target.value)}
                      data-testid="textarea-ground-up-rebuild"
                    />
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                      <Badge variant="outline" className="mr-2">Step 5</Badge>
                      <Settings2 className="w-5 h-5" />
                      Reintroduce Constraints Intelligently
                    </CardTitle>
                    <CardDescription>Add back only required constraints without distorting the foundation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      className="w-full h-48 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 text-sm leading-relaxed dark:text-white"
                      value={canvasData.smartConstraints}
                      onChange={(e) => handleTextChange("smartConstraints", e.target.value)}
                      data-testid="textarea-smart-constraints"
                    />
                  </CardContent>
                </Card>
              </div>

              <Card className="border-2 border-gray-200 dark:border-gray-800">
                <CardHeader className="bg-gray-100 dark:bg-gray-900">
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-gray-600" />
                    Implementation Plan
                  </CardTitle>
                  <CardDescription>Convert the ideal into the achievable</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Phase 1 Actions</label>
                    <textarea
                      className="w-full h-24 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed dark:text-white"
                      value={canvasData.phase1Actions}
                      onChange={(e) => handleTextChange("phase1Actions", e.target.value)}
                      data-testid="textarea-phase1-actions"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Phase 2 Actions</label>
                    <textarea
                      className="w-full h-24 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed dark:text-white"
                      value={canvasData.phase2Actions}
                      onChange={(e) => handleTextChange("phase2Actions", e.target.value)}
                      data-testid="textarea-phase2-actions"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Minimum Viable Structure</label>
                    <textarea
                      className="w-full h-24 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed dark:text-white"
                      value={canvasData.minimumViableStructure}
                      onChange={(e) => handleTextChange("minimumViableStructure", e.target.value)}
                      data-testid="textarea-minimum-viable-structure"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="examples" className="space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border dark:border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <Quote className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Elon Musk on First Principles</h2>
                </div>
                <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 dark:text-gray-300">
                  "I think it's important to reason from first principles rather than by analogy. The normal way we conduct our lives is we reason by analogy. We are doing this because it's like something else that was done, or it is like what other people are doing. With first principles, you boil things down to the most fundamental truths and then reason up from there."
                </blockquote>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">- Elon Musk</p>
              </div>

              {examples.map((example) => (
                <Collapsible
                  key={example.id}
                  open={expandedExamples.includes(example.id)}
                  onOpenChange={() => toggleExample(example.id)}
                >
                  <Card className={`${example.bgColor} border-2`}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className={`${example.color} flex items-center gap-2`}>
                            <example.icon className="w-5 h-5" />
                            {example.title}
                          </CardTitle>
                          {expandedExamples.includes(example.id) ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">The Problem</h4>
                          <p className="text-gray-700 dark:text-gray-300">{example.problem}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Traditional Thinking (Reasoning by Analogy)</h4>
                          <p className="text-gray-600 dark:text-gray-400 italic">"{example.traditionalThinking}"</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">First Principles Approach</h4>
                          <ul className="space-y-2">
                            {example.firstPrinciples.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4">
                          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">Result</h4>
                          <p className="text-green-700 dark:text-green-400">{example.result}</p>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </TabsContent>

            <TabsContent value="questions" className="space-y-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Use these questions on repeat - this IS the framework. Ask them whenever you face a problem or decision.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Truth Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {questionBank.truth.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                          <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardTitle className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
                      <Layers className="w-5 h-5" />
                      Assumption Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {questionBank.assumptions.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                          <HelpCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="text-purple-600 dark:text-purple-400 flex items-center gap-2">
                      <Atom className="w-5 h-5" />
                      Atom Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {questionBank.atoms.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                          <HelpCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="text-green-600 dark:text-green-400 flex items-center gap-2">
                      <Construction className="w-5 h-5" />
                      Build Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {questionBank.build.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                          <HelpCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                      <Settings2 className="w-5 h-5" />
                      Constraint Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid md:grid-cols-2 gap-2">
                      {questionBank.constraints.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                          <HelpCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="skills" className="space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border dark:border-gray-800 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Skill Development Plan</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  First Principles thinking is a skill that develops over time. Follow these phases to build your capability progressively.
                </p>
              </div>

              {skillPhases.map((phase) => (
                <Collapsible
                  key={phase.phase}
                  open={expandedPhases.includes(phase.phase)}
                  onOpenChange={() => togglePhase(phase.phase)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-blue-600">{phase.phase}</Badge>
                            <CardTitle className="text-gray-900 dark:text-white">{phase.title}</CardTitle>
                          </div>
                          {expandedPhases.includes(phase.phase) ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <CardDescription>{phase.description}</CardDescription>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Practice Activities:</h4>
                        <ul className="space-y-2">
                          {phase.practices.map((practice, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                              <GraduationCap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span>{practice}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
