# Tauri célarchitektúra

```text
Tauri React UI
  -> Direct Arduino profile
  -> native credential store: X-Device-Key
  -> Rust HTTP transport
  -> Arduino UNO R4 WiFi Direct API 1.0.0
```

A helyi LAN-cím az elsődleges. Sikertelenség esetén a távoli DDNS-cím következik. A Direct Mode nem használ felhasználónevet, jelszót, session-cookie-t vagy Bearer tokent.

Az LXC és API v2 réteg opcionális, elkülönített üzemmód lesz, és nem része a napi közvetlen vezérlésnek.
