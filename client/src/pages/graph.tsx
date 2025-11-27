import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GitBranch, Target, Layers, Zap, ZoomIn, ZoomOut } from "lucide-react";

type Strategy = {
  id: string;
  title: string;
  colorCode: string;
  status: string;
  progress: number;
};

type Project = {
  id: string;
  title: string;
  strategyId: string;
  status: string;
  progress: number;
  isArchived?: string;
};

type Action = {
  id: string;
  title: string;
  strategyId: string;
  projectId?: string | null;
  status: string;
  isArchived?: string;
};

type Dependency = {
  id: string;
  sourceType: "project" | "action";
  sourceId: string;
  targetType: "project" | "action";
  targetId: string;
};

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const COLUMN_WIDTH = 280;
const NODE_HEIGHT = 75;
const NODE_PADDING = 12;
const COLUMN_PADDING = 40;
const HEADER_HEIGHT = 20;

export default function Graph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredItem, setHoveredItem] = useState<{ type: string; id: string } | null>(null);
  const [lockedItem, setLockedItem] = useState<{ type: string; id: string } | null>(null);
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [scale, setScale] = useState(1);
  
  const activeItem = lockedItem || hoveredItem;

  const { data: strategies = [] } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: actions = [] } = useQuery<Action[]>({
    queryKey: ["/api/actions"],
  });

  const { data: dependencies = [] } = useQuery<Dependency[]>({
    queryKey: ["/api/dependencies"],
    queryFn: async () => {
      const response = await fetch("/api/dependencies");
      if (!response.ok) throw new Error("Failed to fetch dependencies");
      return response.json();
    },
  });

  const filteredStrategies = useMemo(() => {
    return strategies
      .filter((s) => s.status !== "Archived")
      .filter((s) => strategyFilter === "all" || s.id === strategyFilter)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [strategies, strategyFilter]);

  const filteredProjects = useMemo(() => {
    const strategyIds = new Set(filteredStrategies.map((s) => s.id));
    const strategyOrder = new Map(filteredStrategies.map((s, i) => [s.id, i]));
    return projects
      .filter((p) => strategyIds.has(p.strategyId))
      .filter((p) => p.isArchived !== "true")
      .sort((a, b) => {
        const orderA = strategyOrder.get(a.strategyId) ?? 999;
        const orderB = strategyOrder.get(b.strategyId) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title);
      });
  }, [projects, filteredStrategies]);

  const filteredActions = useMemo(() => {
    const strategyIds = new Set(filteredStrategies.map((s) => s.id));
    const strategyOrder = new Map(filteredStrategies.map((s, i) => [s.id, i]));
    return actions
      .filter((a) => strategyIds.has(a.strategyId))
      .filter((a) => a.isArchived !== "true")
      .sort((a, b) => {
        const orderA = strategyOrder.get(a.strategyId) ?? 999;
        const orderB = strategyOrder.get(b.strategyId) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title);
      });
  }, [actions, filteredStrategies]);

  const nodePositions = useMemo(() => {
    const positions: Record<string, NodePosition> = {};
    let strategyY = HEADER_HEIGHT;
    let projectY = HEADER_HEIGHT;
    let actionY = HEADER_HEIGHT;

    filteredStrategies.forEach((strategy) => {
      positions[`strategy-${strategy.id}`] = {
        x: COLUMN_PADDING,
        y: strategyY,
        width: COLUMN_WIDTH - COLUMN_PADDING * 2,
        height: NODE_HEIGHT,
      };
      strategyY += NODE_HEIGHT + NODE_PADDING;
    });

    filteredProjects.forEach((project) => {
      positions[`project-${project.id}`] = {
        x: COLUMN_WIDTH + COLUMN_PADDING,
        y: projectY,
        width: COLUMN_WIDTH - COLUMN_PADDING * 2,
        height: NODE_HEIGHT,
      };
      projectY += NODE_HEIGHT + NODE_PADDING;
    });

    filteredActions.forEach((action) => {
      positions[`action-${action.id}`] = {
        x: COLUMN_WIDTH * 2 + COLUMN_PADDING,
        y: actionY,
        width: COLUMN_WIDTH - COLUMN_PADDING * 2,
        height: NODE_HEIGHT,
      };
      actionY += NODE_HEIGHT + NODE_PADDING;
    });

    return positions;
  }, [filteredStrategies, filteredProjects, filteredActions]);

  const svgHeight = useMemo(() => {
    const strategyHeight = HEADER_HEIGHT + filteredStrategies.length * (NODE_HEIGHT + NODE_PADDING);
    const projectHeight = HEADER_HEIGHT + filteredProjects.length * (NODE_HEIGHT + NODE_PADDING);
    const actionHeight = HEADER_HEIGHT + filteredActions.length * (NODE_HEIGHT + NODE_PADDING);
    return Math.max(strategyHeight, projectHeight, actionHeight, 600);
  }, [filteredStrategies, filteredProjects, filteredActions]);

  const getStrategyColor = (strategyId: string) => {
    const strategy = strategies.find((s) => s.id === strategyId);
    return strategy?.colorCode || "#6B7280";
  };

  const getProjectForAction = (action: Action) => {
    return projects.find((p) => p.id === action.projectId);
  };

  const isInHierarchy = (type: string, id: string, itemStrategyId?: string, itemProjectId?: string | null) => {
    if (!activeItem) return true;
    
    if (activeItem.type === type && activeItem.id === id) return true;
    
    if (activeItem.type === "strategy") {
      if (type === "strategy") return activeItem.id === id;
      if (type === "project") return itemStrategyId === activeItem.id;
      if (type === "action") return itemStrategyId === activeItem.id;
    }
    
    if (activeItem.type === "project") {
      const activeProject = filteredProjects.find(p => p.id === activeItem.id);
      if (type === "strategy") return id === activeProject?.strategyId;
      if (type === "project") return activeItem.id === id;
      if (type === "action") return itemProjectId === activeItem.id || itemStrategyId === activeProject?.strategyId;
    }
    
    if (activeItem.type === "action") {
      const activeAction = filteredActions.find(a => a.id === activeItem.id);
      if (type === "strategy") return id === activeAction?.strategyId;
      if (type === "project") return id === activeAction?.projectId;
      if (type === "action") return activeItem.id === id;
    }
    
    return false;
  };
  
  const handleCardClick = (type: string, id: string) => {
    if (lockedItem?.type === type && lockedItem?.id === id) {
      setLockedItem(null);
    } else {
      setLockedItem({ type, id });
    }
  };

  const isRelatedToHovered = (type: string, id: string) => {
    if (!hoveredItem) return false;

    if (hoveredItem.type === type && hoveredItem.id === id) return true;

    const relatedDeps = dependencies.filter((d) => {
      if (hoveredItem.type === "project") {
        return (
          (d.sourceType === "project" && d.sourceId === hoveredItem.id) ||
          (d.targetType === "project" && d.targetId === hoveredItem.id)
        );
      }
      if (hoveredItem.type === "action") {
        return (
          (d.sourceType === "action" && d.sourceId === hoveredItem.id) ||
          (d.targetType === "action" && d.targetId === hoveredItem.id)
        );
      }
      return false;
    });

    return relatedDeps.some((d) => {
      if (type === "project") {
        return d.sourceId === id || d.targetId === id;
      }
      if (type === "action") {
        return d.sourceId === id || d.targetId === id;
      }
      return false;
    });
  };
  
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "achieved" || s === "c" || s === "completed" || s === "done") return "#22C55E";
    if (s === "in_progress" || s === "ot" || s === "on track") return "#3B82F6";
    if (s === "behind" || s === "b" || s === "at risk" || s === "blocked") return "#EF4444";
    return "#9CA3AF";
  };
  
  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "achieved" || s === "c" || s === "completed" || s === "done") return "DONE";
    if (s === "in_progress" || s === "ot") return "ON TRACK";
    if (s === "behind" || s === "b") return "BEHIND";
    if (s === "at risk") return "AT RISK";
    if (s === "blocked") return "BLOCKED";
    if (s === "not_started" || s === "nys") return "NOT STARTED";
    return status?.toUpperCase() || "";
  };

  const renderHierarchyLines = () => {
    const lines: JSX.Element[] = [];

    filteredProjects.forEach((project) => {
      const strategyPos = nodePositions[`strategy-${project.strategyId}`];
      const projectPos = nodePositions[`project-${project.id}`];

      if (strategyPos && projectPos) {
        const startX = strategyPos.x + strategyPos.width;
        const startY = strategyPos.y + strategyPos.height / 2;
        const endX = projectPos.x;
        const endY = projectPos.y + projectPos.height / 2;
        const midX = (startX + endX) / 2;

        const isHovered =
          hoveredItem?.type === "strategy" && hoveredItem?.id === project.strategyId;

        lines.push(
          <path
            key={`h-sp-${project.id}`}
            d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
            fill="none"
            stroke={getStrategyColor(project.strategyId)}
            strokeWidth={isHovered ? 2 : 1}
            strokeOpacity={isHovered ? 0.8 : 0.3}
            strokeDasharray="4,4"
          />
        );
      }
    });

    filteredActions.forEach((action) => {
      if (action.projectId) {
        const projectPos = nodePositions[`project-${action.projectId}`];
        const actionPos = nodePositions[`action-${action.id}`];

        if (projectPos && actionPos) {
          const startX = projectPos.x + projectPos.width;
          const startY = projectPos.y + projectPos.height / 2;
          const endX = actionPos.x;
          const endY = actionPos.y + actionPos.height / 2;
          const midX = (startX + endX) / 2;

          const isHovered =
            hoveredItem?.type === "project" && hoveredItem?.id === action.projectId;

          lines.push(
            <path
              key={`h-pa-${action.id}`}
              d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
              fill="none"
              stroke={getStrategyColor(action.strategyId)}
              strokeWidth={isHovered ? 2 : 1}
              strokeOpacity={isHovered ? 0.6 : 0.2}
              strokeDasharray="4,4"
            />
          );
        }
      } else {
        const strategyPos = nodePositions[`strategy-${action.strategyId}`];
        const actionPos = nodePositions[`action-${action.id}`];

        if (strategyPos && actionPos) {
          const startX = strategyPos.x + strategyPos.width;
          const startY = strategyPos.y + strategyPos.height / 2;
          const endX = actionPos.x;
          const endY = actionPos.y + actionPos.height / 2;
          const midX = startX + COLUMN_WIDTH;

          const isHovered =
            hoveredItem?.type === "strategy" && hoveredItem?.id === action.strategyId;

          lines.push(
            <path
              key={`h-sa-${action.id}`}
              d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`}
              fill="none"
              stroke={getStrategyColor(action.strategyId)}
              strokeWidth={isHovered ? 2 : 1}
              strokeOpacity={isHovered ? 0.5 : 0.15}
              strokeDasharray="2,2"
            />
          );
        }
      }
    });

    return lines;
  };

  const renderDependencyLines = () => {
    return dependencies.map((dep) => {
      const sourcePos = nodePositions[`${dep.sourceType}-${dep.sourceId}`];
      const targetPos = nodePositions[`${dep.targetType}-${dep.targetId}`];

      if (!sourcePos || !targetPos) return null;

      const isSourceHovered =
        hoveredItem?.type === dep.sourceType && hoveredItem?.id === dep.sourceId;
      const isTargetHovered =
        hoveredItem?.type === dep.targetType && hoveredItem?.id === dep.targetId;
      const isHighlighted = isSourceHovered || isTargetHovered;

      const sourceStrategy = dep.sourceType === "project"
        ? projects.find((p) => p.id === dep.sourceId)?.strategyId
        : actions.find((a) => a.id === dep.sourceId)?.strategyId;

      const sameColumn = Math.abs(sourcePos.x - targetPos.x) < 50;
      
      let path: string;
      
      if (sameColumn) {
        const startX = sourcePos.x + sourcePos.width;
        const startY = sourcePos.y + sourcePos.height / 2;
        const endX = targetPos.x + targetPos.width;
        const endY = targetPos.y + targetPos.height / 2;
        const curveOffset = 40;
        
        path = `M ${startX} ${startY} 
                Q ${startX + curveOffset} ${(startY + endY) / 2}, ${endX} ${endY}`;
      } else if (sourcePos.x < targetPos.x) {
        const startX = sourcePos.x + sourcePos.width;
        const startY = sourcePos.y + sourcePos.height / 2;
        const endX = targetPos.x;
        const endY = targetPos.y + targetPos.height / 2;
        const controlOffset = 50;
        
        path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
      } else {
        const startX = sourcePos.x;
        const startY = sourcePos.y + sourcePos.height / 2;
        const endX = targetPos.x + targetPos.width;
        const endY = targetPos.y + targetPos.height / 2;
        const curveOffset = 40;
        
        path = `M ${startX} ${startY} 
                Q ${startX - curveOffset} ${(startY + endY) / 2}, ${endX} ${endY}`;
      }

      return (
        <g key={`dep-${dep.id}`}>
          <path
            d={path}
            fill="none"
            stroke={getStrategyColor(sourceStrategy || "")}
            strokeWidth={isHighlighted ? 3 : 2}
            strokeOpacity={isHighlighted ? 1 : 0.7}
            markerEnd="url(#arrowhead)"
          />
          {isHighlighted && (
            <path
              d={path}
              fill="none"
              stroke={getStrategyColor(sourceStrategy || "")}
              strokeWidth={6}
              strokeOpacity={0.2}
            />
          )}
        </g>
      );
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "achieved":
      case "c":
      case "completed":
        return "default";
      case "in_progress":
      case "ot":
        return "secondary";
      case "not_started":
      case "nys":
        return "outline";
      case "behind":
      case "b":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(s + 0.2, 2));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(s - 0.2, 0.4));
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <GitBranch className="w-6 h-6" />
                Dependency Graph
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                <SelectTrigger className="w-72 min-w-[180px]" data-testid="select-graph-strategy-filter">
                  <Target className="w-4 h-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="Filter by strategy" className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-w-[320px]">
                  <SelectItem value="all">All Strategies</SelectItem>
                  {strategies
                    .filter((s) => s.status !== "Archived")
                    .map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: strategy.colorCode }}
                          />
                          <span className="truncate">{strategy.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white dark:bg-gray-800 border-b px-6 py-3">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-t-2 border-dashed border-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Hierarchy (parent-child)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Dependency (depends on)</span>
            </div>
            <div className="flex-1" />
            <Badge variant="outline" className="gap-1">
              <Layers className="w-3 h-3" />
              {filteredStrategies.length} Strategies
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Target className="w-3 h-3" />
              {filteredProjects.length} Projects
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Zap className="w-3 h-3" />
              {filteredActions.length} Actions
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <GitBranch className="w-3 h-3" />
              {dependencies.length} Dependencies
            </Badge>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-auto"
        >
          <svg
            ref={svgRef}
            width={COLUMN_WIDTH * 3 + COLUMN_PADDING * 2}
            height={svgHeight + 50}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
              minWidth: `${(COLUMN_WIDTH * 3 + COLUMN_PADDING * 2) * scale}px`,
              minHeight: `${(svgHeight + 50) * scale}px`,
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
              </marker>
            </defs>


            <line x1={COLUMN_WIDTH} y1={0} x2={COLUMN_WIDTH} y2={svgHeight} stroke="#E5E7EB" strokeWidth="1" />
            <line x1={COLUMN_WIDTH * 2} y1={0} x2={COLUMN_WIDTH * 2} y2={svgHeight} stroke="#E5E7EB" strokeWidth="1" />

            {renderHierarchyLines()}
            {renderDependencyLines()}

            <TooltipProvider>
              {filteredStrategies.map((strategy) => {
                const pos = nodePositions[`strategy-${strategy.id}`];
                if (!pos) return null;

                const isActive = activeItem?.type === "strategy" && activeItem?.id === strategy.id;
                const isLocked = lockedItem?.type === "strategy" && lockedItem?.id === strategy.id;
                const inHierarchy = isInHierarchy("strategy", strategy.id);
                const dimmed = activeItem && !inHierarchy;

                return (
                  <Tooltip key={strategy.id}>
                    <TooltipTrigger asChild>
                      <g
                        onMouseEnter={() => !lockedItem && setHoveredItem({ type: "strategy", id: strategy.id })}
                        onMouseLeave={() => !lockedItem && setHoveredItem(null)}
                        onClick={() => handleCardClick("strategy", strategy.id)}
                        style={{ cursor: "pointer", opacity: dimmed ? 0.3 : 1 }}
                      >
                        <rect
                          x={pos.x}
                          y={pos.y}
                          width={pos.width}
                          height={pos.height}
                          rx={8}
                          fill={isActive ? "#FFFBEB" : "white"}
                          stroke={strategy.colorCode}
                          strokeWidth={isActive ? 3 : 2}
                        />
                        <rect
                          x={pos.x}
                          y={pos.y}
                          width={6}
                          height={pos.height}
                          rx={3}
                          fill={strategy.colorCode}
                        />
                        {isLocked && (
                          <circle
                            cx={pos.x + pos.width - 12}
                            cy={pos.y + 12}
                            r={6}
                            fill={strategy.colorCode}
                          />
                        )}
                        <text
                          x={pos.x + 16}
                          y={pos.y + 18}
                          fill="#6B7280"
                          style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.5px" }}
                        >
                          STRATEGY
                        </text>
                        <rect
                          x={pos.x + 75}
                          y={pos.y + 8}
                          width={getStatusLabel(strategy.status).length * 6 + 12}
                          height={16}
                          rx={4}
                          fill={getStatusColor(strategy.status)}
                          fillOpacity={0.15}
                        />
                        <text
                          x={pos.x + 81}
                          y={pos.y + 19}
                          fill={getStatusColor(strategy.status)}
                          style={{ fontSize: "8px", fontWeight: 600 }}
                        >
                          {getStatusLabel(strategy.status)}
                        </text>
                        <text
                          x={pos.x + 16}
                          y={pos.y + 38}
                          fill="#111827"
                          style={{ fontSize: "13px", fontWeight: 600 }}
                        >
                          {strategy.title.length > 22 ? strategy.title.slice(0, 22) + "..." : strategy.title}
                        </text>
                        <text
                          x={pos.x + 16}
                          y={pos.y + 56}
                          fill="#9CA3AF"
                          style={{ fontSize: "10px" }}
                        >
                          {strategy.progress}% complete
                        </text>
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{strategy.title}</p>
                      <p className="text-xs text-gray-400">{strategy.status}</p>
                      <p className="text-xs text-gray-400">{isLocked ? "Click to unlock" : "Click to lock highlight"}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {filteredProjects.map((project) => {
                const pos = nodePositions[`project-${project.id}`];
                if (!pos) return null;

                const isActive = activeItem?.type === "project" && activeItem?.id === project.id;
                const isLocked = lockedItem?.type === "project" && lockedItem?.id === project.id;
                const inHierarchy = isInHierarchy("project", project.id, project.strategyId);
                const dimmed = activeItem && !inHierarchy;

                return (
                  <Tooltip key={project.id}>
                    <TooltipTrigger asChild>
                      <g
                        onMouseEnter={() => !lockedItem && setHoveredItem({ type: "project", id: project.id })}
                        onMouseLeave={() => !lockedItem && setHoveredItem(null)}
                        onClick={() => handleCardClick("project", project.id)}
                        style={{ cursor: "pointer", opacity: dimmed ? 0.3 : 1 }}
                      >
                        <rect
                          x={pos.x}
                          y={pos.y}
                          width={pos.width}
                          height={pos.height}
                          rx={8}
                          fill={isActive ? "#F0F9FF" : "white"}
                          stroke={isActive ? getStrategyColor(project.strategyId) : "#D1D5DB"}
                          strokeWidth={isActive ? 3 : 1}
                        />
                        <circle
                          cx={pos.x + 12}
                          cy={pos.y + 14}
                          r={4}
                          fill={getStrategyColor(project.strategyId)}
                        />
                        {isLocked && (
                          <circle
                            cx={pos.x + pos.width - 12}
                            cy={pos.y + 12}
                            r={6}
                            fill={getStrategyColor(project.strategyId)}
                          />
                        )}
                        <text
                          x={pos.x + 22}
                          y={pos.y + 18}
                          fill="#6B7280"
                          style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.5px" }}
                        >
                          PROJECT
                        </text>
                        <rect
                          x={pos.x + 75}
                          y={pos.y + 8}
                          width={getStatusLabel(project.status).length * 6 + 12}
                          height={16}
                          rx={4}
                          fill={getStatusColor(project.status)}
                          fillOpacity={0.15}
                        />
                        <text
                          x={pos.x + 81}
                          y={pos.y + 19}
                          fill={getStatusColor(project.status)}
                          style={{ fontSize: "8px", fontWeight: 600 }}
                        >
                          {getStatusLabel(project.status)}
                        </text>
                        <text
                          x={pos.x + 12}
                          y={pos.y + 40}
                          fill="#111827"
                          style={{ fontSize: "13px", fontWeight: 600 }}
                        >
                          {project.title.length > 20 ? project.title.slice(0, 20) + "..." : project.title}
                        </text>
                        <text
                          x={pos.x + 12}
                          y={pos.y + 58}
                          fill="#9CA3AF"
                          style={{ fontSize: "10px" }}
                        >
                          {project.progress}% complete
                        </text>
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{project.title}</p>
                      <p className="text-xs text-gray-400">Progress: {project.progress}%</p>
                      <p className="text-xs text-gray-400">{isLocked ? "Click to unlock" : "Click to lock highlight"}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {filteredActions.map((action) => {
                const pos = nodePositions[`action-${action.id}`];
                if (!pos) return null;

                const isActive = activeItem?.type === "action" && activeItem?.id === action.id;
                const isLocked = lockedItem?.type === "action" && lockedItem?.id === action.id;
                const inHierarchy = isInHierarchy("action", action.id, action.strategyId, action.projectId);
                const dimmed = activeItem && !inHierarchy;
                const linkedProject = getProjectForAction(action);

                return (
                  <Tooltip key={action.id}>
                    <TooltipTrigger asChild>
                      <g
                        onMouseEnter={() => !lockedItem && setHoveredItem({ type: "action", id: action.id })}
                        onMouseLeave={() => !lockedItem && setHoveredItem(null)}
                        onClick={() => handleCardClick("action", action.id)}
                        style={{ cursor: "pointer", opacity: dimmed ? 0.3 : 1 }}
                      >
                        <rect
                          x={pos.x}
                          y={pos.y}
                          width={pos.width}
                          height={pos.height}
                          rx={8}
                          fill={isActive ? "#FFF7ED" : "white"}
                          stroke={isActive ? getStrategyColor(action.strategyId) : "#E5E7EB"}
                          strokeWidth={isActive ? 3 : 1}
                        />
                        {isLocked && (
                          <circle
                            cx={pos.x + pos.width - 12}
                            cy={pos.y + 12}
                            r={6}
                            fill={getStrategyColor(action.strategyId)}
                          />
                        )}
                        <circle
                          cx={pos.x + 12}
                          cy={pos.y + 14}
                          r={4}
                          fill={getStrategyColor(action.strategyId)}
                          opacity={0.7}
                        />
                        <text
                          x={pos.x + 22}
                          y={pos.y + 18}
                          fill="#6B7280"
                          style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.5px" }}
                        >
                          ACTION
                        </text>
                        <rect
                          x={pos.x + 70}
                          y={pos.y + 8}
                          width={getStatusLabel(action.status).length * 6 + 12}
                          height={16}
                          rx={4}
                          fill={getStatusColor(action.status)}
                          fillOpacity={0.15}
                        />
                        <text
                          x={pos.x + 76}
                          y={pos.y + 19}
                          fill={getStatusColor(action.status)}
                          style={{ fontSize: "8px", fontWeight: 600 }}
                        >
                          {getStatusLabel(action.status)}
                        </text>
                        <text
                          x={pos.x + 12}
                          y={pos.y + 40}
                          fill="#111827"
                          style={{ fontSize: "13px", fontWeight: 600 }}
                        >
                          {action.title.length > 20 ? action.title.slice(0, 20) + "..." : action.title}
                        </text>
                        <text
                          x={pos.x + 12}
                          y={pos.y + 58}
                          fill="#9CA3AF"
                          style={{ fontSize: "10px" }}
                        >
                          {linkedProject ? linkedProject.title.slice(0, 20) : "No project"}
                        </text>
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-xs text-gray-400">Status: {action.status}</p>
                      {linkedProject && (
                        <p className="text-xs text-gray-400">Project: {linkedProject.title}</p>
                      )}
                      <p className="text-xs text-gray-400">{isLocked ? "Click to unlock" : "Click to lock highlight"}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </svg>
        </div>
      </div>
    </div>
  );
}
