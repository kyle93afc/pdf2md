"use client"

import { useState, useEffect } from "react"
import { OCRProcessorProps } from "@/types/ocr-types"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Download, Loader2, Package } from "lucide-react"
import { processPdfWithMistralAction } from "@/actions/mistral-ocr-actions"
import {
  uploadFileStorage,
  createSignedUrlStorage,
  deleteFileStorage
} from "@/lib/storage-helpers"
import { STORAGE_BUCKETS } from "@/lib/storage-constants"
import JSZip from "jszip"
import { saveAs } from "file-saver"

export default function MistralOCRProcessor({
  file,
  onComplete,
  onError
}: OCRProcessorProps) {
  const [markdown, setMarkdown] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [uploadedPath, setUploadedPath] = useState<string>("")
  const [extractedImages, setExtractedImages] = useState<
    { base64: string; index: number }[]
  >([])

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${file.name.replace(/\.[^/.]+$/, "")}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadZip = async () => {
    const zip = new JSZip()
    const folderName = file.name.replace(/\.[^/.]+$/, "")

    // Add markdown file
    zip.file(`${folderName}.md`, markdown)

    // Add images
    extractedImages.forEach((img, index) => {
      const imageData = atob(img.base64)
      const arrayBuffer = new ArrayBuffer(imageData.length)
      const uint8Array = new Uint8Array(arrayBuffer)

      for (let i = 0; i < imageData.length; i++) {
        uint8Array[i] = imageData.charCodeAt(i)
      }

      zip.file(`${folderName}/images/image-${index + 1}.png`, uint8Array)
    })

    // Generate and download zip
    const content = await zip.generateAsync({ type: "blob" })
    saveAs(content, `${folderName}-converted.zip`)
  }

  const processFile = async () => {
    try {
      setLoading(true)

      // Upload the file
      const uploadResult = await uploadFileStorage(
        STORAGE_BUCKETS.PDF_UPLOADS,
        `temp/${file.name}`,
        file,
        { upsert: true }
      )

      if (!uploadResult.isSuccess) {
        throw new Error(uploadResult.message)
      }

      setUploadedPath(uploadResult.data.path)

      // Get a signed URL
      const urlResult = await createSignedUrlStorage(
        STORAGE_BUCKETS.PDF_UPLOADS,
        uploadResult.data.path
      )

      if (!urlResult.isSuccess) {
        throw new Error("Failed to get file URL")
      }

      // Process with Mistral OCR
      const response = await processPdfWithMistralAction(
        urlResult.data.signedUrl
      )

      if (!response.isSuccess) {
        throw new Error(response.message)
      }

      // Store extracted images
      setExtractedImages(
        response.data.images.map((img, index) => ({
          base64: img.base64,
          index
        }))
      )

      // Convert to markdown with embedded images
      let mdContent = response.data.text + "\n\n"

      // Add images at the end with relative paths
      response.data.images.forEach((_, index) => {
        mdContent += `\n![Image ${index + 1}](./images/image-${index + 1}.png)\n`
      })

      setMarkdown(mdContent)
      onComplete(mdContent)

      // Clean up the temporary file
      await deleteFileStorage(
        STORAGE_BUCKETS.PDF_UPLOADS,
        uploadResult.data.path
      )
    } catch (error) {
      console.error("Error processing file:", error)
      onError(error instanceof Error ? error.message : "Failed to process file")
    } finally {
      setLoading(false)
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (uploadedPath) {
        deleteFileStorage(STORAGE_BUCKETS.PDF_UPLOADS, uploadedPath).catch(
          console.error
        )
      }
    }
  }, [uploadedPath])

  // Start processing when component mounts
  useEffect(() => {
    if (file) {
      processFile()
    }
  }, [file])

  if (loading) {
    return (
      <div className="flex items-center justify-center space-x-2 p-8">
        <Loader2 className="size-6 animate-spin" />
        <span>Processing document with PDF2MD...</span>
      </div>
    )
  }

  if (markdown) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">OCR Result</h3>
          <div className="flex gap-2">
            <Button onClick={handleDownloadMarkdown} size="sm">
              <Download className="mr-2 size-4" />
              Download Markdown
            </Button>
            <Button onClick={handleDownloadZip} size="sm" variant="secondary">
              <Package className="mr-2 size-4" />
              Download All
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown}
            </ReactMarkdown>
          </div>
        </ScrollArea>
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
