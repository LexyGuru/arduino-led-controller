# Release-gate runtime wiring hotfix

A `createRuntimePaths()` a repository gyökérútvonalát `projectRoot` néven
adja vissza. A `server2_final.js` korábban tévesen a nem létező
`paths.root` mezőt adta át a `ReleaseGateService` konstruktorának.

Javítás:

```text
paths.root -> paths.projectRoot
```

A regressziós teszt ellenőrzi:

- a kötelező release-gate runtime útvonalakat;
- a `ReleaseGateService` létrehozhatóságát;
- a `server2_final.js` tényleges bekötését;
- a hibás `paths.root` hivatkozás hiányát.
