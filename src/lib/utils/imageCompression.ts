import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file before upload.
 * If the file is not an image, or is a GIF, it returns the original file untouched.
 */
export async function compressImage(file: File, maxSizeMB: number = 1.5, maxWidthOrHeight: number = 1920): Promise<File> {
  // Ignore non-images and GIFs (which lose animation if compressed as static images)
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  const options = {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
  };
  
  try {
    const compressedBlob = await imageCompression(file, options);
    // Convert Blob back to File to maintain compatibility with existing upload handlers
    return new File([compressedBlob], file.name, { type: compressedBlob.type, lastModified: Date.now() });
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Fallback to the original file if compression fails
  }
}
