/**
 * Cloudinary upload helper
 * Uses the Cloudinary Upload API for server-side image uploads.
 */

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY!;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET!;

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload an image to Cloudinary.
 * @param file - Base64 encoded image string or a public URL
 * @param folder - Cloudinary folder path (e.g. 'avatars', 'banners', 'posts')
 */
export async function uploadImage(
  file: string,
  folder: string = 'aza'
): Promise<CloudinaryUploadResult> {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // Generate signature
  const crypto = require('crypto');
  const signatureString = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = crypto
    .createHash('sha1')
    .update(signatureString)
    .digest('hex');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Cloudinary upload error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Generate a Cloudinary image URL with transformations.
 * Useful for generating thumbnails, avatars, etc.
 */
export function getImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
    quality?: 'auto' | number;
  } = {}
): string {
  const { width, height, crop = 'fill', quality = 'auto' } = options;
  
  const transformations: string[] = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  transformations.push(`q_${quality}`);
  transformations.push('f_auto');

  const transformString = transformations.join(',');
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformString}/${publicId}`;
}
