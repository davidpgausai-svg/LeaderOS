import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
}

export function ProgressRing({
  progress,
  size = 32,
  strokeWidth = 3,
  className,
  showPercentage = true,
}: ProgressRingProps) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  const getProgressColor = (value: number) => {
    if (value >= 100) return "stroke-green-500";
    if (value >= 75) return "stroke-emerald-500";
    if (value >= 50) return "stroke-blue-500";
    if (value >= 25) return "stroke-amber-500";
    return "stroke-gray-400";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn("transition-all duration-300", getProgressColor(normalizedProgress))}
        />
      </svg>
      {showPercentage && (
        <span 
          className="absolute text-[9px] font-semibold text-gray-700 dark:text-gray-300"
          style={{ fontSize: size * 0.28 }}
        >
          {Math.round(normalizedProgress)}%
        </span>
      )}
    </div>
  );
}
