import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { useController } from './hooks/useController';
import { DashboardPage } from './pages/DashboardPage';
import { FirmwarePage } from './pages/FirmwarePage';
import { LedsPage } from './pages/LedsPage';
import { LogsPage } from './pages/LogsPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { SettingsPage } from './pages/SettingsPage';
import type { PageId } from './types';

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [appVersion, setAppVersion] = useState('…');
  const c = useController();

  useEffect(() => {
    void getVersion().then(setAppVersion).catch(() => setAppVersion('ismeretlen'));
  }, []);
  return <div className="app-shell">
    <Sidebar page={page} onChange={setPage} appVersion={appVersion} firmwareVersion={c.status?.firmwareVersion}/>
    <div className="content-shell">
      <Topbar online={Boolean(c.status?.connected)} message={c.message} busy={c.busy} onRefresh={() => void c.refresh()}/>
      <main className="content">
        {page === 'dashboard' && <DashboardPage status={c.status} schedules={c.schedules}/>} 
        {page === 'leds' && <LedsPage strips={c.status?.strips ?? []} busy={c.busy} onUpdate={(s) => void c.updateStrip(s)} onTest={(preset) => void c.runLedTest(preset)} onStopTest={() => void c.stopLedTest()}/>} 
        {page === 'schedules' && <SchedulesPage schedules={c.schedules} busy={c.busy} onSave={(x) => void c.saveSchedules(x)} onSync={() => void c.syncSchedulesFromArduino()}/>} 
        {page === 'firmware' && <FirmwarePage firmware={c.firmware} busy={c.busy} onRefresh={() => void c.refreshFirmware()} onUpdate={() => void c.updateFirmware()}/>} 
        {page === 'logs' && <LogsPage arduino={c.logs} network={c.networkLogs}/>} 
        {page === 'settings' && <SettingsPage config={c.config} busy={c.busy} onChange={c.setConfig} onSave={() => void c.saveConfig()} otaPassword={c.otaPassword} onOtaPasswordChange={c.setOtaPassword}/>} 
      </main>
    </div>
  </div>;
}
