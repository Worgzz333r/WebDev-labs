import { io } from 'socket.io-client';

const BASE = 'http://localhost:3000';
const STUDENT = { email: 'student@test.com', password: 'Test1234!' };

const r = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(STUDENT),
});
const { tokens } = await r.json();
const socket = io(BASE, { auth: { token: tokens.accessToken ?? tokens.access } });

socket.on('connect', async () => {
  const results = [];
  for (let i = 1; i <= 35; i++) {
    results.push(await socket.emitWithAck('events:since', 0));
  }
  const limited = results.filter((x) => x.error === 'rate_limited').length;
  console.log(limited === 5 ? '✅' : '❌', 'rate_limited:', limited, 'з 35 (очікую 5)');
  process.exit(0);
});