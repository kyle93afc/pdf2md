import { storage } from "@/lib/firebase/firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadString,
  getBlob,
  uploadBytesResumable,
  getMetadata,
  StringFormat
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

type Result<T> = {
  isSuccess: boolean;
  message: string;
  data?: T;
};

type StorageOptions = {
  contentType?: string;
  customMetadata?: Record<string, string>;
  upsert?: boolean; // Whether to replace if exists
};

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFileStorage(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: StorageOptions
): Promise<Result<{ path: string; url: string }>> {
  try {
    // Ensure path doesn't include bucket name to avoid duplication
    const cleanPath = path.startsWith(bucket) ? path.substring(bucket.length + 1) : path;
    const storageRef = ref(storage, `${bucket}/${cleanPath}`);
    const contentType = options?.contentType || file.type || "application/octet-stream";
    
    const uploadResult = await uploadBytes(storageRef, file, {
      contentType,
      customMetadata: options?.customMetadata
    });
    
    const url = await getDownloadURL(uploadResult.ref);
    
    return {
      isSuccess: true,
      message: "File uploaded successfully",
      data: {
        path: cleanPath, // Return just the clean path to avoid duplication issues
        url
      }
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to upload file"
    };
  }
}

/**
 * Upload a base64 string to Firebase Storage
 */
export async function uploadBase64Storage(
  bucket: string,
  path: string,
  base64Data: string,
  options?: StorageOptions
): Promise<Result<{ path: string; url: string }>> {
  try {
    // Ensure path doesn't include bucket name to avoid duplication
    const cleanPath = path.startsWith(bucket) ? path.substring(bucket.length + 1) : path;
    const storageRef = ref(storage, `${bucket}/${cleanPath}`);
    
    // Handle data URLs
    let format: StringFormat = "base64";
    let data = base64Data;
    let contentType = options?.contentType || "application/octet-stream";
    
    if (base64Data.startsWith("data:")) {
      const parts = base64Data.split(";base64,");
      if (parts.length === 2) {
        contentType = parts[0].replace("data:", "") || contentType;
        data = parts[1];
      }
    }
    
    const uploadResult = await uploadString(storageRef, data, format, {
      contentType,
      customMetadata: options?.customMetadata
    });
    
    const url = await getDownloadURL(uploadResult.ref);
    
    return {
      isSuccess: true,
      message: "File uploaded successfully",
      data: {
        path: cleanPath, // Return just the clean path to avoid duplication issues
        url
      }
    };
  } catch (error) {
    console.error("Error uploading base64 data:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to upload file"
    };
  }
}

/**
 * Download a file from Firebase Storage
 */
export async function downloadFileStorage(
  bucket: string,
  path: string
): Promise<Result<Blob>> {
  try {
    const storageRef = ref(storage, `${bucket}/${path}`);
    const blob = await getBlob(storageRef);
    
    return {
      isSuccess: true,
      message: "File downloaded successfully",
      data: blob
    };
  } catch (error) {
    console.error("Error downloading file:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to download file"
    };
  }
}

/**
 * Get a signed URL for a file in Firebase Storage
 */
export async function createSignedUrlStorage(
  bucket: string,
  path: string
): Promise<Result<{ signedUrl: string }>> {
  try {
    // Ensure path doesn't include bucket name to avoid duplication
    const cleanPath = path.startsWith(bucket) ? path.substring(bucket.length + 1) : path;
    const storageRef = ref(storage, `${bucket}/${cleanPath}`);
    const url = await getDownloadURL(storageRef);
    
    return {
      isSuccess: true,
      message: "Signed URL created successfully",
      data: {
        signedUrl: url
      }
    };
  } catch (error) {
    console.error("Error creating signed URL:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create signed URL"
    };
  }
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFileStorage(
  bucket: string,
  path: string
): Promise<Result<void>> {
  try {
    // Ensure consistent path handling
    const cleanPath = path.startsWith(bucket) ? path : `${bucket}/${path}`;
    const storageRef = ref(storage, cleanPath);
    
    await deleteObject(storageRef);
    
    return {
      isSuccess: true,
      message: "File deleted successfully"
    };
  } catch (error) {
    console.error("Error deleting file:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to delete file"
    };
  }
}

/**
 * Generate a unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const extension = originalName.split(".").pop() || "";
  const uuid = uuidv4();
  return `${uuid}.${extension}`;
} 