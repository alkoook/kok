import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="page flex min-h-dvh items-center justify-center"><section className="surface max-w-md p-7 text-center"><div className="mb-3 text-4xl">🃏</div><h1 className="text-xl font-black">صار خطأ غير متوقع</h1><p className="muted my-3">بيانات المباراة محفوظة قدر الإمكان.</p><Button onClick={() => window.location.reload()}>إعادة المحاولة</Button></section></main>;
  }
}
