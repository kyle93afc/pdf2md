"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Loader2Icon, UploadIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UploadSectionProps {
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  disabled?: boolean
}

export default function UploadSection({
  selectedFile,
  onFileSelect,
  disabled = false
}: UploadSectionProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"]
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled
  })

  const handleRemove = () => {
    onFileSelect(null)
  }

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={cn(
            "relative rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div
              className={cn(
                "rounded-full bg-primary/10 p-4",
                isDragActive && "bg-primary/20"
              )}
            >
              <UploadIcon
                className={cn(
                  "size-8",
                  isDragActive ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-medium">
                {isDragActive ? "Drop your PDF here" : "Upload your PDF"}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag and drop your PDF file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 10MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <UploadIcon className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={disabled}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {disabled && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>Processing your PDF...</span>
        </div>
      )}
    </div>
  )
}
