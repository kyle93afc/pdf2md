"use client"

import { useEffect, useState } from "react"
import { getConversionJobStatusAction } from "@/actions/conversion-actions"
import { ConversionJobStatus } from "@/types"
import { Progress } from "@/components/ui/progress"
import { Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProcessingSectionProps {
  conversionId: string
}

export default function ProcessingSection({
  conversionId
}: ProcessingSectionProps) {
  const [status, setStatus] = useState<ConversionJobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const result = await getConversionJobStatusAction(conversionId)
        if (!result.isSuccess) {
          throw new Error(result.message)
        }

        setStatus(result.data)

        // If the status is not final, continue polling
        if (
          result.data.status !== "completed" &&
          result.data.status !== "failed"
        ) {
          setTimeout(pollStatus, 2000) // Poll every 2 seconds
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to get status"
        )
      }
    }

    pollStatus()
  }, [conversionId])

  if (error) {
    return (
      <div className="text-destructive">
        <p>Error: {error}</p>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const getProgress = () => {
    switch (status.status) {
      case "pending":
        return 0
      case "processing":
        return 50
      case "completed":
        return 100
      case "failed":
        return 100
      default:
        return 0
    }
  }

  const getStatusText = () => {
    switch (status.status) {
      case "pending":
        return "Preparing to convert..."
      case "processing":
        return "Converting PDF to Markdown..."
      case "completed":
        return "Conversion completed successfully!"
      case "failed":
        return `Conversion failed: ${status.errorMessage || "Unknown error"}`
      default:
        return "Unknown status"
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Conversion Progress</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {status.status === "processing" && (
              <Loader2Icon className="size-4 animate-spin text-primary" />
            )}
            <span>{getStatusText()}</span>
          </div>
          <span>{getProgress()}%</span>
        </div>
        <Progress
          value={getProgress()}
          className={cn(status.status === "processing" && "animate-pulse")}
        />
      </div>

      {status.status === "completed" && (
        <div className="text-sm text-muted-foreground">
          <p>Pages: {status.pageCount || "N/A"}</p>
          <p>Words: {status.wordCount || "N/A"}</p>
          <p>
            Processing Time:{" "}
            {status.processingTime
              ? `${(status.processingTime / 1000).toFixed(1)}s`
              : "N/A"}
          </p>
        </div>
      )}
    </div>
  )
}
