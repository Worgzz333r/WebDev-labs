import { useEffect, useState } from 'react';
import { filesService } from '@/services/files';

interface AuthImageProps {
  fileId: number;
  alt: string;
  className?: string;
}

// <img> для файлів, що віддаються лише з Bearer-токеном: отримуємо blob
// і створюємо локальний object URL (звільняємо його при розмонтуванні)
export default function AuthImage({ fileId, alt, className }: AuthImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    filesService
      .getBlobUrl(fileId)
      .then((url) => {
        if (!alive) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (failed) return <p className="text-sm text-red-500">Не вдалося завантажити зображення</p>;
  if (!src) {
    return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className ?? ''}`} />;
  }
  return <img src={src} alt={alt} className={className} />;
}
