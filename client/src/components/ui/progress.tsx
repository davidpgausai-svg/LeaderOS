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
      "relative h-4 w-full overflow-hidden rounded-full bg-fog-dark dark:bg-graphite-dark",
      className
    )}
    {...props}
  >
    <div
      className="h-full bg-teal dark:bg-teal transition-all duration-300 ease-in-out rounded-full"
      style={{ 
        width: `${Math.max(0, Math.min(100, value || 0))}%`,
      }}
    />
  </div>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
