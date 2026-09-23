import React from 'react';

export default function Footer() {
  return (
    <footer className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
      Study Time Tracker &copy; {new Date().getFullYear()}
    </footer>
  );
}
