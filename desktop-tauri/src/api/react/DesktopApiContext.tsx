import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

import {
  createDesktopApi,
  type CreateDesktopApiOptions,
  type DesktopApi
} from '../create-desktop-api';

type DesktopApiContextValue = {
  api: DesktopApi;
  connectivity:
    Record<string, unknown>;
  auth:
    Record<string, unknown>;
  realtime:
    Record<string, unknown>;
};

const DesktopApiContext =
  createContext<
    DesktopApiContextValue |
    null
  >(null);

export function DesktopApiProvider({
  children,
  options = {}
}: {
  children: ReactNode;
  options?:
    CreateDesktopApiOptions;
}) {
  const api =
    useMemo(
      () =>
        createDesktopApi(
          options
        ),
      []
    );

  const [
    connectivity,
    setConnectivity
  ] =
    useState<
      Record<string, unknown>
    >(
      api.connectivity
        .snapshot()
    );

  const [
    auth,
    setAuth
  ] =
    useState<
      Record<string, unknown>
    >(
      api.auth.snapshot()
    );

  const [
    realtime,
    setRealtime
  ] =
    useState<
      Record<string, unknown>
    >(
      api.eventStream
        .snapshot()
    );

  useEffect(
    () => {
      const unsubscribeConnectivity =
        api.connectivity
          .subscribe(
            setConnectivity
          );

      const unsubscribeAuth =
        api.auth.subscribe(
          setAuth
        );

      const realtimeTimer =
        globalThis.setInterval(
          () =>
            setRealtime(
              api.eventStream
                .snapshot()
            ),
          1000
        );

      void api.runtime
        .start()
        .catch(() => {
          setConnectivity(
            api.connectivity
              .snapshot()
          );
        });

      return () => {
        unsubscribeConnectivity();
        unsubscribeAuth();
        globalThis.clearInterval(
          realtimeTimer
        );
        void api.runtime.dispose();
      };
    },
    [api]
  );

  return (
    <DesktopApiContext.Provider
      value={{
        api,
        connectivity,
        auth,
        realtime
      }}
    >
      {children}
    </DesktopApiContext.Provider>
  );
}

export function useDesktopApi() {
  const value =
    useContext(
      DesktopApiContext
    );

  if (!value) {
    throw new Error(
      'A useDesktopApi csak DesktopApiProvider alatt használható.'
    );
  }

  return value;
}
