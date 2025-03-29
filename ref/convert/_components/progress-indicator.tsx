"use client"

import { Progress } from "@/components/ui/progress"

interface ProgressIndicatorProps {
  progress: number
  total: number
  current: number
}

export default function ProgressIndicator({
  progress,
  total,
  current
}: ProgressIndicatorProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{progress}%</span>
        <span>
          File {current} of {total}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  )
}
