"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2Icon } from "lucide-react"
import { ConversionJobRequest } from "@/types"
import { startConversionJobAction } from "@/actions/conversion-actions"
import { ProcessingOverlay } from "@/components/ui/processing-overlay"
import UploadSection from "./upload-section"
import SettingsSection from "./settings-section"
import ProcessingSection from "./processing-section"
import OCRProcessor from "./ocr-processor"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ConversionSettings {
  outputFormat: "standard" | "github" | "academic" | "plain"
  extractImages: boolean
  inlineImages: boolean
  preserveFormatting: boolean
  includeMetadata: boolean
  useOCR: boolean
}

export function ConversionForm() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversionId, setConversionId] = useState<string | null>(null)
  const [settings, setSettings] = useState<ConversionSettings>({
    outputFormat: "standard",
    extractImages: true,
    inlineImages: true,
    preserveFormatting: true,
    includeMetadata: false,
    useOCR: false
  })

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file)
    setConversionId(null)
  }

  const handleSettingsChange = (newSettings: Partial<ConversionSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const handleCancel = () => {
    setIsProcessing(false)
    setSelectedFile(null)
    setConversionId(null)
  }

  const handleOCRComplete = async (markdown: string) => {
    if (!selectedFile) {
      toast.error("No file selected")
      setIsProcessing(false)
      return
    }

    try {
      setIsProcessing(true)

      const options: ConversionJobRequest = {
        outputFormat: settings.outputFormat,
        extractImages: settings.extractImages,
        includeImagesInMarkdown: settings.inlineImages,
        preserveLayout: settings.preserveFormatting,
        includeMetadata: settings.includeMetadata,
        markdownContent: markdown
      }

      const result = await startConversionJobAction(selectedFile, options)

      if (!result.isSuccess) {
        throw new Error(result.message)
      }

      if (!result.data?.conversionId) {
        throw new Error("No conversion ID returned")
      }

      setConversionId(result.data.conversionId)
      toast.success("Conversion completed successfully")

      // Redirect to the result page
      router.push(`/result/${result.data.conversionId}`)
    } catch (error: unknown) {
      console.error("Error starting conversion:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start conversion. Please try again."
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF file to convert")
      return
    }

    setIsProcessing(true)

    if (settings.useOCR) {
      // Let the OCR processor handle the conversion
      return
    }

    try {
      const options: ConversionJobRequest = {
        outputFormat: settings.outputFormat,
        extractImages: settings.extractImages,
        includeImagesInMarkdown: settings.inlineImages,
        preserveLayout: settings.preserveFormatting,
        includeMetadata: settings.includeMetadata
      }

      const result = await startConversionJobAction(selectedFile, options)

      if (!result.isSuccess) {
        throw new Error(result.message)
      }

      if (!result.data?.conversionId) {
        throw new Error("No conversion ID returned")
      }

      setConversionId(result.data.conversionId)
      toast.success("Conversion started successfully")

      // Redirect to the result page once processing starts
      router.push(`/result/${result.data.conversionId}`)
    } catch (error: unknown) {
      console.error("Error starting conversion:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start conversion. Please try again."
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <UploadSection
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        disabled={isProcessing}
      />

      {selectedFile && (
        <>
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Conversion Settings</h3>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-ocr"
                    checked={settings.useOCR}
                    onCheckedChange={checked =>
                      handleSettingsChange({ useOCR: checked })
                    }
                  />
                  <Label htmlFor="use-ocr">Use OCR</Label>
                </div>
              </div>

              <SettingsSection
                settings={settings}
                onChange={handleSettingsChange}
                disabled={isProcessing}
              />
            </div>
          </Card>

          {settings.useOCR ? (
            <OCRProcessor
              file={selectedFile}
              onComplete={handleOCRComplete}
              onError={error => {
                toast.error(error)
                setIsProcessing(false)
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  For best results with scanned documents or images, we
                  recommend enabling OCR above.
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader2Icon className="size-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  "Start Conversion"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {conversionId && (
        <div className="mt-8">
          <ProcessingSection conversionId={conversionId} />
        </div>
      )}

      <ProcessingOverlay isOpen={isProcessing} onCancel={handleCancel} />
    </div>
  )
}
