"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { FileUpload } from "@/components/ui/file-upload"
import MistralOCRProcessor from "./_components/mistral-ocr-processor"

export default function ConvertPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string>("")

  const handleFileChange = (files: File[]) => {
    const file = files[0]
    if (file) {
      setSelectedFile(file)
      setError("")
    }
  }

  const handleError = (error: string) => {
    setError(error)
    setSelectedFile(null)
  }

  const handleComplete = (markdown: string) => {
    console.log("Processing complete:", markdown.slice(0, 100) + "...")
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-8 text-2xl font-bold">Convert PDF to Markdown</h1>

      <Card className="mb-6 overflow-hidden">
        <FileUpload
          onChange={handleFileChange}
          onError={handleError}
          maxSize={10 * 1024 * 1024} // 10MB
        />
        {error && <p className="p-4 text-sm text-red-500">{error}</p>}
      </Card>

      {selectedFile && (
        <MistralOCRProcessor
          file={selectedFile}
          onComplete={handleComplete}
          onError={handleError}
        />
      )}
    </div>
  )
}
