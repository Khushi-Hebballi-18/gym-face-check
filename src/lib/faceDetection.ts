import { pipeline, env } from "@huggingface/transformers";

// Configure to use local models
env.allowLocalModels = false;
env.useBrowserCache = true;

let faceDetector: any = null;
let featureExtractor: any = null;

export const initializeFaceDetection = async () => {
  try {
    console.log("Initializing face detection...");
    
    // Use a lightweight model for face detection
    faceDetector = await pipeline(
      "object-detection",
      "Xenova/detr-resnet-50"
    );
    
    // Use feature extraction for face embeddings
    featureExtractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    
    console.log("Face detection initialized");
    return true;
  } catch (error) {
    console.error("Error initializing face detection:", error);
    return false;
  }
};

export const detectFaces = async (imageElement: HTMLImageElement | HTMLVideoElement) => {
  if (!faceDetector) {
    throw new Error("Face detector not initialized");
  }

  try {
    const results = await faceDetector(imageElement, {
      threshold: 0.5,
      percentage: true,
    });

    // Filter for person detections (faces)
    const faces = results.filter((r: any) => 
      r.label === "person" && r.score > 0.7
    );

    return faces;
  } catch (error) {
    console.error("Error detecting faces:", error);
    return [];
  }
};

export const extractFaceEmbedding = async (canvas: HTMLCanvasElement) => {
  if (!featureExtractor) {
    throw new Error("Feature extractor not initialized");
  }

  try {
    // Convert canvas to image data
    const imageData = canvas.toDataURL();
    
    // Create an image element
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageData;
    });

    // Extract features
    const result = await featureExtractor(img, { pooling: "mean", normalize: true });
    
    // Convert to array and return as string
    return JSON.stringify(Array.from(result.data));
  } catch (error) {
    console.error("Error extracting face embedding:", error);
    throw error;
  }
};

export const compareFaceEmbeddings = (embedding1: string, embedding2: string): number => {
  try {
    const arr1: number[] = JSON.parse(embedding1);
    const arr2: number[] = JSON.parse(embedding2);

    if (arr1.length !== arr2.length) {
      throw new Error("Embeddings have different dimensions");
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < arr1.length; i++) {
      dotProduct += arr1[i] * arr2[i];
      norm1 += arr1[i] * arr1[i];
      norm2 += arr2[i] * arr2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return similarity;
  } catch (error) {
    console.error("Error comparing embeddings:", error);
    return 0;
  }
};