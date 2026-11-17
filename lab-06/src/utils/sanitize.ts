import DOMPurify from 'dompurify';

// Тема заняття зберігається як HTML з Tiptap. Перед рендером очищаємо від скриптів
// і небезпечних атрибутів: лишаємо лише безпечне форматування.
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'blockquote',
  'code',
  'pre',
];

export const sanitizeHtml = (html: string) =>
  DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] });

//Plain-текст з HTML — для заголовків і колонок таблиць
export const htmlToText = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.trim() ?? '';
};
