import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/use-role";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { queryClient as qc } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Presentation,
  Plus,
  Edit,
  Trash2,
  Play,
  Download,
  ArrowLeft,
  Save,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import PptxGenJS from "pptxgenjs";


interface Slide {
  id: string;
  type: "title" | "summary" | "strategy" | "strategy_detail";
  title: string;
  subtitle?: string;
  included: boolean;
  commentary?: string;
  data?: any;
}

interface ReportDeck {
  id: string;
  title: string;
  reportDate: string;
  status: string;
  slides: string;
  snapshotData: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  createdBy: string;
}

type ViewMode = "list" | "editor" | "presentation";

const MU_BRAND = {
  black: "#000000",
  gold: "#FDB719",
  blackTint1: "#333333",
  blackTint2: "#989898",
  blackTint3: "#D4D4D4",
  goldTint1: "#FFD17D",
  goldTint2: "#FFDFA5",
  goldTint3: "#FFEDCF",
  bluff: "#453D3F",
  limestone: "#D4D4D4",
  burrOak: "#7F4A0F",
  slate: "#4A596E",
  mulberry: "#6E0026",
  sunrise: "#EF553F",
  sunriseShade: "#993429",
  sunriseTint: "#F2715F",
  botanic: "#008486",
  botanicShade: "#004243",
  botanicTint: "#99CECF",
  white: "#FFFFFF",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  NYS: { bg: MU_BRAND.limestone, text: MU_BRAND.bluff, label: "Not Yet Started" },
  IP: { bg: MU_BRAND.goldTint3, text: MU_BRAND.burrOak, label: "In Progress" },
  OT: { bg: MU_BRAND.botanicTint, text: MU_BRAND.botanicShade, label: "On Track" },
  B: { bg: MU_BRAND.goldTint1, text: MU_BRAND.burrOak, label: "Behind" },
  CR: { bg: MU_BRAND.sunriseTint, text: MU_BRAND.black, label: "Critical" },
  C: { bg: MU_BRAND.botanicTint, text: MU_BRAND.botanicShade, label: "Complete" },
};

function getStatusStyle(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.NYS;
}

function SlideRenderer({ slide, scale = 1 }: { slide: Slide; scale?: number }) {
  switch (slide.type) {
    case "title":
      return <TitleSlide slide={slide} scale={scale} />;
    case "summary":
      return <SummarySlide slide={slide} scale={scale} />;
    case "strategy":
      return <StrategySlide slide={slide} scale={scale} />;
    case "strategy_detail":
      return <StrategyDetailSlide slide={slide} scale={scale} />;
    default:
      return (
        <div className="flex items-center justify-center h-full bg-white rounded-xl p-8">
          <p className="text-gray-400">Unknown slide type</p>
        </div>
      );
  }
}

function TitleSlide({ slide, scale = 1 }: { slide: Slide; scale?: number }) {
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundColor: MU_BRAND.black,
        padding: `${2 * scale}rem`,
      }}
    >
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: MU_BRAND.blackTint1 }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full translate-y-1/2 -translate-x-1/2" style={{ backgroundColor: MU_BRAND.blackTint1 }} />
      </div>
      <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: MU_BRAND.gold }} />
      <div className="relative z-10 text-center max-w-3xl">
        <h1
          className="font-bold mb-4 leading-tight"
          style={{ fontSize: `${2.5 * scale}rem`, color: MU_BRAND.gold }}
        >
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p
            className="font-light"
            style={{ fontSize: `${1.25 * scale}rem`, color: MU_BRAND.white }}
          >
            {slide.subtitle}
          </p>
        )}
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1.5" style={{ backgroundColor: MU_BRAND.gold }} />
    </div>
  );
}

function TrendBadge({ value, label, invert = false }: { value: number; label?: string; invert?: boolean }) {
  if (value === 0) return null;
  const isPositive = invert ? value < 0 : value > 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
      style={{
        backgroundColor: isPositive ? MU_BRAND.botanicTint : MU_BRAND.sunriseTint,
        color: isPositive ? MU_BRAND.botanicShade : MU_BRAND.black,
      }}
    >
      {value > 0 ? '+' : ''}{value}{label}
    </span>
  );
}

function SummarySlide({ slide, scale = 1 }: { slide: Slide; scale?: number }) {
  const data = slide.data || {};
  const strategiesCount = data.strategiesCount || 0;
  const avgProgress = data.avgProgress || 0;
  const projects = data.projects || {};
  const actionsData = data.actions || {};
  const barriersData = data.barriers || {};
  const trends = data.trends;

  const projectsByStatus: Record<string, number> = {};
  if (projects.critical) projectsByStatus['CR'] = projects.critical;
  if (projects.behind) projectsByStatus['B'] = projects.behind;
  if (projects.onTrack) projectsByStatus['OT'] = projects.onTrack;
  if (projects.completed) projectsByStatus['C'] = projects.completed;
  if (projects.notStarted) projectsByStatus['NYS'] = projects.notStarted;

  return (
    <div
      className="w-full h-full rounded-xl bg-white flex flex-col overflow-auto relative"
      style={{ padding: `${1.5 * scale}rem` }}
    >
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: MU_BRAND.gold }} />
      <div className="mb-4">
        <h2
          className="font-bold"
          style={{ fontSize: `${1.5 * scale}rem`, color: MU_BRAND.black }}
        >
          {slide.title}
        </h2>
        <div className="mt-1 h-0.5 w-16" style={{ backgroundColor: MU_BRAND.gold }} />
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1">
        <div
          className="rounded-xl p-4 flex flex-col justify-center"
          style={{ backgroundColor: MU_BRAND.goldTint3 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4" style={{ color: MU_BRAND.burrOak }} />
            <span className="text-xs font-medium" style={{ color: MU_BRAND.burrOak }}>
              Active Strategies
            </span>
          </div>
          <span
            className="font-bold"
            style={{ fontSize: `${1.75 * scale}rem`, color: MU_BRAND.black }}
          >
            {strategiesCount}
          </span>
        </div>
        <div
          className="rounded-xl p-4 flex flex-col justify-center"
          style={{ backgroundColor: MU_BRAND.goldTint3 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4" style={{ color: MU_BRAND.burrOak }} />
            <span className="text-xs font-medium" style={{ color: MU_BRAND.burrOak }}>
              Avg Progress
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="font-bold"
              style={{ fontSize: `${1.75 * scale}rem`, color: MU_BRAND.botanic }}
            >
              {Math.round(avgProgress)}%
            </span>
            {trends && <TrendBadge value={trends.avgProgressChange} label="%" />}
          </div>
        </div>
        <div
          className="rounded-xl p-4 col-span-2"
          style={{ backgroundColor: MU_BRAND.goldTint3 }}
        >
          <span
            className="text-xs font-medium block mb-2"
            style={{ color: MU_BRAND.bluff }}
          >
            Projects by Status ({projects.total || 0} total)
          </span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(projectsByStatus).map(([status, count]) => {
              const style = getStatusStyle(status);
              return (
                <div
                  key={status}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: style.bg, color: style.text }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: style.text }}
                  />
                  {style.label}: {count}
                </div>
              );
            })}
          </div>
          {trends && (trends.criticalChange !== 0 || trends.behindChange !== 0 || trends.completedChange !== 0) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {trends.criticalChange !== 0 && (
                <TrendBadge value={trends.criticalChange} label=" critical" invert />
              )}
              {trends.behindChange !== 0 && (
                <TrendBadge value={trends.behindChange} label=" behind" invert />
              )}
              {trends.completedChange !== 0 && (
                <TrendBadge value={trends.completedChange} label=" completed" />
              )}
            </div>
          )}
        </div>
        <div
          className="rounded-xl p-4 flex flex-col justify-center"
          style={{ backgroundColor: MU_BRAND.goldTint3 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4" style={{ color: MU_BRAND.burrOak }} />
            <span className="text-xs font-medium" style={{ color: MU_BRAND.burrOak }}>
              Actions
            </span>
          </div>
          <div className="flex gap-3">
            <div>
              <span
                className="font-bold block"
                style={{ fontSize: `${1.25 * scale}rem`, color: MU_BRAND.black }}
              >
                {actionsData.inProgress || 0}
              </span>
              <span className="text-[10px]" style={{ color: MU_BRAND.burrOak }}>
                In Progress
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span
                  className="font-bold block"
                  style={{ fontSize: `${1.25 * scale}rem`, color: MU_BRAND.botanic }}
                >
                  {actionsData.achieved || 0}
                </span>
                {trends && <TrendBadge value={trends.actionsAchievedChange} />}
              </div>
              <span className="text-[10px]" style={{ color: MU_BRAND.botanicShade }}>
                Achieved
              </span>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl p-4 flex flex-col justify-center"
          style={{ backgroundColor: MU_BRAND.goldTint3 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" style={{ color: MU_BRAND.sunrise }} />
            <span className="text-xs font-medium" style={{ color: MU_BRAND.sunrise }}>
              Active Barriers
            </span>
          </div>
          <span
            className="font-bold"
            style={{ fontSize: `${1.75 * scale}rem`, color: MU_BRAND.sunrise }}
          >
            {barriersData.active || 0}
            {barriersData.high > 0 && (
              <span className="text-xs font-normal ml-1" style={{ color: MU_BRAND.sunriseShade }}>
                ({barriersData.high} high)
              </span>
            )}
          </span>
        </div>
      </div>
      {trends && (
        <div className="mt-3 pt-2 border-t text-[10px] text-right" style={{ borderColor: MU_BRAND.blackTint3, color: MU_BRAND.blackTint2 }}>
          Compared to {new Date(trends.previousDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function StrategySlide({ slide, scale = 1 }: { slide: Slide; scale?: number }) {
  const data = slide.data || {};
  const colorCode = data.colorCode || "#007AFF";
  const description = data.description || "";
  const progress = data.progress || 0;
  const projects = data.projects || [];
  const actionsTotal = data.actionsTotal || 0;
  const actionsAchieved = data.actionsAchieved || 0;
  const barriersActive = data.barriersActive || 0;
  const barriersHigh = data.barriersHigh || 0;
  const trend = data.trend;

  const groupedProjects: Record<string, any[]> = {};
  projects.forEach((p: any) => {
    const s = p.status || "NYS";
    if (!groupedProjects[s]) groupedProjects[s] = [];
    groupedProjects[s].push(p);
  });

  const statusOrder = ['CR', 'B', 'OT', 'IP', 'NYS', 'C'];

  return (
    <div
      className="w-full h-full rounded-xl bg-white flex flex-col overflow-auto relative"
      style={{ padding: `${1.5 * scale}rem` }}
    >
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: MU_BRAND.gold }} />
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: colorCode }}
        />
        <h2
          className="font-bold flex-1"
          style={{ fontSize: `${1.25 * scale}rem`, color: MU_BRAND.black }}
        >
          {slide.title}
        </h2>
      </div>
      {description && (
        <p
          className="text-xs mb-3 leading-relaxed"
          style={{ color: MU_BRAND.bluff }}
        >
          {description}
        </p>
      )}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: MU_BRAND.bluff }}>Progress</span>
            {trend && <TrendBadge value={trend.progressChange} label="%" />}
          </div>
          <span className="text-xs font-semibold" style={{ color: MU_BRAND.burrOak }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full" style={{ backgroundColor: MU_BRAND.blackTint3 }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: MU_BRAND.gold,
            }}
          />
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-auto">
        {statusOrder
          .filter(s => groupedProjects[s])
          .map(status => {
            const projs = groupedProjects[status];
            const statusStyle = getStatusStyle(status);
            return (
              <div key={status}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusStyle.text }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: statusStyle.text }}
                  >
                    {statusStyle.label} ({projs.length})
                  </span>
                </div>
                <div className="ml-3.5 space-y-0.5">
                  {projs.map((p: any, i: number) => (
                    <div
                      key={i}
                      className="text-xs py-0.5 px-2 rounded flex items-center gap-2"
                      style={{ color: MU_BRAND.black }}
                    >
                      <span>{p.title}</span>
                      {p.statusChange && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: MU_BRAND.goldTint3, color: MU_BRAND.burrOak }}>
                          {p.statusChange}
                        </span>
                      )}
                      {p.barrierCount > 0 && (
                        <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: MU_BRAND.sunriseTint, color: MU_BRAND.mulberry }}>
                          {p.barrierCount} barrier{p.barrierCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
      <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: `1px solid ${MU_BRAND.blackTint3}` }}>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" style={{ color: MU_BRAND.bluff }} />
          <span className="text-xs" style={{ color: MU_BRAND.bluff }}>
            {actionsAchieved}/{actionsTotal} Actions Achieved
          </span>
        </div>
        {barriersActive > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" style={{ color: MU_BRAND.sunrise }} />
            <span className="text-xs" style={{ color: MU_BRAND.sunrise }}>
              {barriersActive} Barrier{barriersActive > 1 ? 's' : ''}{barriersHigh > 0 ? ` (${barriersHigh} high)` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StrategyDetailSlide({ slide, scale = 1 }: { slide: Slide; scale?: number }) {
  const data = slide.data || {};
  const problemProjects = data.projects || [];

  return (
    <div
      className="w-full h-full rounded-xl bg-white flex flex-col overflow-auto relative"
      style={{ padding: `${1.5 * scale}rem` }}
    >
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: MU_BRAND.gold }} />
      <h2
        className="font-bold mb-4"
        style={{ fontSize: `${1.25 * scale}rem`, color: MU_BRAND.black }}
      >
        {slide.title}
      </h2>
      <div className="flex-1 space-y-3 overflow-auto">
        {problemProjects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: MU_BRAND.botanic }} />
              <p className="text-sm" style={{ color: MU_BRAND.botanic }}>All projects on track</p>
            </div>
          </div>
        ) : (
          problemProjects.map((project: any, i: number) => {
            const statusStyle = getStatusStyle(project.status || "B");
            return (
              <div
                key={i}
                className="rounded-lg border p-3"
                style={{ borderColor: statusStyle.text + "40" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm" style={{ color: MU_BRAND.black }}>
                    {project.title}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                  >
                    {statusStyle.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs" style={{ color: MU_BRAND.bluff }}>Progress:</span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: MU_BRAND.blackTint3 }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(project.progress || 0, 100)}%`,
                        backgroundColor: statusStyle.text,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: statusStyle.text }}>
                    {project.progress || 0}%
                  </span>
                </div>
                {project.barriers && project.barriers.length > 0 && (
                  <div className="mb-1">
                    <span className="text-[10px] font-medium uppercase" style={{ color: MU_BRAND.mulberry }}>
                      Barriers
                    </span>
                    <ul className="mt-0.5 space-y-0.5">
                      {project.barriers.map((b: any, bi: number) => (
                        <li key={bi} className="text-xs flex items-start gap-1" style={{ color: MU_BRAND.bluff }}>
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: MU_BRAND.mulberry }} />
                          {typeof b === 'string' ? b : b.title}
                          {b.severity && (b.severity === 'high' || b.severity === 'critical') && (
                            <span className="text-[9px] px-1 py-0.5 rounded font-medium ml-1" style={{ backgroundColor: MU_BRAND.sunriseTint, color: MU_BRAND.mulberry }}>{b.severity}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-3 mt-1">
                  <span className="text-[10px]" style={{ color: MU_BRAND.blackTint2 }}>
                    {project.actionsAchieved || 0}/{project.actionsTotal || 0} Actions Achieved
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PresentationMode({
  slides,
  onExit,
}: {
  slides: Slide[];
  onExit: () => void;
}) {
  const includedSlides = slides.filter((s) => s.included);
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, includedSlides.length - 1));
  }, [includedSlides.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit, goNext, goPrev]);

  if (includedSlides.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">No slides included in this deck</p>
          <Button variant="outline" onClick={onExit}>
            Exit
          </Button>
        </div>
      </div>
    );
  }

  const currentSlide = includedSlides[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onExit}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl aspect-[16/9]">
          <SlideRenderer slide={currentSlide} scale={1.3} />
        </div>
      </div>
      <div className="flex items-center justify-center gap-6 pb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <span className="text-white/80 text-sm font-medium min-w-[80px] text-center">
          {currentIndex + 1} / {includedSlides.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={goNext}
          disabled={currentIndex === includedSlides.length - 1}
          className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

async function exportToPptx(slides: Slide[], title: string) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = title;

  const includedSlides = slides.filter((s) => s.included);

  for (const slide of includedSlides) {
    const pptSlide = pptx.addSlide();

    if (slide.type === "title") {
      pptSlide.background = {
        fill: "000000",
      };
      pptSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: "100%", h: 0.08,
        fill: { color: "FDB719" },
      });
      pptSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 5.17, w: "100%", h: 0.08,
        fill: { color: "FDB719" },
      });
      pptSlide.addText(slide.title, {
        x: 1,
        y: 2,
        w: "80%",
        fontSize: 36,
        bold: true,
        color: "FDB719",
        align: "center",
      });
      if (slide.subtitle) {
        pptSlide.addText(slide.subtitle, {
          x: 1,
          y: 3.5,
          w: "80%",
          fontSize: 18,
          color: "FFFFFF",
          align: "center",
        });
      }
    } else if (slide.type === "summary") {
      const data = slide.data || {};
      pptSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: "100%", h: 0.06,
        fill: { color: "FDB719" },
      });
      pptSlide.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: "90%",
        fontSize: 24,
        bold: true,
        color: "000000",
      });
      pptSlide.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 0.65, w: 1.2, h: 0.04,
        fill: { color: "FDB719" },
      });
      const metrics = [
        { label: "Active Strategies", value: String(data.strategiesCount || 0), color: "7F4A0F" },
        { label: "Avg Progress", value: `${Math.round(data.avgProgress || 0)}%`, color: "008486" },
        { label: "Active Barriers", value: String(data.barriers?.active || 0), color: "EF553F" },
        {
          label: "Actions Achieved",
          value: `${data.actions?.achieved || 0}/${data.actions?.total || 0}`,
          color: "7F4A0F",
        },
      ];
      metrics.forEach((m, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5 + col * 4.5,
          y: 1.2 + row * 1.8,
          w: 4,
          h: 1.5,
          fill: { color: "FFEDCF" },
          rectRadius: 0.1,
        });
        pptSlide.addText(m.label, {
          x: 0.7 + col * 4.5,
          y: 1.3 + row * 1.8,
          w: 3.6,
          fontSize: 11,
          color: "453D3F",
        });
        pptSlide.addText(m.value, {
          x: 0.7 + col * 4.5,
          y: 1.8 + row * 1.8,
          w: 3.6,
          fontSize: 28,
          bold: true,
          color: m.color,
        });
      });

      if (data.projects) {
        const p = data.projects;
        const parts = [];
        if (p.critical) parts.push(`Critical: ${p.critical}`);
        if (p.behind) parts.push(`Behind: ${p.behind}`);
        if (p.onTrack) parts.push(`On Track: ${p.onTrack}`);
        if (p.completed) parts.push(`Completed: ${p.completed}`);
        if (p.notStarted) parts.push(`Not Started: ${p.notStarted}`);
        pptSlide.addText(`Projects (${p.total || 0}): ${parts.join('  |  ')}`, {
          x: 0.5,
          y: 4.8,
          w: "90%",
          fontSize: 10,
          color: "453D3F",
        });
      }
    } else if (slide.type === "strategy") {
      const data = slide.data || {};
      pptSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: "100%", h: 0.06,
        fill: { color: "FDB719" },
      });
      pptSlide.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: "90%",
        fontSize: 22,
        bold: true,
        color: "000000",
      });
      if (data.description) {
        pptSlide.addText(data.description, {
          x: 0.5,
          y: 0.7,
          w: "90%",
          fontSize: 10,
          color: "453D3F",
        });
      }
      const progress = data.progress || 0;
      pptSlide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: 1,
        w: 8.5,
        h: 0.3,
        fill: { color: "D4D4D4" },
        rectRadius: 0.05,
      });
      if (progress > 0) {
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5,
          y: 1,
          w: Math.max(0.1, (progress / 100) * 8.5),
          h: 0.3,
          fill: { color: "FDB719" },
          rectRadius: 0.05,
        });
      }
      pptSlide.addText(`${Math.round(progress)}%`, {
        x: 9.2,
        y: 0.9,
        w: 1,
        fontSize: 12,
        bold: true,
        color: "7F4A0F",
      });

      const projects = data.projects || [];
      let yPos = 1.6;
      const grouped: Record<string, any[]> = {};
      projects.forEach((p: any) => {
        const s = p.status || "NYS";
        if (!grouped[s]) grouped[s] = [];
        grouped[s].push(p);
      });
      Object.entries(grouped).forEach(([status, projs]) => {
        const style = getStatusStyle(status);
        pptSlide.addText(`${style.label} (${projs.length})`, {
          x: 0.5,
          y: yPos,
          w: 8,
          fontSize: 11,
          bold: true,
          color: style.text.replace("#", ""),
        });
        yPos += 0.3;
        projs.forEach((p: any) => {
          if (yPos < 5) {
            pptSlide.addText(`• ${p.title}`, {
              x: 0.8,
              y: yPos,
              w: 8,
              fontSize: 10,
              color: "000000",
            });
            yPos += 0.25;
          }
        });
        yPos += 0.1;
      });

      pptSlide.addText(
        `${data.actionsAchieved || 0}/${data.actionsTotal || 0} Actions Achieved  |  ${data.barriersActive || 0} Barriers`,
        {
          x: 0.5,
          y: 5,
          w: 8,
          fontSize: 10,
          color: "453D3F",
        }
      );
    } else if (slide.type === "strategy_detail") {
      const data = slide.data || {};
      pptSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: "100%", h: 0.06,
        fill: { color: "FDB719" },
      });
      pptSlide.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: "90%",
        fontSize: 22,
        bold: true,
        color: "000000",
      });
      const detailProjects = data.projects || [];
      let yPos = 1.2;
      detailProjects.forEach((project: any) => {
        if (yPos > 4.5) return;
        const statusStyle = getStatusStyle(project.status || "B");
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5,
          y: yPos,
          w: 9,
          h: 1,
          fill: { color: "FAFAFA" },
          line: { color: statusStyle.text.replace("#", ""), width: 1 },
          rectRadius: 0.05,
        });
        pptSlide.addText(project.title, {
          x: 0.7,
          y: yPos + 0.1,
          w: 6,
          fontSize: 12,
          bold: true,
          color: "000000",
        });
        pptSlide.addText(statusStyle.label, {
          x: 7.5,
          y: yPos + 0.1,
          w: 1.8,
          fontSize: 9,
          color: statusStyle.text.replace("#", ""),
          align: "right",
        });
        pptSlide.addText(`Progress: ${project.progress || 0}%`, {
          x: 0.7,
          y: yPos + 0.45,
          w: 4,
          fontSize: 9,
          color: "453D3F",
        });
        if (project.barriers && project.barriers.length > 0) {
          const barrierNames = project.barriers.map((b: any) => typeof b === 'string' ? b : b.title).join(", ");
          pptSlide.addText(`Barriers: ${barrierNames}`, {
            x: 0.7,
            y: yPos + 0.7,
            w: 8.5,
            fontSize: 8,
            color: "6E0026",
          });
        }
        yPos += 1.2;
      });
      if (detailProjects.length === 0) {
        pptSlide.addText("All projects on track", {
          x: 0.5,
          y: 2.5,
          w: "90%",
          fontSize: 16,
          color: "008486",
          align: "center",
        });
      }
    }

    if (slide.commentary) {
      pptSlide.addNotes(slide.commentary);
    }
  }

  await pptx.writeFile({ fileName: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pptx` });
}

export default function ReportOut() {
  const { canEditProjects } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingDeck, setEditingDeck] = useState<ReportDeck | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [snapshotData, setSnapshotData] = useState<any>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [deckTitle, setDeckTitle] = useState("Strategy Report");
  const [reportDate, setReportDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isNewDeck, setIsNewDeck] = useState(false);

  const { data: decks, isLoading: decksLoading } = useQuery<ReportDeck[]>({
    queryKey: ["/api/report-out-decks"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/report-out-decks/generate");
      return response.json();
    },
    onSuccess: (data: { slides: Slide[]; snapshotData: any }) => {
      const generatedSlides = data.slides.map((s, i) => ({
        ...s,
        id: s.id || `slide-${i}`,
        included: true,
        commentary: s.commentary || "",
      }));
      setSlides(generatedSlides);
      setSnapshotData(data.snapshotData);
      setDeckTitle("Strategy Report - " + format(new Date(), "MMM dd, yyyy"));
      setReportDate(format(new Date(), "yyyy-MM-dd"));
      setSelectedSlideIndex(0);
      setIsNewDeck(true);
      setEditingDeck(null);
      setViewMode("editor");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate report slides",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: deckTitle,
        reportDate,
        slides: JSON.stringify(slides),
        snapshotData: JSON.stringify(snapshotData),
      };
      if (editingDeck && !isNewDeck) {
        const response = await apiRequest(
          "PATCH",
          `/api/report-out-decks/${editingDeck.id}`,
          payload
        );
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/report-out-decks", payload);
        return response.json();
      }
    },
    onSuccess: (data: ReportDeck) => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-out-decks"] });
      setEditingDeck(data);
      setIsNewDeck(false);
      toast({
        title: "Success",
        description: "Report deck saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save report deck",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (deckId: string) => {
      await apiRequest("DELETE", `/api/report-out-decks/${deckId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-out-decks"] });
      toast({
        title: "Success",
        description: "Report deck deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete report deck",
        variant: "destructive",
      });
    },
  });

  const openDeckForEditing = (deck: ReportDeck) => {
    let parsedSlides: Slide[] = [];
    let parsedSnapshot: any = null;
    try {
      parsedSlides = JSON.parse(deck.slides);
    } catch {
      parsedSlides = [];
    }
    try {
      parsedSnapshot = JSON.parse(deck.snapshotData);
    } catch {
      parsedSnapshot = null;
    }
    setEditingDeck(deck);
    setSlides(parsedSlides);
    setSnapshotData(parsedSnapshot);
    setDeckTitle(deck.title);
    setReportDate(deck.reportDate);
    setSelectedSlideIndex(0);
    setIsNewDeck(false);
    setViewMode("editor");
  };

  const openDeckForPresentation = (deck: ReportDeck) => {
    let parsedSlides: Slide[] = [];
    try {
      parsedSlides = JSON.parse(deck.slides);
    } catch {
      parsedSlides = [];
    }
    setSlides(parsedSlides);
    setViewMode("presentation");
  };

  const handleSlideToggle = (index: number, included: boolean) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, included } : s))
    );
  };

  const handleCommentaryChange = (index: number, commentary: string) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, commentary } : s))
    );
  };

  const handleSlideUpdate = (index: number, updates: Partial<Slide>) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const handleSlideDataUpdate = (index: number, dataUpdates: Record<string, any>) => {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, data: { ...s.data, ...dataUpdates } } : s
      )
    );
  };

  const handleProjectDataUpdate = (slideIndex: number, projectIndex: number, field: string, value: any) => {
    setSlides((prev) =>
      prev.map((s, i) => {
        if (i !== slideIndex) return s;
        const projects = [...(s.data?.projects || [])];
        projects[projectIndex] = { ...projects[projectIndex], [field]: value };
        return { ...s, data: { ...s.data, projects } };
      })
    );
  };

  const handleMoveSlide = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= slides.length) return;
    setSlides((prev) => {
      const newSlides = [...prev];
      [newSlides[fromIndex], newSlides[toIndex]] = [newSlides[toIndex], newSlides[fromIndex]];
      return newSlides;
    });
    setSelectedSlideIndex(toIndex);
  };

  const handleDeleteSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
    if (selectedSlideIndex >= slides.length - 1) {
      setSelectedSlideIndex(Math.max(0, slides.length - 2));
    }
  };

  const handleAddCustomSlide = () => {
    const newSlide: Slide = {
      id: `custom-${Date.now()}`,
      type: "title",
      title: "Custom Slide",
      subtitle: "Add your content here",
      included: true,
      commentary: "",
      data: {},
    };
    const insertAt = selectedSlideIndex + 1;
    setSlides((prev) => [
      ...prev.slice(0, insertAt),
      newSlide,
      ...prev.slice(insertAt),
    ]);
    setSelectedSlideIndex(insertAt);
  };

  const handleExportPptx = async () => {
    try {
      await exportToPptx(slides, deckTitle);
      toast({
        title: "Success",
        description: "PowerPoint file downloaded",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to export PowerPoint",
        variant: "destructive",
      });
    }
  };

  const canEdit = canEditProjects();

  if (viewMode === "presentation") {
    return (
      <PresentationMode
        slides={slides}
        onExit={() => setViewMode(editingDeck || isNewDeck ? "editor" : "list")}
      />
    );
  }

  if (viewMode === "editor") {
    const currentSlide = slides[selectedSlideIndex];

    return (
      <div className="flex h-screen" style={{ backgroundColor: "#F5F5F7" }}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header
            className="px-4 py-3 flex items-center gap-3"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-200" />
            <Input
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              className="max-w-xs font-semibold border-none bg-transparent text-lg focus-visible:ring-0 px-1"
              style={{ color: "#1D1D1F" }}
            />
            <Input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-40 text-sm"
            />
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCustomSlide}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Slide
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="flex items-center gap-2"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("presentation")}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPptx}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PPTX
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2"
              style={{ backgroundColor: "#007AFF" }}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </Button>
          </header>

          <div className="flex-1 flex overflow-hidden">
            <div
              className="w-[250px] flex-shrink-0 overflow-y-auto border-r"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                borderColor: "rgba(0, 0, 0, 0.1)",
              }}
            >
              <div className="p-3 space-y-1">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`group rounded-lg p-2.5 cursor-pointer transition-all ${
                      selectedSlideIndex === index
                        ? "ring-2 shadow-sm"
                        : "hover:bg-white/80"
                    }`}
                    style={{
                      backgroundColor:
                        selectedSlideIndex === index ? "#FFFFFF" : "transparent",
                      borderColor:
                        selectedSlideIndex === index ? "#007AFF" : "transparent",
                    }}
                    onClick={() => setSelectedSlideIndex(index)}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={slide.included}
                        onCheckedChange={(checked) =>
                          handleSlideToggle(index, checked as boolean)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase"
                            style={{
                              backgroundColor:
                                slide.type === "title"
                                  ? "#EEF2FF"
                                  : slide.type === "summary"
                                  ? "#F0FDF4"
                                  : slide.type === "strategy_detail"
                                  ? "#FEF2F2"
                                  : "#FFF7ED",
                              color:
                                slide.type === "title"
                                  ? "#4F46E5"
                                  : slide.type === "summary"
                                  ? "#059669"
                                  : slide.type === "strategy_detail"
                                  ? "#DC2626"
                                  : "#EA580C",
                            }}
                          >
                            {slide.type.replace("_", " ")}
                          </span>
                        </div>
                        <p
                          className="text-xs font-medium truncate"
                          style={{
                            color: slide.included ? "#1D1D1F" : "#86868B",
                          }}
                        >
                          {slide.title}
                        </p>
                      </div>
                      {selectedSlideIndex === index && (
                        <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                            disabled={index === 0}
                            onClick={() => handleMoveSlide(index, "up")}
                          >
                            <ChevronUp className="w-3 h-3 text-gray-500" />
                          </button>
                          <button
                            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                            disabled={index === slides.length - 1}
                            onClick={() => handleMoveSlide(index, "down")}
                          >
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                          </button>
                          <button
                            className="p-0.5 rounded hover:bg-red-100"
                            onClick={() => handleDeleteSlide(index)}
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                    {!slide.included && (
                      <div className="mt-1 ml-6">
                        <span className="text-[10px] text-gray-400 italic">
                          Excluded
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {currentSlide ? (
                <div className="max-w-4xl mx-auto space-y-4">
                  <div
                    className="aspect-[16/9] rounded-xl shadow-lg overflow-hidden"
                    style={{ border: "1px solid rgba(0,0,0,0.1)" }}
                  >
                    <SlideRenderer slide={currentSlide} scale={1} />
                  </div>

                  <div className="rounded-xl bg-white p-4 shadow-sm space-y-4" style={{ border: "1px solid rgba(0,0,0,0.08)" }}>
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Edit className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>Edit Slide Content</span>
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#86868B" }}>
                        Title
                      </label>
                      <Input
                        value={currentSlide.title}
                        onChange={(e) => handleSlideUpdate(selectedSlideIndex, { title: e.target.value })}
                        className="bg-gray-50 focus-visible:ring-1 focus-visible:ring-blue-200"
                      />
                    </div>

                    {(currentSlide.type === "title") && (
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "#86868B" }}>
                          Subtitle
                        </label>
                        <Input
                          value={currentSlide.subtitle || ""}
                          onChange={(e) => handleSlideUpdate(selectedSlideIndex, { subtitle: e.target.value })}
                          placeholder="Add a subtitle..."
                          className="bg-gray-50 focus-visible:ring-1 focus-visible:ring-blue-200"
                        />
                      </div>
                    )}

                    {(currentSlide.type === "strategy" || currentSlide.type === "strategy_detail") && currentSlide.data?.description !== undefined && (
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "#86868B" }}>
                          Description
                        </label>
                        <Textarea
                          value={currentSlide.data?.description || ""}
                          onChange={(e) => handleSlideDataUpdate(selectedSlideIndex, { description: e.target.value })}
                          placeholder="Strategy description..."
                          className="min-h-[60px] resize-none bg-gray-50 focus-visible:ring-1 focus-visible:ring-blue-200"
                        />
                      </div>
                    )}

                    {(currentSlide.type === "strategy" || currentSlide.type === "strategy_detail") && currentSlide.data?.projects?.length > 0 && (
                      <div>
                        <label className="text-xs font-medium mb-2 block" style={{ color: "#86868B" }}>
                          Projects
                        </label>
                        <div className="space-y-2">
                          {currentSlide.data.projects.map((project: any, pi: number) => (
                            <div key={pi} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusStyle(project.status || "NYS").text }} />
                              <Input
                                value={project.title}
                                onChange={(e) => handleProjectDataUpdate(selectedSlideIndex, pi, "title", e.target.value)}
                                className="flex-1 h-8 text-sm border-none bg-transparent focus-visible:ring-1 focus-visible:ring-blue-200"
                              />
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: getStatusStyle(project.status || "NYS").bg, color: getStatusStyle(project.status || "NYS").text }}>
                                {getStatusStyle(project.status || "NYS").label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#86868B" }}>
                        Commentary / Talking Points
                      </label>
                      <Textarea
                        value={currentSlide.commentary || ""}
                        onChange={(e) =>
                          handleCommentaryChange(selectedSlideIndex, e.target.value)
                        }
                        placeholder="Add notes for this slide..."
                        className="min-h-[80px] resize-none bg-gray-50 focus-visible:ring-1 focus-visible:ring-blue-200"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">Select a slide to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (decksLoading) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: "#F5F5F7" }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: "#007AFF" }} />
            <p style={{ color: "#86868B" }}>Loading report decks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: "#F5F5F7" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="px-6 py-5"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "#FF9500" }}
              >
                <Presentation className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: "#1D1D1F" }}
                >
                  Report Out
                </h1>
                <p style={{ color: "#86868B" }}>
                  Build and present strategy report decks
                </p>
              </div>
            </div>
            {canEdit && (
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex items-center gap-2 rounded-full px-5"
                style={{ backgroundColor: "#007AFF" }}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                New Report
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {!decks || decks.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Presentation className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No report decks yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Create your first report to build a presentation from your
                      strategy data.
                    </p>
                    {canEdit && (
                      <Button
                        onClick={() => generateMutation.mutate()}
                        disabled={generateMutation.isPending}
                        className="flex items-center gap-2 mx-auto"
                        style={{ backgroundColor: "#007AFF" }}
                      >
                        {generateMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Create Your First Report
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {decks.map((deck) => {
                  let slideCount = 0;
                  try {
                    slideCount = JSON.parse(deck.slides).length;
                  } catch {
                    slideCount = 0;
                  }
                  return (
                    <Card
                      key={deck.id}
                      className="group hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg leading-snug">
                            {deck.title}
                          </CardTitle>
                          <Badge
                            variant={
                              deck.status === "finalized"
                                ? "default"
                                : "secondary"
                            }
                            className="capitalize ml-2 flex-shrink-0"
                          >
                            {deck.status || "draft"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              {slideCount} slides
                            </div>
                            <div className="flex items-center gap-1.5">
                              <BarChart3 className="w-3.5 h-3.5" />
                              {format(
                                new Date(deck.reportDate),
                                "MMM dd, yyyy"
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400">
                            Created{" "}
                            {format(
                              new Date(deck.createdAt),
                              "MMM dd, yyyy"
                            )}
                          </p>
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeckForEditing(deck)}
                              className="flex items-center gap-1.5 text-xs"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeckForPresentation(deck)}
                              className="flex items-center gap-1.5 text-xs"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Present
                            </Button>
                            {canEdit && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Report Deck
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "
                                      {deck.title}"? This action cannot be
                                      undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        deleteMutation.mutate(deck.id)
                                      }
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}