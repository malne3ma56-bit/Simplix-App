import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { LangProvider } from '@/context/LangContext';
import { AppModeProvider, useAppMode } from '@/context/AppModeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';
import { NotificationProvider } from '@/context/NotificationContext';
import { CustomerApp } from '@/components/customer/CustomerApp';
import { ProviderApp } from '@/components/provider/ProviderApp';
import { AdminApp } from '@/components/admin/AdminApp';
import { SplashScreen } from '@/components/SplashScreen';

// مكون لاكتشاف الأخطاء وعرضها على الشاشة مباشرة بدلاً من الشاشة البيضاء
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', background: '#fee2e2', color: '#991b1b', minHeight: '100vh', direction: 'ltr', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>⚠️ App Runtime Error:</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fff', padding: '15px', borderRadius: '8px' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <LangProvider>
        <AuthProvider>
          <AppModeProvider>
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
            <AppRouter />
          </AppModeProvider>
        </AuthProvider>
      </LangProvider>
    </ErrorBoundary>
  );
}