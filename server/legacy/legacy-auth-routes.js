'use strict';

const {
  getRuntimeContext
} = require(
  '../core/runtime-context'
);

const {
  publicLegacyUser
} = require(
  './legacy-auth-middleware'
);

function installLegacyAuthRoutes(
  app
) {
  app.get(
    '/api/auth/status',
    async (req, res) => {
      const runtime =
        getRuntimeContext();

      const status =
        await runtime
          .sessionService
          .status(req);

      return res.json({
        authenticated:
          status.authenticated,
        user:
          publicLegacyUser(
            status.user
          ),
        setupNeeded:
          status.setupNeeded,
        cookieSecure:
          status.cookieSecure
      });
    }
  );

  app.post(
    '/api/auth/login',
    async (req, res) => {
      const runtime =
        getRuntimeContext();

      try {
        const login =
          await runtime
            .sessionService
            .login(
              res,
              req.body?.username,
              req.body?.password
            );

        req.user =
          publicLegacyUser(
            login.user
          );

        await runtime
          .auditLog
          ?.record?.({
            action:
              'Sikeres bejelentkezés',
            principal:
              login.principal,
            request:
              req
          });

        return res.json({
          success: true,
          user:
            req.user
        });
      } catch (error) {
        await runtime
          .auditLog
          ?.record?.({
            action:
              'Sikertelen bejelentkezés',
            request:
              req,
            details: {
              username:
                String(
                  req.body
                    ?.username ||
                  ''
                )
                  .trim()
                  .toLowerCase()
            }
          });

        return res
          .status(
            error.statusCode ||
            401
          )
          .json({
            error:
              error.message ||
              'Hibás felhasználónév vagy jelszó.'
          });
      }
    }
  );

  app.post(
    '/api/auth/logout',
    async (req, res) => {
      const runtime =
        getRuntimeContext();

      const user =
        await runtime
          .sessionService
          .sessionUser(req);

      runtime
        .sessionService
        .logout(
          res,
          user
        );

      if (user) {
        await runtime
          .auditLog
          ?.record?.({
            action:
              'Kijelentkezés',
            principal: {
              subject:
                user.username,
              type:
                'user-session',
              role:
                user.role
            },
            request:
              req
          });
      }

      return res.json({
        success: true
      });
    }
  );
}

module.exports = {
  installLegacyAuthRoutes
};
