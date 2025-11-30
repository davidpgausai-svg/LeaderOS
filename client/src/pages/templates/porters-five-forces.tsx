import { useState } from "react";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Download, Plus, X, ChevronDown, ChevronUp,
  DoorOpen, Factory, Users, Repeat, Swords, AlertTriangle, Target
} from "lucide-react";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

type ForceType = "newEntrants" | "supplierPower" | "buyerPower" | "substitutes" | "competitiveRivalry";

type StrategicResponse = {
  id: string;
  lever: string;
  project: string;
  actions: string;
  owner: string;
  timeline: string;
  successMetrics: string;
};

type Force = {
  rating: number;
  rationale: string;
  dimensions: Record<string, number>;
  diagnosticNotes: string;
  keyInsights: string;
  strategicResponses: StrategicResponse[];
};

type AnalysisData = {
  title: string;
  industry: string;
  organization: string;
  analyst: string;
  date: string;
  scope: string;
  overallAssessment: string;
  newEntrants: Force;
  supplierPower: Force;
  buyerPower: Force;
  substitutes: Force;
  competitiveRivalry: Force;
};

const createDefaultResponse = (id: string): StrategicResponse => ({
  id,
  lever: "",
  project: "",
  actions: "",
  owner: "",
  timeline: "",
  successMetrics: ""
});

const createDefaultForce = (dimensions: string[]): Force => ({
  rating: 3,
  rationale: "",
  dimensions: dimensions.reduce((acc, d) => ({ ...acc, [d]: 3 }), {}),
  diagnosticNotes: "",
  keyInsights: "",
  strategicResponses: [createDefaultResponse("sr1")]
});

const forceConfig: Record<ForceType, {
  title: string;
  icon: typeof DoorOpen;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  dimensions: { key: string; label: string; lowLabel: string; highLabel: string }[];
  diagnosticPrompts: string[];
  typicalLevers: string[];
}> = {
  newEntrants: {
    title: "Threat of New Entrants",
    icon: DoorOpen,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-l-red-500",
    description: "How easy is it for new players to enter your market and erode margins/share?",
    dimensions: [
      { key: "capitalRequirements", label: "Capital Requirements", lowLabel: "Very High (barrier)", highLabel: "Very Low (easy entry)" },
      { key: "regulatoryBarriers", label: "Regulatory/Compliance Barriers", lowLabel: "Heavy regulation", highLabel: "Minimal regulation" },
      { key: "switchingCosts", label: "Customer Switching Costs", lowLabel: "High lock-in", highLabel: "Easy to switch" },
      { key: "brandBarriers", label: "Brand/Trust Barriers", lowLabel: "Strong incumbents", highLabel: "Weak brand loyalty" },
      { key: "distributionAccess", label: "Access to Distribution", lowLabel: "Locked channels", highLabel: "Open channels" },
      { key: "technologyAccess", label: "Technology/IP Access", lowLabel: "Proprietary tech", highLabel: "Commoditized tech" },
      { key: "networkEffects", label: "Network Effects/Ecosystem", lowLabel: "Strong network", highLabel: "Weak network" }
    ],
    diagnosticPrompts: [
      "How much capital would a credible new competitor need to match our offering?",
      "What regulations, licensing, or certifications constrain entry?",
      "How easy is it for customers to try a new competitor (time, risk, data migration)?",
      "How strong are our brand and trust advantages vs. a new name in the space?",
      "Could a big tech / adjacent player enter quickly with their existing capabilities?"
    ],
    typicalLevers: [
      "Deepen switching costs (workflows, historical data, integrations)",
      "Strengthen brand and ecosystem (partner programs, certifications)",
      "Raise structural barriers (exclusive partnerships, patents)",
      "Accelerate innovation pace (outrun entrants on features)"
    ]
  },
  supplierPower: {
    title: "Supplier Power",
    icon: Factory,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-l-orange-500",
    description: "How much leverage do key suppliers have over your economics and capabilities?",
    dimensions: [
      { key: "concentration", label: "Supplier Concentration", lowLabel: "Many suppliers", highLabel: "Few suppliers" },
      { key: "uniqueness", label: "Input Uniqueness", lowLabel: "Commodity inputs", highLabel: "Specialized inputs" },
      { key: "switchingCosts", label: "Your Switching Costs", lowLabel: "Easy to switch", highLabel: "Costly to switch" },
      { key: "costShare", label: "Share of Cost Structure", lowLabel: "Small portion", highLabel: "Large portion" },
      { key: "verticalIntegration", label: "Forward Integration Risk", lowLabel: "Unlikely", highLabel: "Highly likely" },
      { key: "platformDependency", label: "Platform Dependency", lowLabel: "Multi-platform", highLabel: "Single-platform" }
    ],
    diagnosticPrompts: [
      "Where are we single-threaded on critical suppliers (tech, data, channels, talent)?",
      "What would it take to switch to an alternative provider?",
      "Which suppliers could plausibly move into our space and compete with us?",
      "How often and how aggressively do key suppliers raise prices or change terms?"
    ],
    typicalLevers: [
      "Diversify suppliers / dual-source strategy",
      "Backward integration (build internal capabilities)",
      "Negotiate strategic partnerships with volume commitments",
      "Develop alternative technologies to reduce dependency"
    ]
  },
  buyerPower: {
    title: "Buyer Power",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-l-blue-500",
    description: "How much influence do customers have over pricing, terms, and product direction?",
    dimensions: [
      { key: "concentration", label: "Buyer Concentration", lowLabel: "Many small buyers", highLabel: "Few large buyers" },
      { key: "dealImportance", label: "Deal Importance to You", lowLabel: "Small deals", highLabel: "Large deals" },
      { key: "productStandardization", label: "Product Standardization", lowLabel: "Highly differentiated", highLabel: "Commoditized" },
      { key: "priceSensitivity", label: "Price Sensitivity", lowLabel: "Value-focused", highLabel: "Price-focused" },
      { key: "switchingCosts", label: "Buyer Switching Costs", lowLabel: "High lock-in", highLabel: "Easy to leave" },
      { key: "alternatives", label: "Availability of Alternatives", lowLabel: "Few options", highLabel: "Many options" },
      { key: "informationSymmetry", label: "Information Symmetry", lowLabel: "Asymmetric (your favor)", highLabel: "Full transparency" }
    ],
    diagnosticPrompts: [
      "Do a small number of accounts represent a large share of our revenue?",
      "Can buyers play us against competitors to drive down price?",
      "How often do customers demand discounts, custom terms, or bespoke features?",
      "If we raised prices 10%, what would likely happen?"
    ],
    typicalLevers: [
      "Increase differentiation / perceived value",
      "Reduce revenue concentration (diversify customer base)",
      "Create switching costs / embed deeply in customer workflows",
      "Bundle products/services to increase total value"
    ]
  },
  substitutes: {
    title: "Threat of Substitutes",
    icon: Repeat,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-l-purple-500",
    description: "Threat from alternate ways customers can solve the same problem (not direct competitors).",
    dimensions: [
      { key: "switchingEase", label: "Ease of Switching", lowLabel: "Difficult", highLabel: "Very easy" },
      { key: "performance", label: "Substitute Performance", lowLabel: "Clearly inferior", highLabel: "Comparable/better" },
      { key: "relativePrice", label: "Relative Price/TCO", lowLabel: "More expensive", highLabel: "Cheaper" },
      { key: "customerInertia", label: "Customer Habits/Inertia", lowLabel: "Strong inertia", highLabel: "Open to change" },
      { key: "functionalOverlap", label: "Functional Overlap", lowLabel: "Limited overlap", highLabel: "High overlap" }
    ],
    diagnosticPrompts: [
      "What are customers using today instead of us?",
      "What would they switch to if we disappeared tomorrow?",
      "Are there 'good enough' low-cost tools that can meet 70% of the need?",
      "Do substitutes integrate better into their existing tech stack or workflows?"
    ],
    typicalLevers: [
      "Out-execute on outcomes, not just features",
      "Integrate with substitutes instead of just competing",
      "Reposition as a system-of-record / operating system",
      "Build proprietary capabilities substitutes can't match"
    ]
  },
  competitiveRivalry: {
    title: "Competitive Rivalry",
    icon: Swords,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950",
    borderColor: "border-l-emerald-500",
    description: "The intensity of competition among existing players in your market.",
    dimensions: [
      { key: "competitorCount", label: "Number of Competitors", lowLabel: "Few players", highLabel: "Many players" },
      { key: "industryGrowth", label: "Industry Growth Rate", lowLabel: "High growth", highLabel: "Stagnant/declining" },
      { key: "differentiation", label: "Degree of Differentiation", lowLabel: "Highly differentiated", highLabel: "Commoditized" },
      { key: "costStructure", label: "Fixed vs Variable Costs", lowLabel: "Variable costs", highLabel: "High fixed costs" },
      { key: "priceDiscounting", label: "Price Discounting Frequency", lowLabel: "Rare", highLabel: "Constant" },
      { key: "churn", label: "Customer Switching/Churn", lowLabel: "Low churn", highLabel: "High churn" },
      { key: "exitBarriers", label: "Exit Barriers", lowLabel: "Easy to exit", highLabel: "Difficult to exit" }
    ],
    diagnosticPrompts: [
      "How many serious competitors target the same segment?",
      "Are deals frequently won/lost on price?",
      "How aggressively do competitors release features or undercut pricing?",
      "Are we seeing consolidation or fragmentation in our space?"
    ],
    typicalLevers: [
      "Sharpen differentiation / category design",
      "Customer success as a moat",
      "Focused segmentation (own specific verticals)",
      "Strategic alliances or acquisitions"
    ]
  }
};

const defaultData: AnalysisData = {
  title: "",
  industry: "",
  organization: "",
  analyst: "",
  date: new Date().toISOString().split('T')[0],
  scope: "Core business",
  overallAssessment: "",
  newEntrants: createDefaultForce(forceConfig.newEntrants.dimensions.map(d => d.key)),
  supplierPower: createDefaultForce(forceConfig.supplierPower.dimensions.map(d => d.key)),
  buyerPower: createDefaultForce(forceConfig.buyerPower.dimensions.map(d => d.key)),
  substitutes: createDefaultForce(forceConfig.substitutes.dimensions.map(d => d.key)),
  competitiveRivalry: createDefaultForce(forceConfig.competitiveRivalry.dimensions.map(d => d.key))
};

export default function PortersFiveForcesTemplate() {
  const [data, setData] = useState<AnalysisData>(defaultData);
  const [openForces, setOpenForces] = useState<Record<ForceType, boolean>>({
    newEntrants: true,
    supplierPower: true,
    buyerPower: true,
    substitutes: true,
    competitiveRivalry: true
  });
  const { toast } = useToast();

  const toggleForce = (force: ForceType) => {
    setOpenForces(prev => ({ ...prev, [force]: !prev[force] }));
  };

  const updateHeader = (field: keyof AnalysisData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateForce = (force: ForceType, field: keyof Force, value: string | number | Record<string, number>) => {
    setData(prev => ({
      ...prev,
      [force]: { ...prev[force], [field]: value }
    }));
  };

  const updateDimension = (force: ForceType, dimension: string, value: number) => {
    setData(prev => ({
      ...prev,
      [force]: {
        ...prev[force],
        dimensions: { ...prev[force].dimensions, [dimension]: value }
      }
    }));
  };

  const addResponse = (force: ForceType) => {
    const newId = `sr${Date.now()}`;
    setData(prev => ({
      ...prev,
      [force]: {
        ...prev[force],
        strategicResponses: [...prev[force].strategicResponses, createDefaultResponse(newId)]
      }
    }));
  };

  const removeResponse = (force: ForceType, responseId: string) => {
    if (data[force].strategicResponses.length <= 1) return;
    setData(prev => ({
      ...prev,
      [force]: {
        ...prev[force],
        strategicResponses: prev[force].strategicResponses.filter(r => r.id !== responseId)
      }
    }));
  };

  const updateResponse = (force: ForceType, responseId: string, field: keyof StrategicResponse, value: string) => {
    setData(prev => ({
      ...prev,
      [force]: {
        ...prev[force],
        strategicResponses: prev[force].strategicResponses.map(r =>
          r.id === responseId ? { ...r, [field]: value } : r
        )
      }
    }));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (rating >= 3) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return "Very Low";
      case 2: return "Low";
      case 3: return "Moderate";
      case 4: return "High";
      case 5: return "Very High";
      default: return "Moderate";
    }
  };

  const getAverageRating = (force: Force) => {
    const values = Object.values(force.dimensions);
    return values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "N/A";
  };

  const getOverallPressure = () => {
    const forces: ForceType[] = ["newEntrants", "supplierPower", "buyerPower", "substitutes", "competitiveRivalry"];
    const total = forces.reduce((sum, f) => sum + data[f].rating, 0);
    return (total / 5).toFixed(1);
  };

  const exportDocx = async () => {
    toast({ title: "Generating Word Doc...", description: "Please wait while we prepare your download." });
    
    try {
      const children: Paragraph[] = [
        new Paragraph({ text: data.title || "Porter's Five Forces Analysis", heading: HeadingLevel.TITLE }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Industry: ", bold: true }), new TextRun(data.industry || "(Not specified)")] }),
        new Paragraph({ children: [new TextRun({ text: "Organization: ", bold: true }), new TextRun(data.organization || "(Not specified)")] }),
        new Paragraph({ children: [new TextRun({ text: "Analyst: ", bold: true }), new TextRun(data.analyst || "(Not specified)")] }),
        new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun(data.date)] }),
        new Paragraph({ children: [new TextRun({ text: "Scope: ", bold: true }), new TextRun(data.scope)] }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "Force Profile Summary", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun({ text: `Overall Competitive Pressure: ${getOverallPressure()}/5`, bold: true })] }),
        new Paragraph({ text: "" }),
      ];

      const forces: ForceType[] = ["newEntrants", "supplierPower", "buyerPower", "substitutes", "competitiveRivalry"];
      
      forces.forEach(forceKey => {
        const config = forceConfig[forceKey];
        const force = data[forceKey];
        
        children.push(new Paragraph({ text: `• ${config.title}: ${force.rating}/5 (${getRatingLabel(force.rating)})` }));
      });

      children.push(new Paragraph({ text: "" }));

      if (data.overallAssessment) {
        children.push(new Paragraph({ text: "Overall Strategic Assessment", heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph(data.overallAssessment));
        children.push(new Paragraph({ text: "" }));
      }

      forces.forEach(forceKey => {
        const config = forceConfig[forceKey];
        const force = data[forceKey];
        
        children.push(new Paragraph({ text: config.title, heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph({ children: [new TextRun({ text: config.description, italics: true })] }));
        children.push(new Paragraph({ text: "" }));
        
        children.push(new Paragraph({ children: [
          new TextRun({ text: "Force Rating: ", bold: true }),
          new TextRun(`${force.rating}/5 (${getRatingLabel(force.rating)})`)
        ]}));
        
        children.push(new Paragraph({ children: [
          new TextRun({ text: "Average Dimension Score: ", bold: true }),
          new TextRun(`${getAverageRating(force)}/5`)
        ]}));
        
        children.push(new Paragraph({ text: "" }));
        children.push(new Paragraph({ text: "Dimension Scores:", heading: HeadingLevel.HEADING_2 }));
        
        config.dimensions.forEach(dim => {
          const score = force.dimensions[dim.key] || 3;
          children.push(new Paragraph({ children: [
            new TextRun({ text: `${dim.label}: `, bold: true }),
            new TextRun(`${score}/5`)
          ]}));
        });

        if (force.rationale) {
          children.push(new Paragraph({ text: "" }));
          children.push(new Paragraph({ text: "Rating Rationale:", heading: HeadingLevel.HEADING_2 }));
          children.push(new Paragraph(force.rationale));
        }

        if (force.keyInsights) {
          children.push(new Paragraph({ text: "" }));
          children.push(new Paragraph({ text: "Key Insights:", heading: HeadingLevel.HEADING_2 }));
          children.push(new Paragraph(force.keyInsights));
        }

        if (force.diagnosticNotes) {
          children.push(new Paragraph({ text: "" }));
          children.push(new Paragraph({ text: "Diagnostic Notes:", heading: HeadingLevel.HEADING_2 }));
          children.push(new Paragraph(force.diagnosticNotes));
        }

        const validResponses = force.strategicResponses.filter(r => r.lever.trim() || r.project.trim());
        if (validResponses.length > 0) {
          children.push(new Paragraph({ text: "" }));
          children.push(new Paragraph({ text: "Strategic Responses:", heading: HeadingLevel.HEADING_2 }));
          
          validResponses.forEach((response, index) => {
            children.push(new Paragraph({ text: `Response ${index + 1}: ${response.lever}`, heading: HeadingLevel.HEADING_3 }));
            if (response.project) children.push(new Paragraph({ children: [new TextRun({ text: "Project: ", bold: true }), new TextRun(response.project)] }));
            if (response.actions) children.push(new Paragraph({ children: [new TextRun({ text: "Actions: ", bold: true }), new TextRun(response.actions)] }));
            if (response.owner) children.push(new Paragraph({ children: [new TextRun({ text: "Owner: ", bold: true }), new TextRun(response.owner)] }));
            if (response.timeline) children.push(new Paragraph({ children: [new TextRun({ text: "Timeline: ", bold: true }), new TextRun(response.timeline)] }));
            if (response.successMetrics) children.push(new Paragraph({ children: [new TextRun({ text: "Success Metrics: ", bold: true }), new TextRun(response.successMetrics)] }));
            children.push(new Paragraph({ text: "" }));
          });
        }

        children.push(new Paragraph({ text: "" }));
      });

      children.push(new Paragraph({ text: `Generated on ${new Date().toLocaleDateString()}` }));

      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const blob = await Packer.toBlob(doc);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Porters-Five-Forces-Analysis.docx";
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

  const renderForceProfile = () => {
    const forces: { key: ForceType; label: string }[] = [
      { key: "newEntrants", label: "New Entrants" },
      { key: "supplierPower", label: "Supplier Power" },
      { key: "buyerPower", label: "Buyer Power" },
      { key: "substitutes", label: "Substitutes" },
      { key: "competitiveRivalry", label: "Rivalry" }
    ];

    return (
      <Card className="border-l-4 border-l-gray-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Target className="w-5 h-5" />
            Force Profile Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-center">
            <span className="text-sm text-gray-500">Overall Competitive Pressure</span>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{getOverallPressure()}/5</div>
          </div>
          <div className="space-y-3">
            {forces.map(({ key, label }) => {
              const rating = data[key].rating;
              const widthPercent = (rating / 5) * 100;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{label}</span>
                    <Badge className={getRatingColor(rating)}>{rating}/5 {getRatingLabel(rating)}</Badge>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${rating >= 4 ? 'bg-red-500' : rating >= 3 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6">
            <Label className="text-xs">Overall Strategic Assessment</Label>
            <Textarea
              value={data.overallAssessment}
              onChange={(e) => updateHeader("overallAssessment", e.target.value)}
              placeholder="Summarize the key competitive dynamics and strategic implications..."
              className="min-h-[100px] mt-1"
              data-testid="input-porter-overall-assessment"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderForce = (forceKey: ForceType) => {
    const config = forceConfig[forceKey];
    const force = data[forceKey];
    const Icon = config.icon;
    const isOpen = openForces[forceKey];

    return (
      <Card key={forceKey} className={`border-l-4 ${config.borderColor}`}>
        <Collapsible open={isOpen} onOpenChange={() => toggleForce(forceKey)}>
          <CardHeader className={`pb-3 ${config.bgColor}`}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className={`flex items-center gap-2 ${config.color}`}>
                  <Icon className="w-5 h-5" />
                  {config.title}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge className={getRatingColor(force.rating)}>
                    {force.rating}/5 {getRatingLabel(force.rating)}
                  </Badge>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{config.description}</p>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Overall Force Rating (1-5)</Label>
                  <Select
                    value={force.rating.toString()}
                    onValueChange={(value) => updateForce(forceKey, "rating", parseInt(value))}
                  >
                    <SelectTrigger data-testid={`select-porter-${forceKey}-rating`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Very Low Threat/Power</SelectItem>
                      <SelectItem value="2">2 - Low Threat/Power</SelectItem>
                      <SelectItem value="3">3 - Moderate Threat/Power</SelectItem>
                      <SelectItem value="4">4 - High Threat/Power</SelectItem>
                      <SelectItem value="5">5 - Very High Threat/Power</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Avg. Dimension Score</Label>
                  <div className="h-10 flex items-center">
                    <Badge variant="outline" className="text-lg">{getAverageRating(force)}/5</Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-2 block">Dimension Assessment</Label>
                <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {config.dimensions.map(dim => (
                    <div key={dim.key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{dim.label}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          {force.dimensions[dim.key] || 3}/5
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-24 text-right">{dim.lowLabel}</span>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={force.dimensions[dim.key] || 3}
                          onChange={(e) => updateDimension(forceKey, dim.key, parseInt(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                          data-testid={`slider-porter-${forceKey}-${dim.key}`}
                        />
                        <span className="text-xs text-gray-500 w-24">{dim.highLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Rating Rationale</Label>
                <Textarea
                  value={force.rationale}
                  onChange={(e) => updateForce(forceKey, "rationale", e.target.value)}
                  placeholder="Explain why you assigned this rating..."
                  className="min-h-[80px]"
                  data-testid={`input-porter-${forceKey}-rationale`}
                />
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Diagnostic Prompts
                </Label>
                <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  {config.diagnosticPrompts.map((prompt, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-blue-500">•</span>
                      {prompt}
                    </li>
                  ))}
                </ul>
                <Textarea
                  value={force.diagnosticNotes}
                  onChange={(e) => updateForce(forceKey, "diagnosticNotes", e.target.value)}
                  placeholder="Record your answers and observations here..."
                  className="mt-3 min-h-[80px] bg-white dark:bg-gray-900"
                  data-testid={`input-porter-${forceKey}-diagnostic`}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Key Insights</Label>
                <Textarea
                  value={force.keyInsights}
                  onChange={(e) => updateForce(forceKey, "keyInsights", e.target.value)}
                  placeholder="Summarize the most important findings for this force..."
                  className="min-h-[80px]"
                  data-testid={`input-porter-${forceKey}-insights`}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">Strategic Responses</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addResponse(forceKey)}
                    data-testid={`button-porter-${forceKey}-add-response`}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Response
                  </Button>
                </div>

                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Label className="text-xs text-gray-500">Typical Strategic Levers:</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {config.typicalLevers.map((lever, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{lever}</Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {force.strategicResponses.map((response, index) => (
                    <div key={response.id} className="p-4 border rounded-lg bg-white dark:bg-gray-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Response {index + 1}</span>
                        {force.strategicResponses.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeResponse(forceKey, response.id)}
                            data-testid={`button-porter-${forceKey}-remove-${response.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-xs">Strategic Lever</Label>
                          <Input
                            value={response.lever}
                            onChange={(e) => updateResponse(forceKey, response.id, "lever", e.target.value)}
                            placeholder="e.g., Deepen switching costs"
                            data-testid={`input-porter-${forceKey}-lever-${response.id}`}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Project Name</Label>
                          <Input
                            value={response.project}
                            onChange={(e) => updateResponse(forceKey, response.id, "project", e.target.value)}
                            placeholder="e.g., Implement workflow templates library"
                            data-testid={`input-porter-${forceKey}-project-${response.id}`}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Key Actions</Label>
                          <Textarea
                            value={response.actions}
                            onChange={(e) => updateResponse(forceKey, response.id, "actions", e.target.value)}
                            placeholder="Specific actions to implement this response..."
                            className="min-h-[60px]"
                            data-testid={`input-porter-${forceKey}-actions-${response.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Owner</Label>
                          <Input
                            value={response.owner}
                            onChange={(e) => updateResponse(forceKey, response.id, "owner", e.target.value)}
                            placeholder="Accountable executive"
                            data-testid={`input-porter-${forceKey}-owner-${response.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Timeline</Label>
                          <Input
                            value={response.timeline}
                            onChange={(e) => updateResponse(forceKey, response.id, "timeline", e.target.value)}
                            placeholder="e.g., Q2 2025"
                            data-testid={`input-porter-${forceKey}-timeline-${response.id}`}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Success Metrics</Label>
                          <Input
                            value={response.successMetrics}
                            onChange={(e) => updateResponse(forceKey, response.id, "successMetrics", e.target.value)}
                            placeholder="e.g., Reduce churn to <5% annually"
                            data-testid={`input-porter-${forceKey}-metrics-${response.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/templates">
                <Button variant="ghost" size="sm" data-testid="button-porter-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Porter's Five Forces</h1>
                <p className="text-gray-600 dark:text-gray-400">Competitive Industry Analysis Framework</p>
              </div>
            </div>
            <Button variant="outline" onClick={exportDocx} data-testid="button-porter-export-docx">
              <Download className="w-4 h-4 mr-2" />
              Download Word
            </Button>
          </div>

          <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
            <Card className="border-l-4 border-l-gray-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-700 dark:text-gray-300">Analysis Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-xs">Analysis Title</Label>
                    <Input
                      value={data.title}
                      onChange={(e) => updateHeader("title", e.target.value)}
                      placeholder="e.g., SaaS Strategic Planning Software Market Analysis"
                      data-testid="input-porter-title"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Industry</Label>
                    <Input
                      value={data.industry}
                      onChange={(e) => updateHeader("industry", e.target.value)}
                      placeholder="e.g., Enterprise Software, Healthcare"
                      data-testid="input-porter-industry"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Organization</Label>
                    <Input
                      value={data.organization}
                      onChange={(e) => updateHeader("organization", e.target.value)}
                      placeholder="Your organization name"
                      data-testid="input-porter-organization"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Analyst</Label>
                    <Input
                      value={data.analyst}
                      onChange={(e) => updateHeader("analyst", e.target.value)}
                      placeholder="Name of analyst"
                      data-testid="input-porter-analyst"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={data.date}
                      onChange={(e) => updateHeader("date", e.target.value)}
                      data-testid="input-porter-date"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Analysis Scope</Label>
                    <Input
                      value={data.scope}
                      onChange={(e) => updateHeader("scope", e.target.value)}
                      placeholder="e.g., North America enterprise segment"
                      data-testid="input-porter-scope"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {renderForceProfile()}

            {renderForce("newEntrants")}
            {renderForce("supplierPower")}
            {renderForce("buyerPower")}
            {renderForce("substitutes")}
            {renderForce("competitiveRivalry")}
          </div>
        </div>
      </main>
    </div>
  );
}
