import { NextResponse } from "next/server";

export const config = {
  maxDuration: 300, // 5 minutes to process large PDFs
  api: {
    responseLimit: '50mb', // Allow large responses for PDFs with many pages
    bodyParser: {
      sizeLimit: '50mb' // Allow large files
    }
  }
};

export async function POST(request: Request) {
  try {
    // Check if Mistral API key is configured
    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json(
        { error: "MISTRAL_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Ensure it's a PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // For this example, we'll use a simulated response
    // In a real implementation, you would:
    // 1. Convert the file to base64 or a buffer
    // 2. Send it to Mistral API
    // 3. Process the response

    // Simulate processing time for large files
    const fileSize = file.size;
    // Only wait if file is over 1MB to simulate processing
    if (fileSize > 1024 * 1024) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // TODO: Replace with actual Mistral API call
    // Example implementation (would need to be updated based on Mistral's actual API):
    /*
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    const response = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        file: base64,
        model: 'mistral-large-pdf' // Replace with actual model name
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Mistral API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    */

    // Mock response for development
    const fileName = file.name.replace('.pdf', '');
    const mockResult = {
      markdown: `# ${fileName}

## Introduction

This document was processed with Mistral AI OCR. The original PDF has been converted to Markdown format.

## Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nunc aliquet nunc, vitae aliquam nisl nunc vitae nisl.

![Image 1](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==)

## Section 1

This is a section from your PDF document. In a real implementation, this would contain the actual content extracted from your PDF.

## Section 2

Another section from your document with proper formatting preserved.

## Notes

The PDF was ${Math.round(fileSize / 1024)} KB in size and contained approximately ${Math.max(1, Math.ceil(fileSize / (500 * 1024)))} pages.
`,
      images: [
        {
          index: 0,
          base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        }
      ]
    };

    return NextResponse.json(mockResult);
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
} 