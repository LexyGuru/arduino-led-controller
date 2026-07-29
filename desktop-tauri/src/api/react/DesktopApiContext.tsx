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

type ConnectivityState =
  ReturnType<
    DesktopApi[
      'connectivity'
    ][
      'snapshot'
    ]
  >;

type AuthState =
  ReturnType<
    DesktopApi[
      'auth'
    ][
      'snapshot'
    ]
  >;

type RealtimeState =
  ReturnType<
    DesktopApi[
      'eventStream'
    ][
      'snapshot'
    ]
  >;

type DesktopApiContextValue = {
  api: DesktopApi;
  connectivity:
    ConnectivityState;
  auth:
    AuthState;
  realtime:
    RealtimeState;
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
      ConnectivityState
    >(
      api.connectivity
        .snapshot()
    );

  const [
    auth,
    setAuth
  ] =
    useState<
      AuthState
    >(
      api.auth.snapshot()
    );

  const [
    realtime,
    setRealtime
  ] =
    useState<
      RealtimeState
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

      void api
        .initializeCredentials()
        .catch(() => null)
        .then(
          () =>
            api.runtime.start()
        )
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
