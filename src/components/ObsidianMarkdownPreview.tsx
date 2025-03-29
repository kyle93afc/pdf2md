"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
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
  // Replace image references in the markdown with blob URLs for preview
  let previewContent = content;

  console.log(
    "ObsidianMarkdownPreview: Received image blob URLs:",
    imageBlobUrls
  );

  Object.entries(imageBlobUrls).forEach(([filename, url]) => {
    // Escape filename for use in regex
    const escapedFilename = filename.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"); 
    // Regex to match ![alt text](filename)
    // Corrected escaping for parens: \( and \)
    const pattern = new RegExp(
      `(!\\[[^\\]]*\\]\\\()(${escapedFilename})(\\\))`,
      "g"
    );
    const initialLength = previewContent.length;
    previewContent = previewContent.replace(pattern, `$1${url}$3`);
    if (previewContent.length !== initialLength) {
      console.log(`ObsidianMarkdownPreview: Replaced ${filename} with blob URL.`);
    } else {
      console.log(
        `ObsidianMarkdownPreview: Pattern for ${filename} not found or already replaced.`
      );
    }
  });

  // Add support for Obsidian-style wikilinks [[Link]] or [[Link|Text]]
  previewContent = previewContent.replace(
    /\\[\\[([^\\]\\|]+)(?:\\|([^\\]]+))?\\]\\]/g,
    (match, page, text) => {
      const displayText = text || page;
      return `<span class="obsidian-wikilink">${displayText}</span>`;
    }
  );

  // Add support for Obsidian-style tags
  previewContent = previewContent.replace(
    /(^|\\s)#([a-zA-Z0-9_\\-\\/]+)/g,
    (match, prefix, tag) => {
      return `${prefix}<span class="obsidian-tag">#${tag}</span>`;
    }
  );

  // Custom components for ReactMarkdown
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\\w+)/.exec(className || "");
      return !inline && match ? (
        <SyntaxHighlighter
          {...props}
          style={vs}
          language={match[1]}
          PreTag="div"
          wrapLines={true}
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
    img({ node, ...props }: any) {
      if (!props.src) {
        console.warn("Rendering img tag with no src:", props);
        return null;
      }
      const isBlobUrl = props.src.startsWith("blob:");
      if (!isBlobUrl) {
        console.warn("Rendering img tag with non-blob src:", props.src);
        // Optionally return placeholder
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
    li({ node, children, className, ...props }: any) {
      const taskListItem = className?.includes("task-list-item");
      return (
        <li {...props} className={className}>
          {taskListItem ? (
            <span className="obsidian-task-list-item">{children}</span>
          ) : (
            children
          )}
        </li>
      );
    },
    input({ node, ...props }: any) {
      if (props.type === "checkbox") {
        return <input {...props} disabled={true} />;
      }
      return <input {...props} />;
    },
    // Need to render the raw HTML spans for wikilinks/tags
    span({ node, children, className, ...props }: any) {
      if (
        className === "obsidian-wikilink" ||
        className === "obsidian-tag"
      ) {
        // Directly render the children which should be the text content
        // The component itself handles the span tag.
        // This might require rehype-raw if ReactMarkdown escapes it.
        // Alternatively, return React.createElement('span', {className, ...props}, children)
        // For simplicity, let's assume ReactMarkdown handles basic spans or use rehype-raw
        // Let's try rendering the span directly:
        return <span className={className} {...props}>{children}</span>;
      }
      // Default span rendering if needed for other cases
      return <span {...props}>{children}</span>;
    },
  };

  return (
    <div className="obsidian-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]} // Keep rehypeKatex for math
        // Potentially add rehype-raw if HTML spans don't render correctly
        // rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={components}
      >
        {previewContent}
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
          cursor: default;
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