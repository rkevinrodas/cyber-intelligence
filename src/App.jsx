// src/App.jsx
import Header          from './components/Header.jsx';
import SyncPanel       from './components/SyncPanel.jsx';
import StatsBar        from './components/StatsBar.jsx';
import Sidebar         from './components/Sidebar.jsx';
import ThreatList      from './components/ThreatList.jsx';
import DetailPanel     from './components/DetailPanel.jsx';
import SettingsModal   from './components/SettingsModal.jsx';
import LocalDBBanner   from './components/LocalDBBanner.jsx';
import FirstRunDialog  from './components/FirstRunDialog.jsx';
import Footer          from './components/Footer.jsx';
import ToastContainer  from './components/Toast.jsx';

export default function App() {
  return (
    <div className="app-root">
      <Header />
      <LocalDBBanner />
      <SyncPanel />
      <StatsBar />
      <div className="app-layout">
        <Sidebar />
        <main className="content-area">
          <ThreatList />
        </main>
      </div>
      <Footer />

      {/* Portal-rendered overlays — order matters for z-index stacking */}
      <DetailPanel />
      <SettingsModal />
      <FirstRunDialog />
      <ToastContainer />
    </div>
  );
}
