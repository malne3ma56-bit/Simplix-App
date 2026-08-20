import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '50px', direction: 'ltr', fontFamily: 'sans-serif' }}>
      <h1>⚠️ Emergency Test Mode</h1>
      <p>If you can read this, the React application itself is running correctly.</p>
      <p>The issue is likely in one of your Providers (Auth, Lang, AppMode) or your Router setup.</p>
    </div>
  );
}