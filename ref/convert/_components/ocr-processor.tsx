"use client"

import { useState, useEffect } from "react"
import { OCRResponse } from "@/types"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { processDocumentUrlAction } from "@/actions/ocr-actions"
import {
  uploadFileStorage,
  createSignedUrlStorage
} from "@/lib/supabase-storage"
import { STORAGE_BUCKETS } from "@/lib/storage-constants"

interface OCRProcessorProps {
  file: File
  onComplete: (markdown: string) => void
  onError: (error: string) => void
}

export default function OCRProcessor({
  file,
  onComplete,
  onError
}: OCRProcessorProps) {
  const [result, setResult] = useState<OCRResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 3

  useEffect(() => {
    if (!file) return

    const processFile = async () => {
      try {
        setLoading(true)

        // First, upload the file to get a URL
        const uploadResult = await uploadFileStorage(
          STORAGE_BUCKETS.PDF_UPLOADS,
          `temp/${file.name}`,
          file,
          { upsert: true }
        )

        if (!uploadResult.isSuccess) {
          throw new Error(uploadResult.message)
        }

        // Get a signed URL for the uploaded file
        const urlResult = await createSignedUrlStorage(
          STORAGE_BUCKETS.PDF_UPLOADS,
          uploadResult.data.path,
          3600
        )

        if (!urlResult.isSuccess || !urlResult.data.signedUrl) {
          throw new Error("Failed to get file URL")
        }

        // Process the file with OCR
        const response = await processDocumentUrlAction(
          urlResult.data.signedUrl,
          {
            include_image_base64: true
          }
        )

        if (!response.isSuccess) {
          // If we get a timeout error and haven't exceeded retries, try again
          if (
            response.message.includes("ETIMEDOUT") &&
            retryCount < MAX_RETRIES
          ) {
            setRetryCount(prev => prev + 1)
            throw new Error("Timeout error, retrying...")
          }
          throw new Error(response.message)
        }

        setResult(response.data)
        setRetryCount(0) // Reset retry count on success

        // Convert OCR result to markdown
        let markdown = ""
        if (response.data.pages) {
          markdown = response.data.pages
            .map(page => {
              let pageMarkdown = page.markdown || ""
              // Handle images if present
              if (page.images) {
                page.images.forEach(img => {
                  if (img.image_base64) {
                    pageMarkdown = pageMarkdown.replace(
                      `![${img.id}](${img.id})`,
                      `![${img.id}](data:image/png;base64,${img.image_base64})`
                    )
                  }
                })
              }
              return pageMarkdown
            })
            .join("\n\n")
        }

        // Call onComplete with the markdown content
        onComplete(markdown)
      } catch (error) {
        console.error("Error processing file:", error)
        // Only show error to user if we've exceeded retries or it's not a timeout
        if (
          retryCount >= MAX_RETRIES ||
          !(error instanceof Error && error.message.includes("Timeout"))
        ) {
          onError(
            error instanceof Error ? error.message : "Failed to process file"
          )
        }
      } finally {
        setLoading(false)
      }
    }

    processFile()
  }, [file, onComplete, onError, retryCount]) // Add retryCount to dependencies

  if (loading) {
    return (
      <div className="flex items-center justify-center space-x-2 p-8">
        <Loader2 className="size-6 animate-spin" />
        <span>
          {retryCount > 0
            ? `Processing document with OCR (Retry ${retryCount}/${MAX_RETRIES})...`
            : "Processing document with OCR..."}
        </span>
      </div>
    )
  }

  if (result) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">OCR Result</h3>
        </div>

        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {result.pages?.map(page => page.markdown || "").join("\n\n") ||
                "No content extracted"}
            </ReactMarkdown>
          </div>
        </ScrollArea>

        <div className="mt-4 text-xs text-muted-foreground">
          <p>Pages processed: {result.usage_info?.pages_processed || 0}</p>
          <p>
            Document size:{" "}
            {Math.round((result.usage_info?.doc_size_bytes || 0) / 1024)} KB
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold">Ready to Process</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          File selected: {file.name}
        </p>
      </div>
    </Card>
  )
}
