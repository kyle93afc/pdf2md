import { NextResponse } from "next/server";
import JSZip from "jszip";
import { mimeTypeToExtension } from "@/lib/utils"; // Import the helper

// Next.js 13+ App Router config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Expect images to include mimeType now
    const {
        markdown,
        images, // Should be: { base64: string, index: number, mimeType: string }[]
        fileName
    }: {
        markdown: string;
        images: { base64: string; index: number; mimeType: string }[];
        fileName: string;
     } = await request.json();

    console.log("Server received request - Images count:", images?.length || 0);

    if (!markdown) {
      return NextResponse.json(
        { error: "No markdown content provided" },
        { status: 400 }
      );
    }

    // Create a new JSZip instance
    const zip = new JSZip();

    // Add the markdown file
    zip.file(`${fileName || 'document'}.md`, markdown);

    // Create images folder and add images if they exist
    if (images && Array.isArray(images) && images.length > 0) {
      console.log("Processing images for ZIP");
      const imagesFolder = zip.folder("images"); // Create the 'images' subfolder

      if (imagesFolder) {
        // Use for...of for potentially async operations later if needed
        for (const img of images) {
          try {
            // Ensure mimeType exists, default if necessary
            const mimeType = img.mimeType || 'image/png';
            console.log(`Processing image ${img.index} with mimeType:`, mimeType);
            
            if (!img.base64) {
              console.warn(`Image ${img.index} has no base64 content`);
              continue;
            }

            // Handle data URLs by extracting the base64 content
            let base64Content = img.base64;
            if (base64Content.includes(',')) {
              console.log(`Image ${img.index} contains data URL prefix, extracting base64 content`);
              base64Content = base64Content.split(',')[1];
            }

            // Remove any whitespace from base64 string
            base64Content = base64Content.replace(/\s/g, '');

            // Generate the correct filename using the helper
            const extension = mimeTypeToExtension(mimeType);
            const filename = `img-${img.index}.${extension}`; // Correct filename
            console.log(`Adding image to ZIP: ${filename}`);

            // Add the file to the 'images' folder within the zip
            // Important: Set base64: true to tell JSZip this is base64 data
            imagesFolder.file(filename, base64Content, { base64: true });
          } catch (imgError) {
            console.error(`Error processing image ${img.index}:`, imgError);
          }
        }
      }
    } else {
      console.log("No images to process or invalid images array");
    }

    // Generate the zip
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6 // Default compression level
      }
    });

    // Create response with appropriate headers
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName || 'document'}-converted.zip"`,
      },
    });
  } catch (error) {
    console.error("Error creating ZIP:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create ZIP file" },
      { status: 500 }
    );
  }
} 