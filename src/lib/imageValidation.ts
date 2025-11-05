import { toast } from "sonner";
import { detectFaces } from "./faceDetection";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_DIMENSION = 4096;
const MIN_DIMENSION = 200;
const MIN_FACE_CONFIDENCE = 0.8;

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates image file before processing
 * Checks: file size, MIME type, actual image format, and dimensions
 */
export const validateImageFile = async (file: File): Promise<ImageValidationResult> => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: "File too large. Maximum 10MB allowed."
    };
  }

  // Check MIME type
  if (!VALID_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: "Invalid file type. Use JPG or PNG only."
    };
  }

  // Verify it's actually an image by loading it
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      // Check dimensions
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        resolve({
          isValid: false,
          error: `Image too large. Maximum ${MAX_DIMENSION}x${MAX_DIMENSION} pixels.`
        });
        return;
      }
      
      if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
        resolve({
          isValid: false,
          error: `Image too small. Minimum ${MIN_DIMENSION}x${MIN_DIMENSION} pixels.`
        });
        return;
      }

      resolve({ isValid: true });
    };
    
    img.onerror = () => {
      resolve({
        isValid: false,
        error: "Invalid or corrupted image file."
      });
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Validates face detection results
 * Checks: face presence, single face, and confidence level
 */
export const validateFaceDetection = async (imageElement: HTMLImageElement | HTMLVideoElement): Promise<ImageValidationResult> => {
  try {
    const faces = await detectFaces(imageElement);
    
    if (faces.length === 0) {
      return {
        isValid: false,
        error: "No face detected. Please ensure face is clearly visible."
      };
    }
    
    if (faces.length > 1) {
      return {
        isValid: false,
        error: "Multiple faces detected. Only one person per photo."
      };
    }
    
    if (faces[0].score < MIN_FACE_CONFIDENCE) {
      return {
        isValid: false,
        error: "Face detection confidence too low. Ensure good lighting and clear face visibility."
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error("Face validation error:", error);
    return {
      isValid: false,
      error: "Failed to validate face detection."
    };
  }
};

/**
 * Validates face embedding format and consistency
 */
export const validateFaceEmbedding = (embedding: string): ImageValidationResult => {
  try {
    const arr = JSON.parse(embedding);
    
    if (!Array.isArray(arr)) {
      return {
        isValid: false,
        error: "Invalid embedding format: not an array"
      };
    }
    
    if (arr.length !== 384) {
      return {
        isValid: false,
        error: `Invalid embedding dimension: expected 384, got ${arr.length}`
      };
    }
    
    if (!arr.every(n => typeof n === 'number' && !isNaN(n))) {
      return {
        isValid: false,
        error: "Invalid embedding format: contains non-numeric values"
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: "Failed to parse embedding"
    };
  }
};
