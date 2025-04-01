"use client";

import React from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkWikilinks from "@/lib/remarkWikilinks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css"; // Ensure KaTeX CSS is imported

interface ObsidianMarkdownPreviewProps {
  content: string;
  imageBlobUrls: Record<string, string>; // Pass blob URLs as props
}

export default function ObsidianMarkdownPreview({
  content,
  imageBlobUrls,
}: ObsidianMarkdownPreviewProps) {
  // Use a completely different approach to handle the images
  
  console.log("Processing markdown content:", {
    originalContent: content.substring(0, 100) + "...",
    imageUrlsCount: Object.keys(imageBlobUrls).length,
    imageUrlsKeys: Object.keys(imageBlobUrls).slice(0, 3),
    samplesUrls: Object.values(imageBlobUrls).slice(0, 1)
  });

  // Custom components for ReactMarkdown with direct image handling
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\\w+)/.exec(className || "");
      return !inline && match ? (
        <SyntaxHighlighter
          {...props}
          style={vs}
          language={match[1]}
          PreTag="div"
          className="obsidian-code-block"
        >
          {String(children).replace(/\\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code {...props} className={`${className || ""} obsidian-inline-code`}>
          {children}
        </code>
      );
    },
    img({ src, alt, ...props }: any) {
      console.log("Image rendering attempted:", { src, alt });
      
      // If it's already a data URL from our previous replacements, use it directly
      if (src && src.startsWith('data:')) {
        return (
          <img 
            src={src} 
            alt={alt || ""} 
            className="obsidian-image" 
            {...props}
          />
        );
      }
      
      // Try to find the matching image in our blob URLs
      let imgSrc = "";
      let foundKey = "";
      
      // Method 1: Direct match with the full path
      if (src && imageBlobUrls[src]) {
        imgSrc = imageBlobUrls[src];
        foundKey = src;
      } 
      // Method 2: Try to match by basename only
      else if (src) {
        const srcBasename = src.split('/').pop();
        for (const [path, url] of Object.entries(imageBlobUrls)) {
          const pathBasename = path.split('/').pop();
          if (srcBasename === pathBasename) {
            imgSrc = url;
            foundKey = path;
            break;
          }
        }
      }
      // Method 3: If the path has "img-X" pattern, try to match by index
      if (!imgSrc && src && src.includes('img-')) {
        const matches = src.match(/img-(\d+)/);
        if (matches && matches[1]) {
          const targetIndex = matches[1];
          for (const [path, url] of Object.entries(imageBlobUrls)) {
            if (path.includes(`img-${targetIndex}.`)) {
              imgSrc = url;
              foundKey = path;
              break;
            }
          }
        }
      }
      
      console.log("Image processing result:", { 
        original: src, 
        found: !!imgSrc,
        foundKey: foundKey || "none"
      });
      
      if (imgSrc) {
        return (
          <img 
            src={imgSrc} 
            alt={alt || ""} 
            className="obsidian-image" 
            {...props}
          />
        );
      }
      
      // Fallback for when we can't find a match
      console.warn("No matching image found for:", src);
      return (
        <div className="bg-muted p-4 rounded flex items-center justify-center text-muted-foreground">
          <span>Image not found: {src || "unnamed"}</span>
        </div>
      );
    },
    a({ href, children, ...props }: React.ComponentPropsWithoutRef<'a'>) {
      // Check if this is a wikilink (no http/https protocol)
      const isWikilink = href && !href.startsWith('http') && !href.startsWith('https');
      return (
        <a
          {...props}
          href={href}
          className={`${isWikilink ? 'obsidian-wikilink' : 'obsidian-link'}`}
          target={isWikilink ? '_self' : '_blank'}
          rel={isWikilink ? '' : 'noopener noreferrer'}
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className="obsidian-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkWikilinks]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>

      <style jsx global>{`
        /* Keep all existing .obsidian-* styles */
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
          height: auto;
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

        .obsidian-wikilink:hover {
          text-decoration: none;
          border-bottom-style: solid;
        }

        .obsidian-tag {
          color: var(--primary);
          font-size: 0.9em;
          background: var(--secondary);
          padding: 2px 5px;
          border-radius: 3px;
          margin-right: 4px;
          cursor: default;
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
          overflow-x: auto;
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
          overflow-x: auto;
          display: block;
        }

        .obsidian-table th,
        .obsidian-table td {
          border: 1px solid var(--border);
          padding: 6px 13px;
        }

        .obsidian-table th {
          background: var(--secondary);
          font-weight: 600;
        }

        ul.contains-task-list {
          list-style-type: none;
          padding-left: 0;
        }

        .obsidian-task-list-item {
          display: flex;
          align-items: baseline;
          margin-left: -1.5em;
          list-style-type: none;
          margin-bottom: 0.3em;
        }

        .obsidian-task-list-item input[type="checkbox"] {
          margin: 0 0.5em 0 0;
          position: relative;
          top: 0.15em;
          cursor: default;
        }

        .obsidian-preview *,
        .obsidian-preview *:before,
        .obsidian-preview *:after {
          transition: background-color 0.3s ease, color 0.3s ease,
            border-color 0.3s ease;
        }
      `}</style>
    </div>
  );
} 