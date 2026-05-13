import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency: string = "KES") {
  const safeAmount = typeof amount === 'number' ? amount : 0;
  const safeCurrency = (currency && currency.length === 3) ? currency : "KES";
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 0,
    }).format(safeAmount);
  } catch (e) {
    return `${safeCurrency} ${safeAmount.toLocaleString()}`;
  }
}

export async function compressImage(dataUrl: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (error) => reject(error);
  });
}
