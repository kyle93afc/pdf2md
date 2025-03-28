'use server';

import axios from 'axios';

type Result<T> = {
  isSuccess: boolean;
  message: string;
  data?: T;
};

// Server action to process a PDF with Mistral AI
export async function processPdfWithMistralAction(
  pdfUrl: string
): Promise<Result<{ text: string; images: { base64: string; index: number }[] }>> {
  try {
    // For development/demo purposes, we're returning mock data
    // In a real implementation, this would call the Mistral AI API
    if (!process.env.MISTRAL_API_KEY) {
      console.warn('MISTRAL_API_KEY not set, using mock data');
    }

    // For demo/testing: extract the filename from the URL to personalize the mock response
    const fileName = pdfUrl.split('/').pop()?.split('.')[0] || 'document';

    // In a real implementation, you would:
    // 1. Download the PDF from the URL (or just pass the URL to Mistral if their API supports it)
    // 2. Call Mistral's API with the PDF data
    // 3. Process the response

    /*
    // Example with a real API call (commented out)
    const response = await axios.post('https://api.mistral.ai/v1/ocr', {
      file_url: pdfUrl,
      model: 'mistral-large-pdf'
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data;
    */

    // Mock response for development
    const mockOcrResult = {
      text: `# ${fileName}
      
## Introduction

This document demonstrates the PDF to Markdown conversion capabilities of PDF2MD.

## Key Features

- High quality OCR text extraction
- Automatic image extraction and inclusion
- Proper formatting preservation
- Clean, readable Markdown output

## Sample Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, vitae aliquam nisl nunc vitae nisl.

Here's a sample image from the document:

![](img-0.png)

## Code Sample

\`\`\`typescript
function processPdf(file: File): Promise<string> {
  // Process the PDF file
  return new Promise((resolve) => {
    // OCR processing logic would go here
    resolve("Markdown content");
  });
}
\`\`\`

## Conclusion

Thank you for trying our PDF to Markdown conversion tool!
`,
      images: [
        {
          base64: 'data:image/png;base64,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',
          index: 0
        }
      ]
    };

    // In a real implementation, we would have more error handling
    // and validation, but this is just for demo purposes
    return {
      isSuccess: true,
      message: 'PDF processed successfully',
      data: {
        text: mockOcrResult.text,
        images: mockOcrResult.images
      }
    };
  } catch (error) {
    console.error('Error processing PDF with Mistral:', error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
} 