import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import AuthImage from '@/components/common/AuthImage';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ErrorMessage from '@/components/common/ErrorMessage';
import Input from '@/components/common/Input';
import Skeleton from '@/components/common/Skeleton';
import CropUploadDialog from './CropUploadDialog';
import { attendanceService } from '@/services/attendance';
import { filesService } from '@/services/files';
import { groupsService } from '@/services/groups';
import { useAuthStore } from '@/stores/authStore';
import type { Attendance, AttendanceStatus, LessonDetail } from '@/types/api.types';

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Присутній',
  ABSENT: 'Відсутній',
  LATE: 'Запізнився',
  EXCUSED: 'Поважна причина',
};

const statusColors: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ABSENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  LATE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  EXCUSED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const selectClass =
  'rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900';

// Панель відвідуваності заняття (завдання 11): викладач/адмін позначають студентів,
// студент бачить свій статус і може прикріпити фото-документ із попереднім переглядом та обрізанням.
export default function AttendancePanel({ lesson }: { lesson: LessonDetail }) {
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === 'STUDENT';
  const canManage = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const queryClient = useQueryClient();

  // Окремий запит (а не lesson.attendance): invalidateQueries(['attendance'])
  // з useRealtimeSync оновлюватиме панель у реальному часі
  const {
    data: attendancePage,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['attendance', lesson.id],
    queryFn: () => attendanceService.getAll({ lessonId: lesson.id, limit: 100 }),
  });
  const records = attendancePage?.data ?? [];
  const byStudent = new Map(records.map((r) => [r.studentId, r]));

  // Студенти групи — лише для викладача/адміна
  const { data: groupDetail } = useQuery({
    queryKey: ['groups', lesson.groupId],
    queryFn: () => groupsService.getById(lesson.groupId),
    enabled: canManage,
  });

  const upsert = useMutation({
    mutationFn: ({ studentId, status, attendanceId }: UpsertVariables) =>
      attendanceId
        ? attendanceService.update(attendanceId, { status })
        : attendanceService.create({ lessonId: lesson.id, studentId, status }),
    onSuccess: () => {
      toast.success('Відвідуваність оновлено');
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(message ?? 'Не вдалося зберегти відмітку');
    },
  });

  return (
    <Card>
      <h2 className="mb-4 text-xl font-bold">Відвідуваність</h2>

      {isPending && <Skeleton className="h-40" />}
      {isError && <ErrorMessage message={error.message} />}

      {/* --- Викладач/адмін: список студентів групи зі статусами --- */}
      {canManage && groupDetail && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {groupDetail.students.length === 0 && (
            <li className="py-3 text-gray-500">У групі ще немає студентів.</li>
          )}
          {groupDetail.students.map((s) => (
            <AttendanceRow
              key={s.id}
              fullName={s.fullName}
              record={byStudent.get(s.id)}
              disabled={upsert.isPending}
              onStatusChange={(status) =>
                upsert.mutate({
                  studentId: s.id,
                  status,
                  attendanceId: byStudent.get(s.id)?.id,
                })
              }
            />
          ))}
        </ul>
      )}

      {/* --- Студент: свій статус + документ --- */}
      {isStudent && <StudentSection records={records} />}
    </Card>
  );
}

interface UpsertVariables {
  studentId: number;
  status: AttendanceStatus;
  attendanceId?: number;
}

interface AttendanceRowProps {
  fullName: string;
  record?: Attendance;
  disabled: boolean;
  onStatusChange: (status: AttendanceStatus) => void;
}

// Рядок одного студента. Окремий компонент, щоб стан коментаря не «змішувався» між рядками
// (useState не можна викликати всередині map батьківського компонента).
function AttendanceRow({ fullName, record, disabled, onStatusChange }: AttendanceRowProps) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState(record?.comment ?? '');
  const commentChanged = (record?.comment ?? '') !== comment;

  const saveComment = useMutation({
    mutationFn: ({ attendanceId, comment: c }: { attendanceId: number; comment: string }) =>
      attendanceService.update(attendanceId, { comment: c || undefined }),
    onSuccess: () => {
      toast.success('Коментар збережено');
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: () => toast.error('Не вдалося зберегти коментар'),
  });

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="min-w-48 flex-1">{fullName}</span>

      <select
        aria-label={`Статус: ${fullName}`}
        className={selectClass}
        value={record?.status ?? ''}
        disabled={disabled}
        onChange={(e) => e.target.value && onStatusChange(e.target.value as AttendanceStatus)}
      >
        <option value="">Не відмічено</option>
        {(Object.keys(statusLabels) as AttendanceStatus[]).map((st) => (
          <option key={st} value={st}>
            {statusLabels[st]}
          </option>
        ))}
      </select>

      {record && (
        <>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[record.status]}`}
          >
            {statusLabels[record.status]}
          </span>
          <div className="flex items-center gap-2">
            <Input
              aria-label={`Коментар: ${fullName}`}
              placeholder="Коментар (необов'язково)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-56 py-1.5 text-sm"
              maxLength={500}
            />
            {commentChanged && (
              <Button
                size="sm"
                variant="secondary"
                isLoading={saveComment.isPending}
                onClick={() => saveComment.mutate({ attendanceId: record.id, comment })}
              >
                Зберегти
              </Button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

// Студент: свій статус і прикріплення фото-документа (лише до власного запису)
function StudentSection({ records }: { records: Attendance[] }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const mine = records.find((r) => r.student.id === user?.id);

  // Деталі власного запису: тільки там сервер повертає приєднаний документ
  const { data: ownRecord } = useQuery({
    queryKey: ['attendance', 'detail', mine?.id],
    queryFn: () => attendanceService.getById(mine!.id),
    enabled: mine !== undefined,
  });

  const removeFile = useMutation({
    mutationFn: (fileId: number) => filesService.remove(fileId),
    onSuccess: () => {
      toast.success('Документ видалено');
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: () => toast.error('Не вдалося видалити документ'),
  });

  if (!mine) {
    return (
      <p className="text-gray-500">Викладач ще не позначив вашу відвідуваність на цьому занятті.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-gray-500">Ваш статус:</span>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[mine.status]}`}>
          {statusLabels[mine.status]}
        </span>
      </div>

      {mine.comment && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Коментар викладача: {mine.comment}
        </p>
      )}

      <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
        <h3 className="mb-2 font-semibold">Фото-документ (пояснювальна, довідка…)</h3>

        {ownRecord?.document ? (
          <div className="space-y-3">
            <AuthImage
              fileId={ownRecord.document.fileId}
              alt="Фото-документ"
              className="max-h-72 rounded"
            />
            <div className="flex items-center gap-3">
              {ownRecord.document.file && (
                <span className="text-sm text-gray-500">{ownRecord.document.file.originalName}</span>
              )}
              <Button
                size="sm"
                variant="danger"
                isLoading={removeFile.isPending}
                onClick={() => removeFile.mutate(ownRecord.document!.fileId)}
              >
                Видалити
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">
              Завантажте зображення (JPEG/PNG до 5 МБ): можна попередньо переглянути та обрізати.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              aria-label="Обрати зображення документа"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCropFile(file);
                setCropOpen(true);
                e.target.value = '';
              }}
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Обрати зображення
            </Button>
          </>
        )}
      </div>

      <CropUploadDialog
        open={cropOpen}
        file={cropFile}
        attendanceId={mine.id}
        onClose={() => setCropOpen(false)}
        onUploaded={() => {
          setCropOpen(false);
          void queryClient.invalidateQueries({ queryKey: ['attendance'] });
        }}
      />
    </div>
  );
}
