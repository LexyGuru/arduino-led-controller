import {
  useEffect,
  useState
} from 'react';

import {
  getVersion
} from '@tauri-apps/api/app';

import {
  Sidebar
} from './components/Sidebar';

import {
  Topbar
} from './components/Topbar';

import {
  useController
} from './hooks/useController';

import {
  DashboardPage
} from './pages/DashboardPage';

import {
  FirmwarePage
} from './pages/FirmwarePage';

import {
  LedsPage
} from './pages/LedsPage';

import {
  LogsPage
} from './pages/LogsPage';

import {
  SchedulesPage
} from './pages/SchedulesPage';

import {
  SettingsPage
} from './pages/SettingsPage';

import { useI18n } from './i18n';

import type {
  PageId
} from './types';

export default function App() {
  const { t } = useI18n();
  const [
    page,
    setPage
  ] =
    useState<PageId>(
      'dashboard'
    );

  const [
    appVersion,
    setAppVersion
  ] =
    useState('…');

  const controller =
    useController(page);


  useEffect(
    () => {
      void getVersion()
        .then(
          setAppVersion
        )
        .catch(
          () =>
            setAppVersion(
              t('app.unknown')
            )
        );
    },
    []
  );

  useEffect(
    () => {
      if (
        !controller.capabilities
          .otaSupported &&
        page ===
          'firmware'
      ) {
        setPage(
          'dashboard'
        );
      }
    },
    [
      controller.capabilities
        .otaSupported,
      page
    ]
  );

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onChange={setPage}
        appVersion={
          appVersion
        }
        firmwareVersion={
          controller.status
            ?.firmwareVersion
        }
        otaSupported={
          controller.capabilities
            .otaSupported
        }
      />
      <div className="content-shell">
        <Topbar
          online={
            Boolean(
              controller.status
                ?.connected
            )
          }
          message={
            controller.message
          }
          busy={
            controller.busy
          }
          onRefresh={
            () =>
              void controller
                .refresh()
          }
        />
        <main className="content">
          {page ===
            'dashboard' && (
            <DashboardPage
              status={
                controller.status
              }
              schedules={
                controller.schedules
              }
              scheduleSync={
                controller.scheduleSync
              }
            />
          )}

          {page ===
            'leds' && (
            <LedsPage
              strips={
                controller.status
                  ?.strips ??
                []
              }
              busy={
                controller.busy
              }
              onUpdate={
                (strip) =>
                  void controller
                    .updateStrip(
                      strip
                    )
              }
              onTest={
                (preset) =>
                  void controller
                    .runLedTest(
                      preset
                    )
              }
              onStopTest={
                () =>
                  void controller
                    .stopLedTest()
              }
            />
          )}

          {page ===
            'schedules' && (
            <SchedulesPage
              schedules={
                controller.schedules
              }
              scheduleSync={
                controller.scheduleSync
              }
              busy={
                controller.busy
              }
              onSave={
                (
                  schedules,
                  expectedRevision,
                  force
                ) =>
                  controller.saveSchedules(
                    schedules,
                    expectedRevision,
                    force
                  )
              }
              onSync={
                () =>
                  controller
                    .syncSchedulesFromArduino()
              }
            />
          )}

          {controller.capabilities
            .otaSupported &&
          page ===
            'firmware' && (
            <FirmwarePage
              firmware={
                controller.firmware
              }
              busy={
                controller.busy
              }
              otaLogs={
                controller.otaLogs
              }
              otaProgress={
                controller.otaProgress
              }
              otaStage={
                controller.otaStage
              }
              onRefresh={
                () =>
                  void controller
                    .refreshFirmware()
              }
              onUpdate={
                () =>
                  void controller
                    .updateFirmware()
              }
              onCancel={
                () =>
                  void controller
                    .cancelFirmware()
              }
            />
          )}

          {page ===
            'logs' && (
            <LogsPage
              arduino={
                controller.logs
              }
              network={
                controller.networkLogs
              }
              error={
                controller.consoleError
              }
            />
          )}

          {page ===
            'settings' && (
            <SettingsPage
              platform={controller.capabilities.platform}
              otaSupported={
                controller.capabilities
                  .otaSupported
              }
              config={
                controller.config
              }
              busy={
                controller.busy
              }
              onChange={
                controller.setConfig
              }
              onSave={
                () =>
                  void controller
                    .saveConfig()
              }
              onTest={
                () =>
                  void controller
                    .testConnection()
              }
              otaPassword={
                controller.otaPassword
              }
              onOtaPasswordChange={
                controller
                  .setOtaPassword
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
