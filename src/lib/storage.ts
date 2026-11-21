/**
 * PahaadSaathi Storage Layer
 * Handles photo uploads to Supabase Storage for hazard reports.
 *
 * Bucket: Hazard-Photos (must be created in Supabase Dashboard)
 * Files are stored with unique names to avoid collisions.
 */

import { supabase } from "./supabase";
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_BUCKET = "Hazard-Photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type HazardPhotoSource = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export type UploadResult = {
  success: boolean;
  url?: string;
  error?: string;
};

/**
 * Upload a photo to Supabase Storage.
 * Returns the public URL if successful.
 */
export async function uploadHazardPhoto(
  source: HazardPhotoSource,
): Promise<UploadResult> {
  try {
    let fileBody: Blob | ArrayBuffer;
    let fileSize: number;
    let detectedMimeType = '';

    if (Platform.OS === 'web') {
      const response = await fetch(source.uri);
      if (!response.ok) throw new Error('Could not read the selected photo. Please choose it again.');
      const blob = await response.blob();
      fileBody = blob;
      fileSize = blob.size;
      detectedMimeType = blob.type;
    } else {
      const fileInfo = await FileSystem.getInfoAsync(source.uri);
      if (!fileInfo.exists) throw new Error('The selected photo is no longer available. Please choose it again.');
      fileSize = fileInfo.size ?? 0;
    }

    if (fileSize > MAX_FILE_SIZE) {
      return { success: false, error: "Photo is larger than 5 MB. Choose a smaller image." };
    }

    // Validate file type
    const fileType = inferImageMimeType(detectedMimeType, source.mimeType, source.fileName, source.uri);
    if (!fileType) {
      return {
        success: false,
        error: "Could not identify this photo as JPEG, PNG, or WebP. Please choose another image.",
      };
    }

    if (Platform.OS !== 'web') {
      const base64 = await FileSystem.readAsStringAsync(source.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      fileBody = decodeBase64(base64);
      if (fileSize === 0) fileSize = fileBody.byteLength;
      if (fileSize > MAX_FILE_SIZE) {
        return { success: false, error: "Photo is larger than 5 MB. Choose a smaller image." };
      }
    }

    // Generate unique filename
    const fileExt = MIME_TO_EXTENSION[fileType];
    const fileName = `hazards/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileBody!, {
        contentType: fileType,
        cacheControl: "3600",
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return {
        success: false,
        error: `Photo upload failed: ${error.message}. Check that the Supabase “${STORAGE_BUCKET}” bucket exists and allows uploads.`,
      };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrlData.publicUrl,
    };
  } catch (err) {
    console.error("Upload error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

function decodeBase64(value: string): ArrayBuffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/[^A-Za-z0-9+/]/g, '');
  const output = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let outputIndex = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index]);
    const b = alphabet.indexOf(clean[index + 1]);
    const c = alphabet.indexOf(clean[index + 2]);
    const d = alphabet.indexOf(clean[index + 3]);
    output[outputIndex++] = (a << 2) | (b >> 4);
    if (clean[index + 2] !== undefined) output[outputIndex++] = ((b & 15) << 4) | (c >> 2);
    if (clean[index + 3] !== undefined) output[outputIndex++] = ((c & 3) << 6) | d;
  }
  return output.slice(0, outputIndex).buffer;
}

function inferImageMimeType(...candidates: (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = candidate.split(';')[0].trim().toLowerCase();
    if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'image/jpeg';
    if (normalized === 'image/png' || normalized === 'image/webp') return normalized;

    const path = candidate.split(/[?#]/, 1)[0].toLowerCase();
    const extension = path.match(/\.(jpe?g|png|webp)$/)?.[1];
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    if (extension === 'png') return 'image/png';
    if (extension === 'webp') return 'image/webp';
  }
  return null;
}
