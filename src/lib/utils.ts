import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to get extension from mime type
export function mimeTypeToExtension(mimeType: string): string {
    const mimeMap: Record<string, string> = {
        'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
        'image/gif': 'gif', 'image/webp': 'webp', 'image/bmp': 'bmp',
        'image/tiff': 'tiff',
    };
    const simpleMime = mimeType.split(';')[0];
    return mimeMap[simpleMime] || 'png'; // Default to png
} 