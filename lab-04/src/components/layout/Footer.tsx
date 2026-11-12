export default function Footer() {
  return (
    <footer className="bg-gray-100 py-6 text-center text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-400">
      <p>© {new Date().getFullYear()} MyApp. Контакти: info@example.com</p>
    </footer>
  );
}
