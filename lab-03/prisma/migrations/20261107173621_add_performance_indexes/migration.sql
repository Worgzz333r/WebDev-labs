-- CreateIndex
CREATE INDEX "Attendance_studentId_id_idx" ON "Attendance"("studentId", "id");

-- CreateIndex
CREATE INDEX "Lesson_groupId_date_idx" ON "Lesson"("groupId", "date");
