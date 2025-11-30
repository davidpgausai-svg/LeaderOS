import { useState } from "react";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, FileText, CheckCircle2, AlertTriangle, TrendingUp, ShieldAlert, PlayCircle } from "lucide-react";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";

const defaultContent = {
  strengths: `• Strong market position and brand recognition
• Experienced leadership team with industry expertise
• Robust financial reserves and stable cash flow
• Established customer relationships and loyalty
• Proprietary technology or processes`,
  weaknesses: `• Limited geographic presence or market reach
• Dependency on key personnel or suppliers
• Aging infrastructure or technology debt
• Gaps in product/service portfolio
• Resource constraints in critical areas`,
  opportunities: `• Emerging markets and new customer segments
• Strategic partnerships or acquisition targets
• Technology advancements enabling innovation
• Regulatory changes creating competitive advantage
• Shifting customer preferences aligned with strengths`,
  threats: `• Increased competition from new entrants
• Economic uncertainty and market volatility
• Regulatory compliance requirements
• Technology disruption in the industry
• Talent acquisition and retention challenges`,
};

export default function SwotTemplate() {
  const [swotData, setSwotData] = useState(defaultContent);
  const { toast } = useToast();

  const handleTextChange = (section: keyof typeof defaultContent, value: string) => {
    setSwotData((prev) => ({ ...prev, [section]: value }));
  };

  const exportDocx = async () => {
    toast({ title: "Generating Word Doc...", description: "Please wait while we prepare your download." });
    
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: "SWOT Analysis", heading: HeadingLevel.TITLE }),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "Strengths", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(swotData.strengths),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "Weaknesses", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(swotData.weaknesses),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "Opportunities", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(swotData.opportunities),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "Threats", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(swotData.threats),
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
      link.download = "SWOT-Analysis.docx";
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
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/templates">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-templates">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Templates
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SWOT Analysis</h1>
                <p className="text-gray-600 dark:text-gray-400">Strategic Planning Framework</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-swot-tutorial">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Tutorial
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[640px]">
                  <DialogHeader>
                    <DialogTitle>SWOT Analysis Tutorial</DialogTitle>
                  </DialogHeader>
                  <div className="aspect-video flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Tutorial video coming soon</p>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={exportDocx} data-testid="button-swot-export-docx">
                <Download className="w-4 h-4 mr-2" />
                Download Word
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-600 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Strengths
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Internal positive factors</p>
              </CardHeader>
              <CardContent>
                <textarea 
                  className="w-full h-64 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm leading-relaxed dark:text-white"
                  value={swotData.strengths}
                  onChange={(e) => handleTextChange("strengths", e.target.value)}
                  data-testid="textarea-strengths"
                />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Weaknesses
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Internal negative factors</p>
              </CardHeader>
              <CardContent>
                <textarea 
                  className="w-full h-64 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm leading-relaxed dark:text-white"
                  value={swotData.weaknesses}
                  onChange={(e) => handleTextChange("weaknesses", e.target.value)}
                  data-testid="textarea-weaknesses"
                />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" /> Opportunities
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">External positive factors</p>
              </CardHeader>
              <CardContent>
                <textarea 
                  className="w-full h-64 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed dark:text-white"
                  value={swotData.opportunities}
                  onChange={(e) => handleTextChange("opportunities", e.target.value)}
                  data-testid="textarea-opportunities"
                />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Threats
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">External negative factors</p>
              </CardHeader>
              <CardContent>
                <textarea 
                  className="w-full h-64 p-3 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 text-sm leading-relaxed dark:text-white"
                  value={swotData.threats}
                  onChange={(e) => handleTextChange("threats", e.target.value)}
                  data-testid="textarea-threats"
                />
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 p-6 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">How to Use SWOT Analysis</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Internal Factors</h4>
                <ul className="space-y-2 list-disc list-inside">
                  <li><strong>Strengths:</strong> What advantages does your organization have? What do you do better than others?</li>
                  <li><strong>Weaknesses:</strong> What could you improve? Where do you have fewer resources than others?</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">External Factors</h4>
                <ul className="space-y-2 list-disc list-inside">
                  <li><strong>Opportunities:</strong> What trends could you take advantage of? What external changes could benefit you?</li>
                  <li><strong>Threats:</strong> What obstacles do you face? What are your competitors doing?</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
