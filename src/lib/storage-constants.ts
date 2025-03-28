// Storage bucket names used throughout the application
export const STORAGE_BUCKETS = {
  PDF_UPLOADS: 'pdf-uploads', // For temporary PDF storage
  PROCESSED_IMAGES: 'processed-images', // For extracted images
  USER_DOCUMENTS: 'user-documents' // For user's processed markdown files
};

// Max file sizes
export const MAX_FILE_SIZES = {
  PDF: 20 * 1024 * 1024, // 20MB
  IMAGE: 5 * 1024 * 1024, // 5MB
  MARKDOWN: 10 * 1024 * 1024 // 10MB
};

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  PDF: ['application/pdf'],
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MARKDOWN: ['text/markdown', 'text/plain']
}; 