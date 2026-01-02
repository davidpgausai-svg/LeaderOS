import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Brain, BookOpen, Code, Cpu, Sparkles, Layers } from "lucide-react";
import { SiOpenai, SiGoogle, SiMeta, SiHuggingface } from "react-icons/si";

type AIResource = {
  name: string;
  description: string;
  url: string;
  type: "api" | "docs" | "playground" | "models" | "research";
};

type AICompany = {
  id: string;
  name: string;
  description: string;
  logo: typeof SiOpenai | typeof Brain;
  color: string;
  bgColor: string;
  resources: AIResource[];
};

const aiCompanies: AICompany[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Creators of GPT-4, ChatGPT, DALL-E, and Whisper. Leading AI research lab focused on AGI safety.",
    logo: SiOpenai,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    resources: [
      { name: "API Documentation", description: "Complete API reference and guides", url: "https://platform.openai.com/docs", type: "docs" },
      { name: "Playground", description: "Interactive testing environment for models", url: "https://platform.openai.com/playground", type: "playground" },
      { name: "API Keys", description: "Manage your API keys and usage", url: "https://platform.openai.com/api-keys", type: "api" },
      { name: "Models", description: "Available models and capabilities", url: "https://platform.openai.com/docs/models", type: "models" },
      { name: "Cookbook", description: "Example code and use cases", url: "https://cookbook.openai.com", type: "docs" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "AI safety company building Claude, focused on creating reliable, interpretable, and steerable AI systems.",
    logo: Brain,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    resources: [
      { name: "API Documentation", description: "Claude API reference and guides", url: "https://docs.anthropic.com", type: "docs" },
      { name: "Console", description: "Manage API keys and usage", url: "https://console.anthropic.com", type: "api" },
      { name: "Claude.ai", description: "Chat directly with Claude", url: "https://claude.ai", type: "playground" },
      { name: "Prompt Library", description: "Example prompts and techniques", url: "https://docs.anthropic.com/en/prompt-library", type: "docs" },
      { name: "Research", description: "AI safety research and papers", url: "https://www.anthropic.com/research", type: "research" },
    ],
  },
  {
    id: "google",
    name: "Google DeepMind",
    description: "World-leading AI research lab behind Gemini, AlphaFold, and breakthrough AI systems.",
    logo: SiGoogle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    resources: [
      { name: "Gemini API", description: "Access Gemini models via API", url: "https://ai.google.dev", type: "api" },
      { name: "AI Studio", description: "Prototype and test with Gemini", url: "https://aistudio.google.com", type: "playground" },
      { name: "Vertex AI", description: "Enterprise AI platform", url: "https://cloud.google.com/vertex-ai", type: "api" },
      { name: "Documentation", description: "Complete developer docs", url: "https://ai.google.dev/docs", type: "docs" },
      { name: "DeepMind Research", description: "Research papers and publications", url: "https://deepmind.google/research", type: "research" },
    ],
  },
  {
    id: "meta",
    name: "Meta AI",
    description: "Open-source AI leader behind Llama models, PyTorch, and cutting-edge research in AI.",
    logo: SiMeta,
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    resources: [
      { name: "Llama Models", description: "Download and use Llama models", url: "https://llama.meta.com", type: "models" },
      { name: "PyTorch", description: "Open-source ML framework", url: "https://pytorch.org", type: "docs" },
      { name: "AI Research", description: "Papers and publications", url: "https://ai.meta.com/research", type: "research" },
      { name: "Llama Stack", description: "Production-ready Llama deployment", url: "https://github.com/meta-llama/llama-stack", type: "api" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    description: "European AI company building efficient, open-weight models with strong performance.",
    logo: Sparkles,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    resources: [
      { name: "API Documentation", description: "Mistral API reference", url: "https://docs.mistral.ai", type: "docs" },
      { name: "La Plateforme", description: "Mistral's API console", url: "https://console.mistral.ai", type: "api" },
      { name: "Le Chat", description: "Chat with Mistral models", url: "https://chat.mistral.ai", type: "playground" },
      { name: "Models", description: "Available models and weights", url: "https://docs.mistral.ai/getting-started/models", type: "models" },
    ],
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    description: "The AI community's home for models, datasets, and collaborative machine learning.",
    logo: SiHuggingface,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    resources: [
      { name: "Model Hub", description: "500k+ pre-trained models", url: "https://huggingface.co/models", type: "models" },
      { name: "Datasets", description: "100k+ datasets for ML", url: "https://huggingface.co/datasets", type: "models" },
      { name: "Spaces", description: "Host and share ML demos", url: "https://huggingface.co/spaces", type: "playground" },
      { name: "Transformers", description: "State-of-the-art NLP library", url: "https://huggingface.co/docs/transformers", type: "docs" },
      { name: "Inference API", description: "Serverless inference endpoints", url: "https://huggingface.co/inference-api", type: "api" },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    description: "Enterprise AI platform offering Command, Embed, and Rerank models for business applications.",
    logo: Layers,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    resources: [
      { name: "API Documentation", description: "Complete API reference", url: "https://docs.cohere.com", type: "docs" },
      { name: "Dashboard", description: "API keys and usage", url: "https://dashboard.cohere.com", type: "api" },
      { name: "Playground", description: "Test Cohere models", url: "https://dashboard.cohere.com/playground", type: "playground" },
      { name: "LLM University", description: "Free NLP/LLM courses", url: "https://cohere.com/llmu", type: "docs" },
    ],
  },
  {
    id: "stability",
    name: "Stability AI",
    description: "Creators of Stable Diffusion and open generative AI models for images, video, and audio.",
    logo: Cpu,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    resources: [
      { name: "Developer Platform", description: "API access and documentation", url: "https://platform.stability.ai", type: "api" },
      { name: "API Documentation", description: "Integration guides", url: "https://platform.stability.ai/docs/api-reference", type: "docs" },
      { name: "DreamStudio", description: "Generate images with SD", url: "https://dreamstudio.ai", type: "playground" },
      { name: "GitHub", description: "Open-source models and code", url: "https://github.com/Stability-AI", type: "models" },
    ],
  },
];

const typeIcons: Record<string, typeof BookOpen> = {
  api: Code,
  docs: BookOpen,
  playground: Sparkles,
  models: Cpu,
  research: Brain,
};

const typeLabels: Record<string, string> = {
  api: "API",
  docs: "Docs",
  playground: "Playground",
  models: "Models",
  research: "Research",
};

export default function AIResourcesTemplate() {
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
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <Link href="/templates">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-templates">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#8B5CF6' }}
            >
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1D1D1F' }}>AI Resources</h1>
              <p style={{ color: '#86868B' }}>
                APIs, documentation, and tools from leading AI companies
              </p>
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            {aiCompanies.map((company) => {
              const Logo = company.logo;
              return (
                <Card 
                  key={company.id}
                  className="border-0 rounded-2xl overflow-hidden"
                  style={{ 
                    backgroundColor: 'white',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)'
                  }}
                  data-testid={`card-company-${company.id}`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${company.bgColor}`}>
                        <Logo className={`w-6 h-6 ${company.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">{company.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {company.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {company.resources.map((resource) => {
                        const TypeIcon = typeIcons[resource.type];
                        return (
                          <a
                            key={resource.url}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-gray-50"
                            data-testid={`link-resource-${company.id}-${resource.name.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                              <TypeIcon className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900 group-hover:text-primary transition-colors">
                                  {resource.name}
                                </span>
                                <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {resource.description}
                              </p>
                              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${company.bgColor} ${company.color}`}>
                                {typeLabels[resource.type]}
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
