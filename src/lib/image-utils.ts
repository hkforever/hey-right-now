
/**
 * 图片处理工具类
 */

/**
 * 将图片文件裁剪并缩放为特定尺寸的 JPG 格式
 * @param file 原始文件
 * @param targetWidth 目标宽度
 * @param targetHeight 目标高度
 * @returns 处理后的 Blob 对象
 */
export async function resizeImage(file: File, targetWidth: number = 180, targetHeight: number = 180): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 只有图片才处理
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // 计算中心裁剪
      const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
      const x = (targetWidth / 2) - (img.width / 2) * scale;
      const y = (targetHeight / 2) - (img.height / 2) * scale;
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      // 转换为 JPG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.85 // 质量设置在 85% 左右平衡体积和清晰度
      );
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for resizing'));
    };
  });
}
