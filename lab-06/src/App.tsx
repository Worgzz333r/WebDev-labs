import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/common/Loading';
// Часто відвідувані сторінки лишаємо в основному бандлі (перший екран і авторизація),
// решту розбиваємо на окремі chunks — завантажуються лише за потреби (завдання 15)
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotFoundPage from '@/pages/NotFoundPage';

const AboutPage = lazy(() => import('@/pages/AboutPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const GroupsPage = lazy(() => import('@/pages/GroupsPage'));
const GroupFormPage = lazy(() => import('@/pages/GroupFormPage'));
const GroupDetailPage = lazy(() => import('@/pages/GroupDetailPage'));
const SubjectsPage = lazy(() => import('@/pages/SubjectsPage'));
const SubjectFormPage = lazy(() => import('@/pages/SubjectFormPage'));
const SubjectDetailPage = lazy(() => import('@/pages/SubjectDetailPage'));
const LessonsPage = lazy(() => import('@/pages/LessonsPage'));
const LessonFormPage = lazy(() => import('@/pages/LessonFormPage'));
const LessonDetailPage = lazy(() => import('@/pages/LessonDetailPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const UserFormPage = lazy(() => import('@/pages/UserFormPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="groups"
              element={
                <ProtectedRoute>
                  <GroupsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="groups/create"
              element={
                <ProtectedRoute>
                  <GroupFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="subjects/:id"
              element={
                <ProtectedRoute>
                  <SubjectDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="groups/:id"
              element={
                <ProtectedRoute>
                  <GroupDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="groups/:id/edit"
              element={
                <ProtectedRoute>
                  <GroupFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="subjects"
              element={
                <ProtectedRoute>
                  <SubjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="subjects/create"
              element={
                <ProtectedRoute>
                  <SubjectFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="subjects/:id/edit"
              element={
                <ProtectedRoute>
                  <SubjectFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="lessons"
              element={
                <ProtectedRoute>
                  <LessonsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="lessons/create"
              element={
                <ProtectedRoute>
                  <LessonFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="lessons/:id"
              element={
                <ProtectedRoute>
                  <LessonDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="lessons/:id/edit"
              element={
                <ProtectedRoute>
                  <LessonFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users/create"
              element={
                <ProtectedRoute>
                  <UserFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users/:id/edit"
              element={
                <ProtectedRoute>
                  <UserFormPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
