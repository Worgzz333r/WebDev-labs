import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import toast from 'react-hot-toast';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { attendanceService } from '@/services/attendance';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropUploadDialogProps {
  open: boolean;
  file: File | null;
  attendanceId: number;
  onClose: () => void;
  onUploaded: () => void;
}

// Обрізає джерело за областю кропу через canvas і повертає JPEG-blob
async function createCroppedBlob(imageSrc: string, area: CropArea): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не вдалося прочитати зображення'));
    img.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas недоступний');
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не вдалося створити зображення'))),
      'image/jpeg',
      0.9,
    );
  });
}

// Область кропу: URL для прев'ю живе стільки ж, скільки і цей компонент
// (створюється при монтуванні, звільняється при розмонтуванні)
function CropperArea({ file, onArea }: { file: File; onArea: (a: CropArea | null) => void }) {
  const [url] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <>
      <div className="relative h-72 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
        <Cropper
          image={url}
          crop={crop}
          zoom={zoom}
          aspect={4 / 3}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, areaPixels) => onArea(areaPixels ?? null)}
        />
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm">
        <span className="text-gray-500">Масштаб</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          aria-label="Масштаб зображення"
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
        />
      </label>
    </>
  );
}

// Діалог попереднього перегляду та обрізання зображення (завдання 11)
// перед надсиланням на файловий сервіс (POST /api/attendance/:id/document)
export default function CropUploadDialog({
  open,
  file,
  attendanceId,
  onClose,
  onUploaded,
}: CropUploadDialogProps) {
  const [area, setArea] = useState<CropArea | null>(null);
  const [uploading, setUploading] = useState(false);

  const close = () => {
    setArea(null);
    setUploading(false);
    onClose();
  };

  const upload = async () => {
    if (!file || !area) return;
    setUploading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      try {
        const blob = await createCroppedBlob(previewUrl, area);
        await attendanceService.uploadDocument(attendanceId, blob, file.name);
        toast.success('Документ завантажено');
        onUploaded();
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
    } catch {
      toast.error('Не вдалося завантажити документ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={close} title="Попередній перегляд і обрізання" size="lg">
      {file && <CropperArea key={`${file.name}-${file.size}`} file={file} onArea={setArea} />}

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={close}>
          Скасувати
        </Button>
        {/* кнопка активна лише коли react-easy-crop порахував область кропу */}
        <Button type="button" onClick={upload} isLoading={uploading} disabled={!area}>
          Обрізати й завантажити
        </Button>
      </div>
    </Modal>
  );
}
