"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
      className
    )}
    {...props}
  >
    <div
      className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300 ease-in-out rounded-full"
      style={{ 
        width: `${Math.max(0, Math.min(100, value || 0))}%`,
      }}
    />
  </div>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
