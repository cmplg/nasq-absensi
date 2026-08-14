/**
 * Utility functions for client-side image compression and mobile-optimized file reading
 */

export function compressAndResizeImage(
  dataUrl: string,
  maxWidth = 480,
  maxHeight = 480,
  quality = 0.50
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
  });
}

export function readAndCompressFile(
  file: File,
  maxWidth = 480,
  maxHeight = 480,
  quality = 0.50
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Fast path using URL.createObjectURL for mobile Chrome efficiency
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        reject(new Error('Gagal memproses canvas gambar'));
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      // Fallback to FileReader if ObjectURL fails
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          try {
            const compressed = await compressAndResizeImage(
              e.target.result as string,
              maxWidth,
              maxHeight,
              quality
            );
            resolve(compressed);
          } catch (resErr) {
            resolve(e.target.result as string);
          }
        } else {
          reject(new Error('Gagal membaca file gambar'));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
      reader.readAsDataURL(file);
    };
  });
}
