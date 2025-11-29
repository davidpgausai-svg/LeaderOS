import { useState, useRef } from "react";
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
  ArrowLeft, Download, FileText, Plus, X, ChevronDown, ChevronUp,
  Landmark, TrendingUp, Users, Cpu, Scale, Leaf
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

type TrendDirection = "Rising" | "Declining" | "Stable" | "Volatile" | "Unknown";
type TimeHorizon = "0-12 months" | "1-3 years" | "3-5 years" | "5+ years";
type Orientation = "Risk" | "Opportunity" | "Both";
type ResponseStatus = "No action" | "Monitoring" | "Planning" | "Active response";
type CategoryType = "Political" | "Economic" | "Social" | "Technological" | "Legal" | "Environmental";

type Factor = {
  id: string;
  name: string;
  description: string;
  trend: TrendDirection;
  timeHorizon: TimeHorizon;
  likelihood: number;
  impact: number;
  orientation: Orientation;
  implications: string;
  indicators: string;
  owner: string;
  status: ResponseStatus;
  notes: string;
};

type PestleData = {
  title: string;
  scope: string;
  timeHorizon: string;
  owner: string;
  contributors: string;
  lastUpdated: string;
  political: Factor[];
  economic: Factor[];
  social: Factor[];
  technological: Factor[];
  legal: Factor[];
  environmental: Factor[];
};

const createDefaultFactor = (id: string): Factor => ({
  id,
  name: "",
  description: "",
  trend: "Stable",
  timeHorizon: "1-3 years",
  likelihood: 3,
  impact: 3,
  orientation: "Both",
  implications: "",
  indicators: "",
  owner: "",
  status: "Monitoring",
  notes: ""
});

const defaultData: PestleData = {
  title: "",
  scope: "Enterprise",
  timeHorizon: "1-3 years",
  owner: "",
  contributors: "",
  lastUpdated: new Date().toISOString().split('T')[0],
  political: [createDefaultFactor("p1")],
  economic: [createDefaultFactor("e1")],
  social: [createDefaultFactor("s1")],
  technological: [createDefaultFactor("t1")],
  legal: [createDefaultFactor("l1")],
  environmental: [createDefaultFactor("env1")]
};

const categoryConfig: Record<CategoryType, { key: keyof PestleData; icon: typeof Landmark; color: string; bgColor: string; borderColor: string; description: string }> = {
  Political: {
    key: "political",
    icon: Landmark,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-l-red-500",
    description: "Government actions, policies, and political stability"
  },
  Economic: {
    key: "economic",
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-l-blue-500",
    description: "Macro-economic conditions affecting demand, costs, and capital"
  },
  Social: {
    key: "social",
    icon: Users,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-l-purple-500",
    description: "Societal attitudes, demographics, and cultural trends"
  },
  Technological: {
    key: "technological",
    icon: Cpu,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950",
    borderColor: "border-l-cyan-500",
    description: "Technologies that could improve efficiency or disrupt your model"
  },
  Legal: {
    key: "legal",
    icon: Scale,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    borderColor: "border-l-amber-500",
    description: "Laws, regulations, compliance standards, and litigation risks"
  },
  Environmental: {
    key: "environmental",
    icon: Leaf,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-l-green-500",
    description: "Environmental factors, sustainability, and climate risks"
  }
};

export default function PestleTemplate() {
  const [data, setData] = useState<PestleData>(defaultData);
  const [openCategories, setOpenCategories] = useState<Record<CategoryType, boolean>>({
    Political: true,
    Economic: true,
    Social: true,
    Technological: true,
    Legal: true,
    Environmental: true
  });
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleCategory = (category: CategoryType) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const updateHeader = (field: keyof PestleData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const addFactor = (category: CategoryType) => {
    const key = categoryConfig[category].key as keyof PestleData;
    const prefix = category.charAt(0).toLowerCase();
    const newId = `${prefix}${Date.now()}`;
    setData(prev => ({
      ...prev,
      [key]: [...(prev[key] as Factor[]), createDefaultFactor(newId)]
    }));
  };

  const removeFactor = (category: CategoryType, factorId: string) => {
    const key = categoryConfig[category].key as keyof PestleData;
    const factors = data[key] as Factor[];
    if (factors.length <= 1) return;
    setData(prev => ({
      ...prev,
      [key]: (prev[key] as Factor[]).filter(f => f.id !== factorId)
    }));
  };

  const updateFactor = (category: CategoryType, factorId: string, field: keyof Factor, value: string | number) => {
    const key = categoryConfig[category].key as keyof PestleData;
    setData(prev => ({
      ...prev,
      [key]: (prev[key] as Factor[]).map(f =>
        f.id === factorId ? { ...f, [field]: value } : f
      )
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (score >= 3) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  };

  const getOrientationColor = (orientation: Orientation) => {
    switch (orientation) {
      case "Risk": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Opportunity": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Both": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const exportPDF = async () => {
    if (!containerRef.current) return;
    
    toast({ title: "Generating PDF...", description: "Please wait while we prepare your download." });

    try {
      const canvas = await html2canvas(containerRef.current, { 
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      
      let yOffset = 0;
      let pageNumber = 0;
      
      while (yOffset < imgHeight) {
        if (pageNumber > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "PNG", 0, -yOffset, imgWidth, imgHeight);
        yOffset += pageHeight;
        pageNumber++;
      }
      
      pdf.save("PESTLE-Analysis.pdf");
      
      toast({ title: "Download Complete", className: "bg-green-600 text-white border-none" });
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast({ 
        title: "Export Failed", 
        description: "Could not generate PDF.", 
        variant: "destructive" 
      });
    }
  };

  const exportDocx = async () => {
    toast({ title: "Generating Word Doc...", description: "Please wait while we prepare your download." });
    
    try {
      const children: Paragraph[] = [
        new Paragraph({ text: data.title || "PESTLE Analysis", heading: HeadingLevel.TITLE }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "Scope: ", bold: true }), new TextRun(data.scope)] }),
        new Paragraph({ children: [new TextRun({ text: "Time Horizon: ", bold: true }), new TextRun(data.timeHorizon)] }),
        new Paragraph({ children: [new TextRun({ text: "Owner: ", bold: true }), new TextRun(data.owner || "(Not specified)")] }),
        new Paragraph({ children: [new TextRun({ text: "Contributors: ", bold: true }), new TextRun(data.contributors || "(Not specified)")] }),
        new Paragraph({ children: [new TextRun({ text: "Last Updated: ", bold: true }), new TextRun(data.lastUpdated)] }),
        new Paragraph({ text: "" }),
      ];

      const categories: CategoryType[] = ["Political", "Economic", "Social", "Technological", "Legal", "Environmental"];
      
      categories.forEach(category => {
        const key = categoryConfig[category].key as keyof PestleData;
        const factors = data[key] as Factor[];
        
        children.push(new Paragraph({ text: `${category} Factors`, heading: HeadingLevel.HEADING_1 }));
        children.push(new Paragraph({ children: [new TextRun({ text: categoryConfig[category].description, italics: true })] }));
        children.push(new Paragraph({ text: "" }));
        
        factors.filter(f => f.name.trim()).forEach((factor, index) => {
          children.push(new Paragraph({ text: `${index + 1}. ${factor.name}`, heading: HeadingLevel.HEADING_2 }));
          if (factor.description) children.push(new Paragraph(factor.description));
          children.push(new Paragraph({ children: [
            new TextRun({ text: "Trend: ", bold: true }), new TextRun(factor.trend),
            new TextRun(" | "),
            new TextRun({ text: "Time Horizon: ", bold: true }), new TextRun(factor.timeHorizon)
          ]}));
          children.push(new Paragraph({ children: [
            new TextRun({ text: "Likelihood: ", bold: true }), new TextRun(`${factor.likelihood}/5`),
            new TextRun(" | "),
            new TextRun({ text: "Impact: ", bold: true }), new TextRun(`${factor.impact}/5`),
            new TextRun(" | "),
            new TextRun({ text: "Orientation: ", bold: true }), new TextRun(factor.orientation)
          ]}));
          if (factor.implications) {
            children.push(new Paragraph({ children: [new TextRun({ text: "Strategic Implications: ", bold: true })] }));
            children.push(new Paragraph(factor.implications));
          }
          if (factor.indicators) {
            children.push(new Paragraph({ children: [new TextRun({ text: "Key Indicators: ", bold: true }), new TextRun(factor.indicators)] }));
          }
          if (factor.owner) {
            children.push(new Paragraph({ children: [new TextRun({ text: "Owner: ", bold: true }), new TextRun(factor.owner)] }));
          }
          children.push(new Paragraph({ children: [new TextRun({ text: "Status: ", bold: true }), new TextRun(factor.status)] }));
          children.push(new Paragraph({ text: "" }));
        });
      });

      children.push(new Paragraph({ text: `Generated on ${new Date().toLocaleDateString()}` }));

      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const blob = await Packer.toBlob(doc);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "PESTLE-Analysis.docx";
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

  const renderFactorCard = (category: CategoryType, factor: Factor, index: number) => {
    const config = categoryConfig[category];
    const factors = data[config.key as keyof PestleData] as Factor[];

    return (
      <div key={factor.id} className="p-4 border rounded-lg bg-white dark:bg-gray-900 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Factor {index + 1}</span>
          <div className="flex items-center gap-2">
            <Badge className={getOrientationColor(factor.orientation)}>{factor.orientation}</Badge>
            <Badge className={getScoreColor(factor.impact)}>Impact: {factor.impact}</Badge>
            <Badge className={getScoreColor(factor.likelihood)}>Likelihood: {factor.likelihood}</Badge>
            {factors.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFactor(category, factor.id)}
                data-testid={`button-pestle-remove-${category.toLowerCase()}-${factor.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="text-xs">Factor Name</Label>
            <Input
              value={factor.name}
              onChange={(e) => updateFactor(category, factor.id, "name", e.target.value)}
              placeholder="e.g., Shift to Value-Based Care"
              data-testid={`input-pestle-${category.toLowerCase()}-name-${factor.id}`}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={factor.description}
              onChange={(e) => updateFactor(category, factor.id, "description", e.target.value)}
              placeholder="2-4 sentences describing this factor..."
              className="min-h-[60px]"
              data-testid={`input-pestle-${category.toLowerCase()}-desc-${factor.id}`}
            />
          </div>

          <div>
            <Label className="text-xs">Trend Direction</Label>
            <Select
              value={factor.trend}
              onValueChange={(value) => updateFactor(category, factor.id, "trend", value)}
            >
              <SelectTrigger data-testid={`select-pestle-${category.toLowerCase()}-trend-${factor.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rising">Rising</SelectItem>
                <SelectItem value="Declining">Declining</SelectItem>
                <SelectItem value="Stable">Stable</SelectItem>
                <SelectItem value="Volatile">Volatile</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Time Horizon</Label>
            <Select
              value={factor.timeHorizon}
              onValueChange={(value) => updateFactor(category, factor.id, "timeHorizon", value)}
            >
              <SelectTrigger data-testid={`select-pestle-${category.toLowerCase()}-horizon-${factor.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-12 months">0-12 months</SelectItem>
                <SelectItem value="1-3 years">1-3 years</SelectItem>
                <SelectItem value="3-5 years">3-5 years</SelectItem>
                <SelectItem value="5+ years">5+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Likelihood (1-5)</Label>
            <Select
              value={factor.likelihood.toString()}
              onValueChange={(value) => updateFactor(category, factor.id, "likelihood", parseInt(value))}
            >
              <SelectTrigger data-testid={`select-pestle-${category.toLowerCase()}-likelihood-${factor.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Very Low</SelectItem>
                <SelectItem value="2">2 - Low</SelectItem>
                <SelectItem value="3">3 - Medium</SelectItem>
                <SelectItem value="4">4 - High</SelectItem>
                <SelectItem value="5">5 - Very High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Impact (1-5)</Label>
            <Select
              value={factor.impact.toString()}
              onValueChange={(value) => updateFactor(category, factor.id, "impact", parseInt(value))}
            >
              <SelectTrigger data-testid={`select-pestle-${category.toLowerCase()}-impact-${factor.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Minimal</SelectItem>
                <SelectItem value="2">2 - Minor</SelectItem>
                <SelectItem value="3">3 - Moderate</SelectItem>
                <SelectItem value="4">4 - Significant</SelectItem>
                <SelectItem value="5">5 - Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Orientation</Label>
            <Select
              value={factor.orientation}
              onValueChange={(value) => updateFactor(category, factor.id, "orientation", value)}
            >
              <SelectTrigger data-testid={`select-pestle-${category.toLowerCase()}-orientation-${factor.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Risk">Risk</SelectItem>
                <SelectItem value="Opportunity">Opportunity</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Response Status</Label>
            <Select
              value={factor.status}
              onValueChange={(value) => updateFactor(category, factor.id, "status", value)}
            >
              <SelectTrigger data-testid={`select-pestle-${category.toLowerCase()}-status-${factor.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No action">No action</SelectItem>
                <SelectItem value="Monitoring">Monitoring</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="Active response">Active response</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs">Strategic Implications</Label>
            <Textarea
              value={factor.implications}
              onChange={(e) => updateFactor(category, factor.id, "implications", e.target.value)}
              placeholder="We must accelerate X, de-risk Y, build capability Z..."
              className="min-h-[60px]"
              data-testid={`input-pestle-${category.toLowerCase()}-implications-${factor.id}`}
            />
          </div>

          <div>
            <Label className="text-xs">Key Indicators / KPIs</Label>
            <Input
              value={factor.indicators}
              onChange={(e) => updateFactor(category, factor.id, "indicators", e.target.value)}
              placeholder="CPI, unemployment rate, etc."
              data-testid={`input-pestle-${category.toLowerCase()}-indicators-${factor.id}`}
            />
          </div>

          <div>
            <Label className="text-xs">Accountable Owner</Label>
            <Input
              value={factor.owner}
              onChange={(e) => updateFactor(category, factor.id, "owner", e.target.value)}
              placeholder="Executive or function"
              data-testid={`input-pestle-${category.toLowerCase()}-owner-${factor.id}`}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderCategory = (category: CategoryType) => {
    const config = categoryConfig[category];
    const Icon = config.icon;
    const factors = data[config.key as keyof PestleData] as Factor[];
    const isOpen = openCategories[category];

    return (
      <Card key={category} className={`border-l-4 ${config.borderColor}`}>
        <Collapsible open={isOpen} onOpenChange={() => toggleCategory(category)}>
          <CardHeader className={`pb-3 ${config.bgColor}`}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className={`flex items-center gap-2 ${config.color}`}>
                  <Icon className="w-5 h-5" />
                  {category} ({factors.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); addFactor(category); }}
                    data-testid={`button-pestle-add-${category.toLowerCase()}`}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Factor
                  </Button>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{config.description}</p>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-4">
              {factors.map((factor, index) => renderFactorCard(category, factor, index))}
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
                <Button variant="ghost" size="sm" data-testid="button-pestle-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">PESTLE Analysis</h1>
                <p className="text-gray-600 dark:text-gray-400">External Macro-Environment Scanning Framework</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={exportDocx} data-testid="button-pestle-export-docx">
                <FileText className="w-4 h-4 mr-2" />
                Word Doc
              </Button>
              <Button onClick={exportPDF} data-testid="button-pestle-export-pdf">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          <div ref={containerRef} className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
            <Card className="border-l-4 border-l-gray-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-700 dark:text-gray-300">Analysis Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-xs">PESTLE Title</Label>
                    <Input
                      value={data.title}
                      onChange={(e) => updateHeader("title", e.target.value)}
                      placeholder="e.g., 2026-2028 US Healthcare PESTLE"
                      data-testid="input-pestle-title"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Scope</Label>
                    <Select value={data.scope} onValueChange={(value) => updateHeader("scope", value)}>
                      <SelectTrigger data-testid="select-pestle-scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                        <SelectItem value="Business Unit">Business Unit</SelectItem>
                        <SelectItem value="Geography">Geography</SelectItem>
                        <SelectItem value="Market Segment">Market Segment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Time Horizon</Label>
                    <Select value={data.timeHorizon} onValueChange={(value) => updateHeader("timeHorizon", value)}>
                      <SelectTrigger data-testid="select-pestle-time-horizon">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-12 months">0-12 months</SelectItem>
                        <SelectItem value="1-3 years">1-3 years</SelectItem>
                        <SelectItem value="3-5 years">3-5 years</SelectItem>
                        <SelectItem value="5+ years">5+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Owner</Label>
                    <Input
                      value={data.owner}
                      onChange={(e) => updateHeader("owner", e.target.value)}
                      placeholder="Executive sponsor or Strategy Office lead"
                      data-testid="input-pestle-owner"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Contributors</Label>
                    <Input
                      value={data.contributors}
                      onChange={(e) => updateHeader("contributors", e.target.value)}
                      placeholder="Finance, HR, IT, Operations, etc."
                      data-testid="input-pestle-contributors"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {(["Political", "Economic", "Social", "Technological", "Legal", "Environmental"] as CategoryType[]).map(category => renderCategory(category))}
          </div>
        </div>
      </main>
    </div>
  );
}
