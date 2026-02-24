# Theredthreadapp
```
Theredthreadapp
├─ .emergent
│  └─ emergent.yml
├─ backend
│  ├─ requirements.txt
│  └─ server.py
├─ backend_test.py
├─ frontend
│  ├─ .expo
│  │  ├─ devices.json
│  │  ├─ metro
│  │  │  ├─ externals
│  │  │  │  ├─ assert
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ async_hooks
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ buffer
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ child_process
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ cluster
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ console
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ constants
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ crypto
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ dgram
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ diagnostics_channel
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ dns
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ domain
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ events
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ fs
│  │  │  │  │  ├─ index.js
│  │  │  │  │  └─ promises
│  │  │  │  │     └─ index.js
│  │  │  │  ├─ http
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ http2
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ https
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ inspector
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ module
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ net
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ os
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ path
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ perf_hooks
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ process
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ punycode
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ querystring
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ readline
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ repl
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ stream
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ string_decoder
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ timers
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ tls
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ trace_events
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ tty
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ url
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ util
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ v8
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ vm
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ wasi
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ worker_threads
│  │  │  │  │  └─ index.js
│  │  │  │  └─ zlib
│  │  │  │     └─ index.js
│  │  │  ├─ polyfill.js
│  │  │  └─ polyfill.native.js
│  │  ├─ README.md
│  │  ├─ settings.json
│  │  ├─ types
│  │  │  └─ router.d.ts
│  │  └─ web
│  │     └─ cache
│  │        └─ production
│  │           └─ images
│  │              └─ favicon
│  │                 └─ favicon-38240320cf730bf9164ef0744cf2a428c827c0312c0c42a057ac3a4b7de0aafd-contain-transparent
│  │                    └─ favicon-48.png
│  ├─ app
│  │  ├─ (auth)
│  │  │  ├─ individual-signup.tsx
│  │  │  ├─ login.tsx
│  │  │  ├─ organization-signup.tsx
│  │  │  ├─ pending-approval.tsx
│  │  │  ├─ rejected.tsx
│  │  │  ├─ signup-type.tsx
│  │  │  ├─ verify-email-complete.tsx
│  │  │  ├─ verify-email.tsx
│  │  │  └─ _layout.tsx
│  │  ├─ (tabs)
│  │  │  ├─ create-event.tsx
│  │  │  ├─ edit-event
│  │  │  │  └─ [id].tsx
│  │  │  ├─ event
│  │  │  │  └─ [id].tsx
│  │  │  ├─ index.tsx
│  │  │  ├─ my-events.tsx
│  │  │  ├─ my-rsvps.tsx
│  │  │  ├─ settings.tsx
│  │  │  └─ _layout.tsx
│  │  ├─ +html.tsx
│  │  ├─ admin
│  │  │  ├─ index.tsx
│  │  │  └─ _layout.tsx
│  │  ├─ developer
│  │  │  ├─ index.tsx
│  │  │  └─ _layout.tsx
│  │  ├─ index.tsx
│  │  └─ _layout.tsx
│  ├─ app.json
│  ├─ assets
│  │  ├─ fonts
│  │  │  └─ SpaceMono-Regular.ttf
│  │  └─ images
│  │     ├─ adaptive-icon.png
│  │     ├─ app-image.png
│  │     ├─ favicon.png
│  │     ├─ icon.png
│  │     ├─ partial-react-logo.png
│  │     ├─ react-logo.png
│  │     ├─ react-logo@2x.png
│  │     ├─ react-logo@3x.png
│  │     └─ splash-image.png
│  ├─ eslint.config.js
│  ├─ expo-env.d.ts
│  ├─ metro.config.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ README.md
│  ├─ scripts
│  │  └─ reset-project.js
│  ├─ src
│  │  ├─ api
│  │  │  ├─ admin.ts
│  │  │  ├─ auth.ts
│  │  │  ├─ client.ts
│  │  │  ├─ developer.ts
│  │  │  └─ events.ts
│  │  ├─ components
│  │  │  └─ RoleBadge.tsx
│  │  ├─ config
│  │  │  └─ firebase.ts
│  │  ├─ store
│  │  │  └─ authStore.ts
│  │  └─ utils
│  │     └─ storage.ts
│  └─ tsconfig.json
├─ memory
│  └─ PRD.md
├─ README.md
├─ tests
│  └─ __init__.py
└─ test_reports
   ├─ iteration_1.json
   ├─ iteration_2.json
   ├─ iteration_3.json
   ├─ iteration_4.json
   └─ pytest

```