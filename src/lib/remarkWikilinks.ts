import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';

interface TextNode extends Node {
  type: 'text';
  value: string;
}

interface LinkNode extends Node {
  type: 'link';
  url: string;
  title: string | null;
  children: Array<TextNode>;
  data?: {
    hProperties: {
      className: string;
    };
  };
}

const remarkWikilinks: Plugin = () => {
  return (tree) => {
    visit(tree, 'text', (node: TextNode, index: number | null, parent: Parent | null) => {
      if (!parent || index === null) return;

      const value = node.value;
      const parts: Array<TextNode | LinkNode> = [];
      let lastIndex = 0;
      const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

      // Use a simple string replace instead of regex.exec
      value.replace(regex, (fullMatch, page, text, offset) => {
        // Add text before the match
        if (offset > lastIndex) {
          parts.push({
            type: 'text',
            value: value.slice(lastIndex, offset)
          });
        }

        const displayText = text || page;

        // Add the wikilink as a link node
        parts.push({
          type: 'link',
          url: page,
          title: null,
          children: [{
            type: 'text',
            value: displayText
          }],
          data: {
            hProperties: {
              className: 'obsidian-wikilink'
            }
          }
        });

        lastIndex = offset + fullMatch.length;
        return ''; // Return empty string as we're handling the replacement manually
      });

      // Add remaining text after last match
      if (lastIndex < value.length) {
        parts.push({
          type: 'text',
          value: value.slice(lastIndex)
        });
      }

      if (parts.length > 0) {
        // Replace the current node with our new nodes
        parent.children.splice(index, 1, ...parts);
      }
    });
  };
};

export default remarkWikilinks; 