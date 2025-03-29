'use server';

import axios from 'axios';

type Result<T> = {
  isSuccess: boolean;
  message: string;
  data?: T;
};

type ProcessedImage = {
  base64: string;
  index: number;
  mimeType: string;
};

// Server action to process a PDF with Mistral AI using a File URL
export async function processPdfWithMistralAction(
  fileUrl: string // Changed input from base64Pdf to fileUrl
): Promise<Result<{ text: string; images: ProcessedImage[] }>> {
  try {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY not set in environment variables');
    }
    if (!fileUrl) {
       throw new Error('File URL must be provided.');
    }

    console.log("Server Action: Processing PDF from URL:", fileUrl);

    // Removed base64 prefix handling as we now use URL

    const response = await axios.post(
      'https://api.mistral.ai/v1/ocr',
      {
        model: "mistral-ocr-latest",
        document: {
          type: "document_url", // Changed type to document_url
          document_url: fileUrl // Send the file URL
        },
        include_image_base64: true
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // Removed maxBodyLength, likely not needed for URL-based requests
      }
    );

    console.log("Server Action: Mistral API response status:", response.status);

    if (!response.data || !response.data.pages) {
       console.error("Server Action: Invalid response data from Mistral API:", response.data);
      throw new Error('Invalid response structure from Mistral API');
    }

    // Process the response according to Mistral's format
    let combinedText = '';
    const processedImages: ProcessedImage[] = [];
    let imageIndex = 0;

    // Process each page from the response
    response.data.pages.forEach((page: any) => {
      // Add page text
      combinedText += (combinedText ? '\n\n' : '') + page.markdown;

      // Process images from the page
      if (page.images && Array.isArray(page.images)) {
        page.images.forEach((img: any) => {
          let base64Data = img.base64 || '';
          // Determine mimeType (assuming png if not specified, but Mistral might provide it)
          let mimeType = img.mime_type || 'image/png'; // Check if API provides mime_type

          // Ensure base64 data doesn't have data URI prefix from API (if it adds one)
          if (base64Data.startsWith('data:')) {
              const parts = base64Data.split(';base64,');
              if (parts.length === 2) {
                  mimeType = parts[0].replace("data:", "") || mimeType; // Update mimeType from prefix
                  base64Data = parts[1]; // Use only the raw base64 part
              }
          }
          
          // Store raw base64 and detected mimeType
          processedImages.push({
            base64: base64Data, // Store raw base64
            index: imageIndex++,
            mimeType
          });
        });
      }
    });

    // Clean up the markdown text
    let cleanedText = combinedText
      // Ensure headers have space after #
      .replace(/^(#+)([^ #])/gm, '$1 $2')
      // Remove excess whitespace at line starts
      .replace(/^[ \t]+/gm, '')
      // Ensure proper spacing between sections
      .replace(/\n{3,}/g, '\n\n');

    // Ensure proper image references (e.g., ![Image N](img-N.ext))
    // This part assumes the API might return different placeholder formats
    processedImages.forEach((img, index) => {
      const extension = mimeTypeToExtension(img.mimeType);
      const filename = `img-${index}.${extension}`;
      
      // Replace potential placeholders like ![image](image-0), ![image](0), etc.
      const patterns = [
        new RegExp(`!\\[([^\\]]*?)\\]\\(image-${index}\\)`, 'g'), // Match ![...](image-N)
        new RegExp(`!\\[([^\\]]*?)\\]\\(${index}\\)`, 'g'),      // Match ![...](N)
        new RegExp(`!\\[\\]\\(image-${index}\\)`, 'g'),       // Match ![](image-N)
        new RegExp(`!\\[\\]\\(${index}\\)`, 'g'),          // Match ![](N)
        new RegExp(`!\\[([^\\]]*?)\\]\\(img-${index}\\.[^)]+\\)`, 'g'), // Match existing ![...](img-N.ext)
        new RegExp(`!\\[\\]\\(img-${index}\\.[^)]+\\)`, 'g')         // Match existing ![](img-N.ext)
      ];
      
      const replacement = `![Image ${index + 1}](${filename})`;

      patterns.forEach(pattern => {
        cleanedText = cleanedText.replace(pattern, replacement);
      });

      // Add image reference if somehow missed by the API or replacements
      if (!cleanedText.includes(`(${filename})`)) {
        console.log(`Server Action: Adding missing reference for ${filename}`);
        cleanedText += `\n\n${replacement}`;
      }
    });

    console.log("Server Action: Successfully processed PDF via URL. Returning data.");
    return {
      isSuccess: true,
      message: 'PDF processed successfully with Mistral AI using URL',
      data: {
        text: cleanedText,
        images: processedImages // Return images with raw base64 and mimeType
      }
    };

  } catch (error) {
    console.error('Server Action: Error processing PDF with Mistral (URL method):', error);
    if (axios.isAxiosError(error)) {
      console.error('Server Action: API Request Details:', error.config);
      if (error.response) {
        console.error('Server Action: API Response Status:', error.response.status);
        console.error('Server Action: API Response Data:', error.response.data);
        return {
          isSuccess: false,
          message: `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        };
      } else {
         return {
           isSuccess: false,
           message: 'API Error: No response received from Mistral API'
         };
      }
    }
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'An unknown server error occurred while processing with Mistral AI'
    };
  }
}

// Helper function to get extension from mime type
function mimeTypeToExtension(mimeType: string): string {
    const mimeMap: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/bmp': 'bmp',
        'image/tiff': 'tiff',
    };
    const simpleMime = mimeType.split(';')[0];
    return mimeMap[simpleMime] || 'png'; // Default to png
} 