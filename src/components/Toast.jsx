// src/components/Toast.jsx
import { useApp } from '../context/AppContext.jsx';

export default function ToastContainer() {
  const { state } = useApp();
  return (
    <div className="toast-container">
      {state.toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-dot" />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
