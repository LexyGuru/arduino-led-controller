# V556 Git Commit Boundary Secret Audit + .gitignore Hardening

This round hardens local secret exclusion and distinguishes between:

- LOCAL_IGNORED_SECRET_PRESENT: allowed/expected local-only secret files
- TRACKED_GIT_SECRET_LEAK: forbidden
- COMMIT_CANDIDATE_SECRET_LEAK: forbidden
- PRIVATE_KEY_COMMIT_CANDIDATE_HITS: must be zero
- PASSWORD_COMMIT_CANDIDATE_HITS: must be zero

The Tauri updater public key remains committed as configuration content.
The updater private key and password must never be committed.

No commit, push, publish, reset or clean is performed.
