'use strict';

const PUBLIC_AUTH_PATHS =
  Object.freeze(
    new Set([
      '/auth/status',
      '/auth/login',
      '/auth/logout',
      '/auth/setup'
    ])
  );

function publicLegacyUser(
  user
) {
  if (!user) {
    return null;
  }

  return {
    username:
      user.username,
    role:
      user.role,
    displayName:
      user.displayName ||
      user.username
  };
}

function createLegacyApiUserMiddleware({
  sessionService
} = {}) {
  if (
    !sessionService ||
    typeof sessionService
      .sessionUser !==
      'function'
  ) {
    throw new TypeError(
      'A legacy API middleware számára SessionService szükséges.'
    );
  }

  return async function legacyApiUser(
    req,
    res,
    next
  ) {
    if (
      PUBLIC_AUTH_PATHS.has(
        req.path
      )
    ) {
      return next();
    }

    const user =
      await sessionService
        .sessionUser(req);

    if (!user) {
      return res
        .status(401)
        .json({
          error:
            'Bejelentkezés szükséges.'
        });
    }

    req.user =
      publicLegacyUser(
        user
      );

    return next();
  };
}

function createLegacyAdminMiddleware({
  sessionService
} = {}) {
  return async function legacyAdmin(
    req,
    res,
    next
  ) {
    const user =
      await sessionService
        .sessionUser(req);

    if (!user) {
      return res
        .status(401)
        .json({
          error:
            'Bejelentkezés szükséges.'
        });
    }

    if (
      user.role !== 'admin'
    ) {
      return res
        .status(403)
        .json({
          error:
            'Adminisztrátori jogosultság szükséges.'
        });
    }

    req.user =
      publicLegacyUser(
        user
      );

    return next();
  };
}

module.exports = {
  PUBLIC_AUTH_PATHS,
  createLegacyAdminMiddleware,
  createLegacyApiUserMiddleware,
  publicLegacyUser
};
