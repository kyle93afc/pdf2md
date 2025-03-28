import { NextResponse } from "next/server";
import JSZip from "jszip";

// Next.js 13+ App Router config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get the markdown content and images from the request
    const { markdown, images, fileName } = await request.json();

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
      const imagesFolder = zip.folder("images");
      
      if (imagesFolder) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img.base64) {
            // Handle data URLs by extracting the base64 content
            let base64Content = img.base64;
            if (base64Content.includes(',')) {
              base64Content = base64Content.split(',')[1];
            }
            
            imagesFolder.file(`img-${img.index || i}.png`, base64Content, { base64: true });
          }
        }
      }
    }
    
    // Generate the zip
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6
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