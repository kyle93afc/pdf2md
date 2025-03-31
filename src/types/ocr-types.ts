export interface OCRProcessorProps {
  file: File;
  onComplete: (markdown: string, images: { base64: string; index: number; mimeType: string }[]) => void;
  onError: (error: string) => void;
  pageCount?: number;
  pagesRemaining?: number;
}

export interface OCRResult {
  text: string;
  images: {
    base64: string;
    index: number;
  }[];
} 