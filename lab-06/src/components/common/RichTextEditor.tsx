import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface RichTextEditorProps {
  /** HTML-вміст (наприклад, з react-hook-form через watch/setValue) */
  value: string;
  onChange: (html: string) => void;
  ariaLabel?: string;
}

const toolButton =
  'rounded px-2 py-1 text-sm font-medium hover:bg-gray-100 disabled:opacity-30 data-active:bg-primary-50 data-active:text-primary-700 dark:hover:bg-gray-800 dark:data-active:bg-gray-700 dark:data-active:text-primary-300';

// Розширений текстовий редактор (завдання 13) на Tiptap. Модуль важкий —
// підключайте через React.lazy (див. LessonFormPage), щоб не збільшувати початковий бандл.
export default function RichTextEditor({ value, onChange, ariaLabel }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    // React 19 + StrictMode монтує компоненти двічі: без цієї опції Tiptap крашиться
    // на другому монтуванні ("Cannot read properties of null (reading 'cached')")
    immediatelyRender: false,
    editorProps: {
      attributes: { 'aria-label': ariaLabel ?? 'Текстовий редактор' },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // синхронізація, коли значення приходить ззовні (завантаження заняття при редагуванні)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return <div className="h-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />;

  return (
    <div className="rounded border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 dark:border-gray-600">
      <div
        role="toolbar"
        aria-label="Форматування тексту"
        className="flex flex-wrap gap-1 border-b border-gray-200 p-2 dark:border-gray-700"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive('bold')}
          className={toolButton}
        >
          <span aria-hidden="true">B</span>
          <span className="sr-only">Жирний</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          aria-pressed={editor.isActive('italic')}
          className={`${toolButton} italic`}
        >
          <span aria-hidden="true">I</span>
          <span className="sr-only">Курсив</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          aria-pressed={editor.isActive('strike')}
          className={`${toolButton} line-through`}
        >
          <span aria-hidden="true">S</span>
          <span className="sr-only">Закреслений</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={!editor.can().chain().focus().toggleBulletList().run()}
          aria-pressed={editor.isActive('bulletList')}
          className={toolButton}
        >
          <span aria-hidden="true">• Список</span>
          <span className="sr-only">Маркований список</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={!editor.can().chain().focus().toggleOrderedList().run()}
          aria-pressed={editor.isActive('orderedList')}
          className={toolButton}
        >
          <span aria-hidden="true">1. Список</span>
          <span className="sr-only">Нумерований список</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className={toolButton}
        >
          Очистити
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="prose-p:m-0 [&_.ProseMirror]:min-h-32 [&_.ProseMirror]:p-3 [&_.ProseMirror]:outline-none [&_.ProseMirror]:dark:text-gray-100 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
      />
    </div>
  );
}
