"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface FileListProps {
  files: File[]
  onFilesChange: (files: File[]) => void
}

export default function FileList({ files, onFilesChange }: FileListProps) {
  if (!files.length) return null

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const clearFiles = () => {
    onFilesChange([])
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Selected Files</h4>
          <Button variant="ghost" size="sm" onClick={clearFiles}>
            Clear All
          </Button>
        </div>

        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-md bg-muted p-2"
            >
              <span className="mr-2 flex-1 truncate text-sm">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(index)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
