'use strict';

const crypto = require('crypto');

const {
  createPrincipal,
  normalizeRole
} = require('./roles');

const {
  SecurityServiceError
} = require('./security-error');

const SESSION_COOKIE_NAME =
  'led_session';

function readCookie(
  req,
  name
) {
  const item =
    String(
      req.headers?.cookie || ''
    )
      .split(';')
      .map(
        (part) => part.trim()
      )
      .find(
        (part) =>
          part.startsWith(
            `${name}=`
          )
      );

  return item
    ? decodeURIComponent(
        item.slice(
          name.length + 1
        )
      )
    : null;
}

function safeTextEquals(
  left,
  right
) {
  const leftBuffer =
    Buffer.from(
      String(left || ''),
      'utf8'
    );

  const rightBuffer =
    Buffer.from(
      String(right || ''),
      'utf8'
    );

  if (
    leftBuffer.length === 0 ||
    leftBuffer.length !==
      rightBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}

class SessionService {
  constructor({
    userRepository,
    cookieSecure = false,
    sessionDurationMs =
      12 * 60 * 60 * 1000,
    cookieName =
      SESSION_COOKIE_NAME,
    eventBus = null
  } = {}) {
    if (!userRepository) {
      throw new TypeError(
        'A session szolgáltatáshoz UserRepository szükséges.'
      );
    }

    this.userRepository =
      userRepository;
    this.cookieSecure =
      cookieSecure === true;
    this.sessionDurationMs =
      Number(sessionDurationMs);
    this.cookieName =
      String(cookieName);
    this.eventBus = eventBus;
  }

  signSession(
    payload,
    sessionSecret
  ) {
    if (!sessionSecret) {
      throw SecurityServiceError
        .setupRequired();
    }

    const encoded =
      Buffer.from(
        JSON.stringify(payload)
      ).toString('base64url');

    const signature =
      crypto
        .createHmac(
          'sha256',
          sessionSecret
        )
        .update(encoded)
        .digest('base64url');

    return `${encoded}.${signature}`;
  }

  async sessionUser(req) {
    try {
      const token =
        readCookie(
          req,
          this.cookieName
        );

      if (!token) {
        return null;
      }

      const [
        encoded,
        signature
      ] = token.split('.');

      if (
        !encoded ||
        !signature
      ) {
        return null;
      }

      const data =
        await this.userRepository
          .readData();

      if (!data.sessionSecret) {
        return null;
      }

      const expected =
        crypto
          .createHmac(
            'sha256',
            data.sessionSecret
          )
          .update(encoded)
          .digest('base64url');

      if (
        !safeTextEquals(
          signature,
          expected
        )
      ) {
        return null;
      }

      const payload =
        JSON.parse(
          Buffer.from(
            encoded,
            'base64url'
          ).toString('utf8')
        );

      if (
        !payload ||
        Number(payload.exp) <
          Date.now()
      ) {
        return null;
      }

      const user =
        data.users.find(
          (candidate) =>
            candidate.username ===
              payload.username &&
            candidate.sessionVersion ===
              payload.sessionVersion &&
            candidate.enabled !== false
        );

      if (!user) {
        return null;
      }

      return {
        username:
          user.username,
        displayName:
          user.displayName ||
          user.username,
        role:
          normalizeRole(
            user.role,
            'viewer'
          )
      };
    } catch (_) {
      return null;
    }
  }

  async principalForRequest(req) {
    const user =
      await this.sessionUser(req);

    if (!user) {
      return null;
    }

    return createPrincipal({
      subject:
        user.username,
      role:
        user.role,
      type:
        'user-session'
    });
  }

  async login(
    res,
    username,
    password
  ) {
    const {
      data,
      user
    } = await this.userRepository
      .verifyCredentials(
        username,
        password
      );

    if (!data.sessionSecret) {
      throw SecurityServiceError
        .setupRequired();
    }

    const token =
      this.signSession(
        {
          username:
            user.username,
          sessionVersion:
            user.sessionVersion,
          exp:
            Date.now() +
            this.sessionDurationMs
        },
        data.sessionSecret
      );

    res.cookie(
      this.cookieName,
      token,
      {
        httpOnly: true,
        sameSite: 'strict',
        secure:
          this.cookieSecure,
        maxAge:
          this.sessionDurationMs,
        path: '/'
      }
    );

    this.eventBus?.publish?.(
      'auth.login',
      {
        username:
          user.username,
        role:
          normalizeRole(
            user.role,
            'viewer'
          )
      }
    );

    return {
      user: {
        username:
          user.username,
        displayName:
          user.displayName ||
          user.username,
        role:
          normalizeRole(
            user.role,
            'viewer'
          )
      },
      principal:
        createPrincipal({
          subject:
            user.username,
          role:
            user.role,
          type:
            'user-session'
        })
    };
  }

  logout(res, user = null) {
    res.clearCookie(
      this.cookieName,
      {
        httpOnly: true,
        sameSite: 'strict',
        secure:
          this.cookieSecure,
        path: '/'
      }
    );

    this.eventBus?.publish?.(
      'auth.logout',
      {
        username:
          user?.username || null
      }
    );
  }

  async status(req) {
    const user =
      await this.sessionUser(req);

    return {
      authenticated:
        Boolean(user),
      user,
      setupNeeded:
        await this.userRepository
          .setupNeeded(),
      cookieSecure:
        this.cookieSecure
    };
  }
}

module.exports = {
  SESSION_COOKIE_NAME,
  SessionService,
  readCookie,
  safeTextEquals
};
