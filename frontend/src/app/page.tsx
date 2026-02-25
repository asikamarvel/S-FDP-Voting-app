'use client';

import { Dashboard } from '@/components/Dashboard';
import LoginPage from '@/components/LoginPage';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <main className="min-h-screen">
      <Dashboard />
    </main>
  );
}
