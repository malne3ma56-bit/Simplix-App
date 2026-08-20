        import { useState } from 'react';
import { LangProvider } from '@/context/LangContext';
import { AppModeProvider, useAppMode } from '@/context/AppModeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';
import { NotificationProvider } from '@/context/NotificationContext';
import { CustomerApp } from '@/components/customer/CustomerApp';
import { ProviderApp } from '@/components/provider/ProviderApp';
import { AdminApp } from '@/components/admin/AdminApp';
import { SplashScreen } from '@/components/SplashScreen';

function AppRouter() {
  const { mode } = useAppMode();
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-900 border-t-transparent" />
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen />;
  }

  // Guard: provider/admin modes require the matching role; otherwise show customer app.
  if (mode === 'provider' && profile.role !== 'provider' && profile.role !== 'admin') {
    return <RoleMismatch mode="provider" current={profile.role} />;
  }
  if (mode === 'admin' && profile.role !== 'admin') {
    return <RoleMismatch mode="admin" current={profile.role} />;
  }

  if (mode === 'provider') return <NotificationProvider><ProviderApp /></NotificationProvider>;
  if (mode === 'admin') return <NotificationProvider><AdminApp /></NotificationProvider>;
  return <NotificationProvider><CustomerApp /></NotificationProvider>;
}

function RoleMismatch({ mode, current }: { mode: string; current: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="text-lg font-extrabold text-amber-800">
          {current === 'customer'
            ? `هذا الحساب عميل. واجهة ${mode === 'admin' ? 'المشرف' : 'المزود'} تتطلب صلاحيات خاصة.`
            : `This account is a customer. The ${mode} interface requires elevated permissions.`}
        </p>
        <p className="mt-2 text-sm text-amber-700">
          {current === 'customer'
            ? 'يمكنك التبديل إلى واجهة العميل من الأعلى. لإنشاء حساب مزود أو مشرف، تواصل مع الإدارة.'
            : 'Switch to the Customer interface from the top. Contact admin to request provider/admin access.'}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <LangProvider>
      <AuthProvider>
        <AppModeProvider>
          {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
          <AppRouter />
        </AppModeProvider>
      </AuthProvider>
    </LangProvider>
  );
}  
