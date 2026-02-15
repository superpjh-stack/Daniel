import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Sidebar } from '@/components/layout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.name} userRole={session.role} />

      <div className="flex-1 lg:ml-0">
        <div className="min-h-screen p-4 pt-16 md:p-6 lg:p-8 lg:pt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
