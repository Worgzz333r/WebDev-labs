const B = 'http://localhost:3000';
const LESSON_ID = 0;   // підставте lessonId
const STUDENT_ID = 0;  // підставте studentId

const login = async (email, password) => {
  const r = await fetch(B + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Вхід ${email}: ${r.status} ${JSON.stringify(d)}`);
  return d.tokens.accessToken;
};
const teacher = await login('teacher@test.com', 'Test1234!');
const student = await login('student@test.com', 'Test1234!');
const h = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

let r = await fetch(B + '/api/attendance', {
  method: 'POST', headers: h(teacher),
  body: JSON.stringify({ lessonId: LESSON_ID, studentId: STUDENT_ID, status: 'ABSENT' }),
});
if (r.status === 409) {
  // відмітка вже є (наприклад, з redis-check): міняємо статус
  const list = await (await fetch(`${B}/api/attendance?lessonId=${LESSON_ID}&studentId=${STUDENT_ID}`, { headers: h(teacher) })).json();
  r = await fetch(`${B}/api/attendance/${list.data[0].id}`, {
    method: 'PUT', headers: h(teacher), body: JSON.stringify({ status: 'ABSENT' }),
  });
}
console.log('відмітка ABSENT →', r.status);

const n = await (await fetch(B + '/api/notifications?limit=3', { headers: h(student) })).json();
console.table(n.data.map(({ type, priority, title }) => ({ type, priority, title })));