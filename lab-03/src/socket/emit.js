// Надсилає подію в кімнати; без io (наприклад, у тестах контролерів) нічого не робить
export function emitToRooms(req, rooms, event, payload) {
    const io = req.app.get('io');
    if (!io) return;
    io.to(rooms).emit(event, payload);
}

// Відвідуваність бачать: заняття (кімната lesson) і сам студент
export function emitAttendance(req, event, record) {
    emitToRooms(req, [`lesson:${record.lessonId}`, `user:${record.studentId}`], event, record);
}

// Заняття бачать: його кімната, кімната групи й викладач
export function emitLesson(req, event, lesson) {
    emitToRooms(
        req,
        [`lesson:${lesson.id}`, `group:${lesson.groupId}`, `user:${lesson.teacherId}`],
        event,
        lesson,
    );
}