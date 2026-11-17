import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { lessonsService } from '@/services/lessons';
import AttendancePanel from '@/components/attendance/AttendancePanel';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ErrorMessage from '@/components/common/ErrorMessage';
import Skeleton from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { htmlToText, sanitizeHtml } from '@/utils/sanitize';

export default function LessonDetailPage() {
  const { id } = useParams();
  const lessonId = Number(id);
  const canEdit = useAuthStore((s) => s.user?.role === 'ADMIN' || s.user?.role === 'TEACHER');

  const {
    data: lesson,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['lessons', lessonId],
    queryFn: () => lessonsService.getById(lessonId),
  });

  // тема зберігається як HTML (Tiptap) — у заголовок і хлібні крихти беремо plain-текст
  const topicText = lesson?.topic ? htmlToText(lesson.topic) : '';
  const title = topicText || `Заняття #${lessonId}`;

  const rows = lesson
    ? [
        {
          label: 'Дата й час',
          value: new Date(lesson.date).toLocaleString('uk-UA', {
            dateStyle: 'long',
            timeStyle: 'short',
          }),
        },
        { label: 'Предмет', value: lesson.subject.name },
        { label: 'Група', value: lesson.group.name },
        { label: 'Викладач', value: lesson.teacher.fullName },
      ]
    : [];

  return (
    <section className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Головна', to: '/dashboard' },
          { label: 'Заняття', to: '/lessons' },
          { label: lesson ? title : '...' },
        ]}
      />

      {isPending && (
        <>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40" />
        </>
      )}
      {isError && <ErrorMessage message={error.message} />}

      {lesson && (
        <>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">{title}</h1>
            {canEdit && (
              <Link to={`/lessons/${lesson.id}/edit`}>
                <Button variant="secondary">Редагувати</Button>
              </Link>
            )}
          </div>

          <Card>
            <dl className="grid gap-4 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.label}>
                  <dt className="text-sm text-gray-500">{r.label}</dt>
                  <dd className="text-lg font-medium">{r.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {topicText && (
            <Card>
              <h2 className="mb-3 text-xl font-bold">Тема</h2>
              {/* HTML з редактора очищається від небезпечних тегів перед рендером */}
              <div
                className="space-y-2 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:pl-4 [&_pre]:rounded [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:text-sm [&_ul]:list-disc [&_ul]:pl-4 dark:[&_blockquote]:border-gray-600 dark:[&_pre]:bg-gray-800"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.topic ?? '') }}
              />
            </Card>
          )}

          <AttendancePanel lesson={lesson} />
        </>
      )}
    </section>
  );
}
