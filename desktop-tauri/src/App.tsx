import {
  useEffect,
  useState
} from 'react';

import {
  Sidebar
} from './components/Sidebar';

import {
  Topbar
} from './components/Topbar';

import {
  BottomNav
} from './components/BottomNav';

import {
  useController
} from './hooks/useController';

import { useAppUpdateCenter } from './hooks/useAppUpdateCenter';

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
import { runAudited } from './services/tauriAudit';
import { tauriApi } from './services/tauriApi';

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

  const appUpdate =
    useAppUpdateCenter({
      updateChannel: controller.config.updateChannel,
      autoCheckUpdates: controller.config.autoCheckUpdates
    });


  useEffect(
    () => {
      void tauriApi.appVersion()
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

  return (
    <div className="app-shell core-ui-v15">
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
        updateAvailable={appUpdate.updateAvailable}
        latestAppVersion={appUpdate.latestVersion ?? undefined}
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
        <main className="content" data-page={page}>
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
              connectionHealth={
                controller.connectionHealth
              }
              networkLogs={
                controller.networkLogs
              }
              busy={
                controller.busy
              }
              onSyncTime={
                () => runAudited(
                  {source:'time',action:'time.sync',message:t('audit.timeSyncStart'),successMessage:t('audit.timeSyncSuccess')},
                  controller.syncTimeWithComputer
                )
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
                (strip) => void runAudited(
                  {
                    source:'led',
                    action:strip.enabled?'led.enable':'led.disable',
                    message:t(strip.enabled?'audit.ledEnabled':'audit.ledDisabled',{led:strip.id})
                  },
                  () => controller.updateStrip(strip)
                )
              }
              onTest={
                (preset) => void runAudited(
                  {source:'led',action:'led.test',message:t('audit.ledTest',{preset})},
                  () => controller.runLedTest(preset)
                )
              }
              onStopTest={
                () => void runAudited(
                  {source:'led',action:'led.test.stop',message:t('audit.ledTestStop')},
                  controller.stopLedTest
                )
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
                ) => runAudited(
                  {
                    source:'schedule',
                    action:'schedule.save',
                    message:t('audit.scheduleSave',{count:schedules.length}),
                    successMessage:t('audit.scheduleSaved',{count:schedules.length})
                  },
                  () => controller.saveSchedules(schedules,expectedRevision,force)
                )
              }
              onSync={
                () => runAudited(
                  {source:'schedule',action:'schedule.sync',message:t('audit.scheduleSync')},
                  controller.syncSchedulesFromArduino
                )
              }
            />
          )}

          {page ===
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
                () => void runAudited(
                  {source:'firmware',action:'firmware.check',message:t('audit.firmwareCheck')},
                  controller.refreshFirmware
                )
              }
              onUpdate={
                () => void runAudited(
                  {source:'ota',action:'ota.start',message:t('audit.otaStart')},
                  controller.updateFirmware
                )
              }
              onCancel={
                () => void runAudited(
                  {source:'ota',action:'ota.cancel',message:t('audit.otaCancel')},
                  controller.cancelFirmware
                )
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
              status={
                controller.status
              }
              connectionHealth={
                controller.connectionHealth
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
              appUpdate={appUpdate}
            />
          )}
        </main>
      </div>
      <BottomNav page={page} onChange={setPage} />
    </div>
  );
}
