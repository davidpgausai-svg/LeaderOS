import { useState } from "react";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, GraduationCap, Copy, Lightbulb, Target, RefreshCw, Star } from "lucide-react";

type Framework = {
  name: string;
  example?: string;
  steps?: string[];
};

type Level = {
  number: number;
  emoji: string;
  title: string;
  mindset: string;
  description: string;
  prompts?: string[];
  coachingTip: string;
  framework: Framework | null;
  color: string;
  bgColor: string;
};

const levels: Level[] = [
  {
    number: 1,
    emoji: "🧩",
    title: "The Curious User",
    mindset: "I know AI can help me, but I'm exploring how.",
    description: "Start with curiosity. Ask questions. Test assumptions. See what happens when you change your wording. You're learning how AI thinks.",
    prompts: [
      "Explain [topic] as if I'm [audience].",
      "Give me 3 ideas for [goal] and 1 risk I should consider."
    ],
    coachingTip: "Encourage breadth of experimentation. Try five versions of the same ask — curiosity is your classroom.",
    framework: null,
    color: "text-violet-600",
    bgColor: "bg-violet-50 border-l-violet-500",
  },
  {
    number: 2,
    emoji: "🧱",
    title: "The Intent Clarifier",
    mindset: "I know what I need; I must express it precisely.",
    description: "Prompting becomes powerful when you're clear. Define your expectations up front.",
    framework: {
      name: "R–T–F (Role, Task, Format)",
      example: "Act as a Compensation Analyst. Analyze this dataset and summarize three market risks in bullet form."
    },
    coachingTip: "Start building a Prompt Library — tag your best-performing structures for reuse and training.",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-l-blue-500",
  },
  {
    number: 3,
    emoji: "🌐",
    title: "The System Thinker",
    mindset: "I know the ecosystem — I'll teach AI my world.",
    description: "AI can't mirror what it doesn't understand. Feed it your context — mission, tone, audience, and priorities.",
    framework: {
      name: "C–A–R–E (Context, Action, Result, Emotion)",
      steps: [
        "Context: This memo is for senior HR leaders.",
        "Action: Summarize FY26 compensation budget highlights.",
        "Result: Should read as an executive brief.",
        "Emotion: Inspire confidence and fiscal responsibility."
      ]
    },
    coachingTip: "Treat AI like a new hire. Show examples of excellence. Don't just tell — train.",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-l-emerald-500",
  },
  {
    number: 4,
    emoji: "🔁",
    title: "The AI Collaborator",
    mindset: "I can co-create with AI and refine iteratively.",
    description: "You've stopped using AI — now you're working with it.",
    framework: {
      name: "I–D–E–A (Instruct, Draft, Evaluate, Adjust)",
      steps: [
        "Draft: Create an HR communication plan for MERIT rollout.",
        "Evaluate: Critique tone and clarity from a leader's view.",
        "Adjust: Refine for transparency and trust."
      ]
    },
    coachingTip: "Run prompt loops — short feedback cycles until the output feels truly yours.",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-l-amber-500",
  },
  {
    number: 5,
    emoji: "🧠",
    title: "The AI Orchestrator",
    mindset: "I deploy AI strategically across workflows.",
    description: "This is mastery. You're not just prompting — you're designing systems.",
    framework: {
      name: "S–E–A–T (Situation, Expectation, Accountability, Timeline)",
      steps: [
        "Situation: Onboarding process for clinicians.",
        "Expectation: Build an AI checklist workflow.",
        "Accountability: HR Ops validates.",
        "Timeline: Prototype in 2 weeks."
      ]
    },
    coachingTip: "Integrate prompting into leadership literacy. AI becomes a part of governance — not a gadget.",
    color: "text-red-600",
    bgColor: "bg-red-50 border-l-red-500",
  }
];

const repeatableSteps = [
  "Start with curiosity.",
  "Clarify your intent.",
  "Add organizational context.",
  "Calibrate through collaboration.",
  "Scale strategically."
];

export default function PromptLiteracyLibrary() {
  const [openLevels, setOpenLevels] = useState<number[]>([]);
  const { toast } = useToast();

  const toggleLevel = (levelNumber: number) => {
    setOpenLevels(prev => 
      prev.includes(levelNumber)
        ? prev.filter(n => n !== levelNumber)
        : [...prev, levelNumber]
    );
  };

  const toggleAll = () => {
    if (openLevels.length === levels.length) {
      setOpenLevels([]);
    } else {
      setOpenLevels(levels.map(l => l.number));
    }
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({
      title: "Copied to clipboard",
      description: "Prompt copied successfully",
      className: "bg-green-600 text-white border-none",
    });
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
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Link href="/templates">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-templates">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#F59E0B' }}
            >
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>The Prompt Literacy Ladder™</h1>
              <p style={{ color: '#86868B' }}>
                How to Move from AI Curiosity to AI Mastery
              </p>
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="border-0 rounded-2xl border-l-4 border-l-blue-500" style={{ backgroundColor: '#f9fafb' }}>
              <CardContent className="p-6">
                <p className="font-semibold text-gray-900 mb-3">
                  AI is amplifying those who know how to speak its language.
                </p>
                <p className="text-gray-600 mb-3">
                  The biggest differentiator in the next decade won't be who has access to AI — it'll be who has <strong>prompt literacy</strong>. That's the ability to turn intent into intelligent output.
                </p>
                <p className="font-semibold text-gray-700">
                  Here's the 5-level ladder every professional can climb to go from curious user to AI orchestrator. 👇
                </p>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={toggleAll}
                className="gap-2"
                data-testid="button-toggle-all-levels"
              >
                {openLevels.length === levels.length ? "Collapse All Levels" : "Expand All Levels"}
              </Button>
            </div>

            <div className="space-y-4">
              {levels.map((level) => (
                <Collapsible
                  key={level.number}
                  open={openLevels.includes(level.number)}
                  onOpenChange={() => toggleLevel(level.number)}
                >
                  <Card 
                    className={`border-0 rounded-2xl border-l-4 overflow-hidden transition-all duration-200 hover:shadow-lg ${level.bgColor.split(' ')[1]}`}
                    style={{ backgroundColor: 'white' }}
                    data-testid={`card-level-${level.number}`}
                  >
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div 
                              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${level.bgColor.split(' ')[1].replace('border-l-', 'bg-')}`}
                              style={{ 
                                backgroundColor: level.number === 1 ? '#8B5CF6' : 
                                               level.number === 2 ? '#3B82F6' :
                                               level.number === 3 ? '#10B981' :
                                               level.number === 4 ? '#F59E0B' : '#EF4444'
                              }}
                            >
                              {level.number}
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {level.emoji} Level {level.number} — {level.title}
                              </h3>
                              <p className="text-sm text-gray-500 italic">
                                Mindset: "{level.mindset}"
                              </p>
                            </div>
                          </div>
                          <ChevronDown 
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                              openLevels.includes(level.number) ? 'rotate-180' : ''
                            }`} 
                          />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 border-t border-gray-100">
                        <p className="text-gray-600 mb-4 pt-4">{level.description}</p>

                        {level.prompts && (
                          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                            <h4 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                              <Lightbulb className="w-4 h-4 text-yellow-500" />
                              Prompts to Try:
                            </h4>
                            <div className="space-y-2">
                              {level.prompts.map((prompt, idx) => (
                                <div 
                                  key={idx}
                                  className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                                  onClick={() => copyPrompt(prompt)}
                                  data-testid={`prompt-level-${level.number}-${idx}`}
                                >
                                  <code className="text-sm text-gray-800 font-mono">{prompt}</code>
                                  <Copy className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {level.framework && (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                            <h4 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                              🧭 Framework: {level.framework.name}
                            </h4>
                            {level.framework.example && (
                              <p className="text-gray-600 italic">"{level.framework.example}"</p>
                            )}
                            {level.framework.steps && (
                              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                                {level.framework.steps.map((step, idx) => (
                                  <li key={idx}>{step}</li>
                                ))}
                              </ol>
                            )}
                          </div>
                        )}

                        <div 
                          className="rounded-xl p-4"
                          style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}
                        >
                          <h4 className="flex items-center gap-2 font-semibold text-amber-900 mb-2">
                            <Target className="w-4 h-4" />
                            Coaching Tip:
                          </h4>
                          <p className="text-amber-800">{level.coachingTip}</p>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>

            <Card 
              className="border-2 border-blue-500 rounded-2xl"
              style={{ backgroundColor: '#eff6ff' }}
            >
              <CardContent className="p-6">
                <h3 className="flex items-center gap-2 text-xl font-bold text-blue-800 mb-4">
                  <RefreshCw className="w-5 h-5" />
                  The Repeatable Model
                </h3>
                <p className="text-blue-700 mb-4">When you face a new challenge:</p>
                <div className="space-y-3">
                  {repeatableSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-gray-700">{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border-l-4 border-l-emerald-500 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}
            >
              <CardContent className="p-6">
                <h3 className="flex items-center gap-2 text-xl font-bold text-emerald-800 mb-4">
                  <Star className="w-5 h-5" />
                  The Outcome
                </h3>
                <p className="text-emerald-700 mb-3">
                  Teams that master this ladder move from AI dabbling to AI orchestration. They gain consistency, confidence, and measurable ROI in every interaction.
                </p>
                <p className="text-lg font-bold text-emerald-800">
                  Prompt literacy is the new digital fluency. Those who can lead AI — will lead the future.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
