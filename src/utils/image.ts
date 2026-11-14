import { assertRealImage } from './validation';

interface CompressResult {
  file: File;
  width: number;
  height: number;
}

const MAX_DIMENSION_BY_BUCKET: Record<string, number> = {
  sponsors: 700,
  cyclists: 1200,
  gallery: 1400,
  news: 1800,
  banners: 1800,
};

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo optimizar la imagen.'));
      },
      type,
      quality,
    );
  });
}

export async function optimizeImage(
  file: File,
  bucket: string,
): Promise<CompressResult> {
  await assertRealImage(file);

  const maxDimension = MAX_DIMENSION_BY_BUCKET[bucket] ?? 1600;
  const bitmap = await loadBitmap(file);
  const sourceWidth = 'width' in bitmap ? bitmap.width : 0;
  const sourceHeight = 'height' in bitmap ? bitmap.height : 0;

  if (!sourceWidth || !sourceHeight) {
    throw new Error('No se pudo determinar el tamaño de la imagen.');
  }

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  // Small PNG logos keep transparency and original quality.
  if (file.type === 'image/png' && scale === 1 && file.size < 700 * 1024) {
    return { file, width, height };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no soporta procesamiento de imágenes.');

  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

  const supportsWebp = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  const outputType = supportsWebp ? 'image/webp' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, outputType, 0.82);
  const extension = outputType === 'image/webp' ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagen';

  return {
    file: new File([blob], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    }),
    width,
    height,
  };
}
