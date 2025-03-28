"use client";

import { useState, useEffect } from "react";
import { OCRProcessorProps } from "@/types/ocr-types";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Package } from "lucide-react";

export default function MistralOCRProcessor({
  file,
  onComplete,
  onError,
  pagesRemaining
}: OCRProcessorProps) {
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Simulate OCR processing
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const fileName = file.name.replace('.pdf', '');
        
        // Generate mock markdown content
        const mockMarkdown = `# ${fileName}

## Introduction

This is a converted document from PDF. In a real implementation, this would contain the actual content extracted from your PDF.

## Sample Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nunc aliquet nunc, vitae aliquam nisl nunc vitae nisl.

![Image 1](images/img-0.png)

## Notes

This is just a simulation of the OCR process. The actual implementation would use AI to extract text and images from your PDF.
`;
        
        setMarkdown(mockMarkdown);
        setLoading(false);
        onComplete(mockMarkdown);
      } catch (error) {
        console.error("Error processing file:", error);
        onError(error instanceof Error ? error.message : "Failed to process file");
        setLoading(false);
      }
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [file, onComplete, onError]);

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, "")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = () => {
    // In a real implementation, this would create a ZIP with markdown and images
    alert("In a real implementation, this would download a ZIP file with the markdown and extracted images.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center space-x-2 p-8">
        <Loader2 className="size-6 animate-spin" />
        <span>Processing document with PDF2MD...</span>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          OCR Result
        </h3>
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

      <ScrollArea className="h-[300px] w-full rounded-md border p-6">
        <div className="max-w-none">
          <pre className="whitespace-pre-wrap font-mono text-sm">{markdown}</pre>
        </div>
      </ScrollArea>
    </Card>
  );
} 