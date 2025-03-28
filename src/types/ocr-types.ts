export interface OCRProcessorProps {
  file: File;
  onComplete: (markdown: string) => void;
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