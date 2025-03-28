"use client";

import { useState, useEffect } from "react";
import { OCRProcessorProps } from "@/types/ocr-types";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Package } from "lucide-react";
import { processPdfWithMistralAction } from "@/actions/mistral-ocr-actions";
import {
  uploadFileStorage,
  createSignedUrlStorage,
  deleteFileStorage
} from "@/lib/storage-helpers";
import { STORAGE_BUCKETS } from "@/lib/storage-constants";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";

// Helper to get file extension from MIME type
const getExtensionFromMime = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/tiff": "tiff"
  };

  return mimeToExt[mimeType] || "png"; // Default to png if unknown
};

export default function MistralOCRProcessor({
  file,
  onComplete,
  onError
}: OCRProcessorProps) {
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string>("");
  const [extractedImages, setExtractedImages] = useState<
    { base64: string; index: number; mimeType?: string }[]
  >([]);
  // Store blob URLs for preview rendering
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<string, string>>({});

  // Function to create blob URLs for preview
  const createBlobUrlsForPreview = (
    images: { base64: string; index: number; mimeType?: string }[]
  ) => {
    const urls: Record<string, string> = {};

    images.forEach((img, index) => {
      try {
        let base64Data = img.base64;
        let mimeType = img.mimeType || "image/png";

        // Handle data URI format if present
        if (base64Data.startsWith("data:")) {
          const parts = base64Data.split(";base64,");
          if (parts.length === 2) {
            mimeType = parts[0].replace("data:", "") || mimeType;
            base64Data = parts[1];
          }
        }

        // Clean the base64 string
        base64Data = base64Data.replace(/\s/g, "");

        // Create a blob from the base64 data
        const byteCharacters = atob(base64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);

          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }

          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: mimeType });
        const url = URL.createObjectURL(blob);
        urls[`img-${index}.${getExtensionFromMime(mimeType)}`] = url;
      } catch (error) {
        console.error(`Failed to create blob URL for image ${index}:`, error);
      }
    });

    return urls;
  };

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imageBlobUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [imageBlobUrls]);

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

  const base64ToBlob = (
    base64: string,
    defaultMimeType = "image/png"
  ): { blob: Blob | null; mimeType: string } => {
    try {
      // Handle data URI format if present
      let b64Data = base64;
      let mimeType = defaultMimeType;

      if (b64Data.startsWith("data:")) {
        const parts = b64Data.split(";base64,");
        if (parts.length === 2) {
          if (parts[0].startsWith("data:")) {
            mimeType = parts[0].replace("data:", "") || defaultMimeType;
          }
          b64Data = parts[1];
        }
      }

      // Clean the base64 string
      b64Data = b64Data.replace(/\s/g, "");

      // Check if base64 is valid
      if (!b64Data || b64Data.trim() === "") {
        console.error("Empty base64 data");
        return { blob: null, mimeType };
      }

      try {
        // Convert base64 to binary
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);

          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }

          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }

        return { blob: new Blob(byteArrays, { type: mimeType }), mimeType };
      } catch (error) {
        console.error("Failed to decode base64:", error);
        return { blob: null, mimeType };
      }
    } catch (error) {
      console.error("Error in base64ToBlob:", error);
      return { blob: null, mimeType: defaultMimeType };
    }
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folderName = file.name.replace(/\.[^/.]+$/, "");

    // Create images folder
    const imagesFolder = zip.folder("images");

    // Process images first to get their extensions
    const imageFileInfo: {
      index: number;
      filename: string;
      extension: string;
    }[] = [];

    for (let i = 0; i < extractedImages.length; i++) {
      const img = extractedImages[i];
      const { blob, mimeType } = base64ToBlob(
        img.base64,
        img.mimeType || "image/png"
      );
      const extension = getExtensionFromMime(mimeType);
      const filename = `img-${i}.${extension}`;

      if (blob) {
        imageFileInfo.push({ index: i, filename, extension });
        imagesFolder?.file(filename, blob);
      } else {
        console.error(`Failed to process image ${i}`);
      }
    }

    // Create updated markdown with correct image references
    let mdContent = markdown;

    // Fix image references in markdown (both inline and reference style)
    imageFileInfo.forEach(info => {
      // Fix inline image tags with various patterns
      const patterns = [
        // Match ![img-X.png](img-X.png) or ![img-X.jpg](img-X.jpg) etc.
        new RegExp(
          `!\\[img-${info.index}\\.[a-zA-Z]+\\]\\(img-${info.index}\\.[a-zA-Z]+\\)`,
          "g"
        ),
        // Match ![Image X](./images/image-X.png)
        new RegExp(
          `!\\[Image ${info.index + 1}\\]\\(\\./images/image-${info.index + 1}\\.png\\)`,
          "g"
        ),
        // Match ![img-X.extension](./images/img-X.extension)
        new RegExp(
          `!\\[img-${info.index}\\.[a-zA-Z]+\\]\\(\\./images/img-${info.index}\\.[a-zA-Z]+\\)`,
          "g"
        ),
        // For simple numeric references
        new RegExp(`!\\[${info.index}\\]\\([^)]+\\)`, "g")
      ];

      const replacement = `![Image ${info.index + 1}](images/${info.filename})`;

      patterns.forEach(pattern => {
        mdContent = mdContent.replace(pattern, replacement);
      });

      // If no replacements were made, maybe our patterns didn't match
      // Try to find any instances of the original image name
      const filenamePattern = new RegExp(`img-${info.index}\\.[a-zA-Z]+`, "g");
      mdContent = mdContent.replace(filenamePattern, info.filename);
    });

    // Format markdown content for Obsidian compatibility
    mdContent = formatForObsidian(mdContent);

    zip.file(`${folderName}.md`, mdContent);

    if (imageFileInfo.length === 0 && extractedImages.length > 0) {
      console.error(
        "Could not process any images. The base64 data may be invalid."
      );
    }

    // Generate and download zip
    try {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}-converted.zip`);
    } catch (error) {
      console.error("Failed to generate zip:", error);
    }
  };

  // Format markdown for Obsidian compatibility
  const formatForObsidian = (content: string): string => {
    let obsidianContent = content;

    // Convert standard markdown links to Obsidian wikilinks
    // Example: [Link](url) to [[Link]]
    obsidianContent = obsidianContent.replace(
      /\[([^\]]+)\]\((?!https?:\/\/|mailto:|tel:|ftp:|#)([^)]+)\)/g,
      (match, title, path) => {
        // Only convert internal links (not web URLs)
        if (!path.startsWith("http") && path.endsWith(".md")) {
          // Remove .md extension for internal links
          const pageName = path.replace(/\.md$/, "");
          return `[[${pageName}|${title}]]`;
        }
        return match; // Keep external links as they are
      }
    );

    // Add YAML frontmatter if not present
    if (!obsidianContent.startsWith("---")) {
      const title = file.name.replace(/\.[^/.]+$/, "");
      const date = new Date().toISOString().split("T")[0];
      const frontmatter = `---
title: ${title}
date: ${date}
---

`;
      obsidianContent = frontmatter + obsidianContent;
    }

    return obsidianContent;
  };

  // Custom markdown renderer that uses blob URLs for images with Obsidian styling
  const MarkdownWithImages = ({ content }: { content: string }) => {
    // Replace image references in the markdown with blob URLs for preview
    let previewContent = content;

    console.log("Available image URLs:", Object.keys(imageBlobUrls));

    // First, identify all image patterns in the content to debug
    const imgMatches = previewContent.match(/!\[[^\]]*\]\([^)]+\)/g);
    console.log("Found image references in content:", imgMatches);

    // More flexible approach to image replacement
    Object.entries(imageBlobUrls).forEach(([filename, url]) => {
      // Extract the base name without extension
      const baseNameMatch = filename.match(/(.+)\.([^.]+)$/);
      if (!baseNameMatch) return;

      const [, baseName, extension] = baseNameMatch;
      console.log(
        `Processing image: ${baseName} with extension ${extension} - URL: ${url}`
      );

      // Create more flexible patterns to match various image reference formats
      const patterns = [
        // Exact match
        new RegExp(
          `!\\[([^\\]]*)\\]\\(${filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
          "g"
        ),
        // Match with different path prefixes
        new RegExp(
          `!\\[([^\\]]*)\\]\\(\\./images/${filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
          "g"
        ),
        new RegExp(
          `!\\[([^\\]]*)\\]\\(images/${filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
          "g"
        ),
        // Match with just the base name and any extension
        new RegExp(`!\\[([^\\]]*)\\]\\(${baseName}\\.[a-zA-Z]+\\)`, "g"),
        // Match with just 'img-X' pattern with any extension
        new RegExp(
          `!\\[([^\\]]*)\\]\\(img-${baseName.split("-")[1]}\\.[a-zA-Z]+\\)`,
          "g"
        ),
        // Match reference-style markdown links
        new RegExp(`!\\[([^\\]]*)\\]\\[${baseName}\\]`, "g")
      ];

      patterns.forEach(pattern => {
        const beforeCount = previewContent.length;
        previewContent = previewContent.replace(pattern, `![$1](${url})`);
        if (beforeCount !== previewContent.length) {
          console.log(`Replaced pattern: ${pattern}`);
        }
      });
    });

    // Add fallback for any remaining image references
    // This will ensure we catch any patterns we missed above
    previewContent = previewContent.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (match, alt, src) => {
        // Check if src matches any of our image patterns
        for (const [filename, url] of Object.entries(imageBlobUrls)) {
          const baseFilename = filename.split(".")[0];
          const imgNumber = baseFilename.split("-")[1];

          // Check various patterns in the src
          if (
            src.includes(filename) ||
            src.includes(baseFilename) ||
            src.includes(`img-${imgNumber}`)
          ) {
            console.log(`Fallback matched: ${src} -> ${url}`);
            return `![${alt}](${url})`;
          }
        }
        return match; // Keep unchanged if no match
      }
    );

    // Add support for Obsidian-style wikilinks [[Link]] or [[Link|Text]]
    previewContent = previewContent.replace(
      /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g,
      (match, page, text) => {
        const displayText = text || page;
        return `<span class="obsidian-wikilink">${displayText}</span>`;
      }
    );

    // Add support for Obsidian-style tags
    previewContent = previewContent.replace(
      /#([a-zA-Z0-9_-]+)/g,
      '<span class="obsidian-tag">#$1</span>'
    );

    // Custom components for ReactMarkdown
    const components = {
      code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "");
        return !inline && match ? (
          <SyntaxHighlighter
            {...props}
            style={vs}
            language={match[1]}
            PreTag="div"
            wrapLines={true}
            className="obsidian-code-block"
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        ) : (
          <code
            {...props}
            className={`${className || ""} obsidian-inline-code`}
          >
            {children}
          </code>
        );
      },
      img({ node, ...props }: any) {
        // Don't render image if src is empty
        if (!props.src) {
          return null;
        }
        return (
          <img {...props} className="obsidian-image" alt={props.alt || ""} />
        );
      },
      a({ node, ...props }: any) {
        return (
          <a
            {...props}
            className="obsidian-link"
            target="_blank"
            rel="noopener noreferrer"
          />
        );
      },
      blockquote({ node, ...props }: any) {
        return <blockquote {...props} className="obsidian-blockquote" />;
      },
      table({ node, ...props }: any) {
        return <table {...props} className="obsidian-table" />;
      },
      input({ node, ...props }: any) {
        if (props.type === "checkbox") {
          return (
            <span className="obsidian-task-list-item">
              <input {...props} />
            </span>
          );
        }
        return <input {...props} />;
      }
    };

    return (
      <div className="obsidian-preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={components}
        >
          {previewContent}
        </ReactMarkdown>

        <style jsx global>{`
          .obsidian-preview {
            font-family: var(--font-sans);
            line-height: 1.6;
            color: var(--foreground);
          }

          .obsidian-preview h1,
          .obsidian-preview h2,
          .obsidian-preview h3,
          .obsidian-preview h4,
          .obsidian-preview h5,
          .obsidian-preview h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
            color: var(--foreground);
            border-bottom: none;
          }

          .obsidian-preview h1 {
            font-size: 1.8em;
            border-bottom: 1px solid var(--border);
            padding-bottom: 0.3em;
          }

          .obsidian-preview h2 {
            font-size: 1.5em;
            padding-bottom: 0.2em;
          }

          .obsidian-preview p {
            margin: 0.8em 0;
          }

          .obsidian-image {
            max-width: 100%;
            display: block;
            margin: 1em 0;
            border-radius: 4px;
            border: 1px solid var(--border);
          }

          .obsidian-wikilink {
            color: var(--primary);
            text-decoration: none;
            border-bottom: 1px dashed var(--primary);
            padding-bottom: 1px;
            cursor: pointer;
          }

          .obsidian-tag {
            color: var(--primary);
            font-size: 0.9em;
            background: var(--secondary);
            padding: 2px 5px;
            border-radius: 3px;
            margin-right: 4px;
            cursor: pointer;
          }

          .obsidian-blockquote {
            border-left: 4px solid var(--primary);
            padding-left: 1em;
            margin-left: 0;
            color: var(--muted-foreground);
            font-style: italic;
          }

          .obsidian-code-block {
            background: var(--card) !important;
            border-radius: 4px;
            margin: 1em 0;
            padding: 0.5em;
            border: 1px solid var(--border);
            color: var(--card-foreground);
          }

          .obsidian-inline-code {
            background: var(--secondary);
            border-radius: 3px;
            padding: 0.2em 0.4em;
            font-family: monospace;
            font-size: 0.9em;
            color: var(--secondary-foreground);
          }

          .obsidian-link {
            color: var(--primary);
            text-decoration: none;
          }

          .obsidian-link:hover {
            text-decoration: underline;
          }

          .obsidian-table {
            border-collapse: collapse;
            margin: 1em 0;
            width: 100%;
          }

          .obsidian-table th,
          .obsidian-table td {
            border: 1px solid var(--border);
            padding: 6px 13px;
          }

          .obsidian-table th {
            background: var(--secondary);
          }

          .obsidian-task-list-item {
            display: inline-flex;
            align-items: center;
            margin-right: 6px;
          }

          .obsidian-task-list-item input[type="checkbox"] {
            margin: 0;
            margin-right: 6px;
          }

          /* Light theme transitions for elements */
          .obsidian-preview *,
          .obsidian-preview *:before,
          .obsidian-preview *:after {
            transition:
              background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease;
          }
        `}</style>
      </div>
    );
  };

  const processFile = async () => {
    try {
      setLoading(true);

      // Upload the file
      const uploadResult = await uploadFileStorage(
        STORAGE_BUCKETS.PDF_UPLOADS,
        `temp/${file.name}`,
        file,
        { upsert: true }
      );

      if (!uploadResult.isSuccess) {
        throw new Error(uploadResult.message);
      }

      setUploadedPath(uploadResult.data.path);

      // Get a signed URL
      const urlResult = await createSignedUrlStorage(
        STORAGE_BUCKETS.PDF_UPLOADS,
        uploadResult.data.path
      );

      if (!urlResult.isSuccess) {
        throw new Error("Failed to get file URL");
      }

      // Process with Mistral OCR
      const response = await processPdfWithMistralAction(
        urlResult.data.signedUrl
      );

      if (!response.isSuccess) {
        throw new Error(response.message);
      }

      // Detect MIME types and store extracted images
      const processedImages = response.data.images.map((img, index) => {
        let mimeType = "image/png"; // Default
        if (img.base64.startsWith("data:")) {
          const parts = img.base64.split(";base64,");
          if (parts.length === 2 && parts[0].startsWith("data:")) {
            mimeType = parts[0].replace("data:", "") || mimeType;
          }
        }
        return {
          base64: img.base64,
          index,
          mimeType
        };
      });

      setExtractedImages(processedImages);

      // Create blob URLs for the preview
      const blobUrls = createBlobUrlsForPreview(processedImages);
      setImageBlobUrls(blobUrls);

      // Build markdown with proper image references
      let mdContent = response.data.text + "\n\n";

      // Add images at the end with proper formats and filenames
      processedImages.forEach((img, index) => {
        const extension = getExtensionFromMime(img.mimeType || "image/png");
        const filename = `img-${index}.${extension}`;
        mdContent = mdContent.replace(
          new RegExp(`!\\[\\]\\(${filename}\\)`, "g"),
          `![Image ${index + 1}](${filename})`
        );

        // If there's no image reference, add one at the end
        if (!mdContent.includes(`(${filename})`)) {
          mdContent += `\n![Image ${index + 1}](${filename})\n`;
        }
      });

      setMarkdown(mdContent);
      onComplete(mdContent);

      // Clean up the temporary file
      await deleteFileStorage(
        STORAGE_BUCKETS.PDF_UPLOADS,
        uploadResult.data.path
      );
    } catch (error) {
      console.error("Error processing file:", error);
      onError(error instanceof Error ? error.message : "Failed to process file");
    } finally {
      setLoading(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (uploadedPath) {
        deleteFileStorage(STORAGE_BUCKETS.PDF_UPLOADS, uploadedPath).catch(
          console.error
        );
      }
    };
  }, [uploadedPath]);

  // Start processing when component mounts
  useEffect(() => {
    if (file) {
      processFile();
    }
  }, [file]);

  if (loading) {
    return (
      <div className="flex items-center justify-center space-x-2 p-8">
        <Loader2 className="size-6 animate-spin" />
        <span>Processing document with PDF2MD...</span>
      </div>
    );
  }

  if (markdown) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            OCR Result (Obsidian Preview)
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

        <ScrollArea className="h-[500px] w-full rounded-md border p-6">
          <div className="max-w-none">
            <MarkdownWithImages content={markdown} />
          </div>
        </ScrollArea>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold">Ready to Process</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          File selected: {file.name}
        </p>
      </div>
    </Card>
  );
} 