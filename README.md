# UltimaType

**Plataforma de competencia de escritura en tiempo real.** Únete a una sala, compite contra otros jugadores escribiendo textos con mayor velocidad y precisión, y sube en el ranking en vivo.

🌐 **[ultimatype.xyz](https://ultimatype.xyz)**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-black?style=flat-square)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)

---

## Características

- **Carreras multijugador en tiempo real** — hasta 20 jugadores por sala con sincronización de cursores en vivo (~25 eventos/seg)
- **5 niveles de dificultad** — desde solo minúsculas hasta texto con símbolos especiales
- **Modo espectador** — hasta 100 espectadores con leaderboard en vivo
- **Anti-cheat integrado** — validación atómica de posición vía Lua scripts en Redis (solo avances de ±1)
- **Reconexión automática** — ventana de gracia de 30 segundos para reincorporarse sin perder el partido
- **Autenticación OAuth** — login con Google y GitHub
- **Escalabilidad horizontal** — Redis adapter para Socket.IO, estado de partidas sin stickiness

---

## Stack Técnico

| Capa           | Tecnología                                             |
| -------------- | ------------------------------------------------------ |
| Frontend       | React 19, Vite, TailwindCSS 4, Zustand, TanStack Query |
| Backend        | NestJS 11, Passport.js, JWT (access + refresh)         |
| Tiempo real    | Socket.IO 4.8 con Redis adapter                        |
| Estado efímero | Redis (rooms, match state, carets) con Lua scripts     |
| Persistencia   | PostgreSQL + Prisma 7                                  |
| Monorepo       | Nx 22, npm workspaces                                  |

---

## Arquitectura

```
Browser (React 19)
    │
    ├── HTTP/REST ──────────────► NestJS API
    │   (auth, textos, perfil)        │
    │                                 ├── PostgreSQL (usuarios, textos)
    └── WebSocket (Socket.IO) ──────► NestJS Gateway
        (carets, match events)        │
                                      └── Redis
                                          ├── Estado de salas (TTL 24h)
                                          ├── Estado de partidas
                                          ├── Lua scripts (operaciones atómicas)
                                          └── Socket.IO adapter (escala horizontal)
```

**Decisiones clave:**

- **Redis para estado efímero:** Las salas y partidas viven en Redis con TTL de 24 horas. Los Lua scripts garantizan operaciones atómicas y previenen race conditions en uniones concurrentes y actualizaciones de posición.
- **PostgreSQL para persistencia:** Solo usuarios y textos de typing — todo lo que necesita sobrevivir un reinicio del servidor.
- **Stateless backend:** El estado de sesión vive completamente en Redis/DB, lo que permite escalar horizontalmente sin sticky sessions.

---

## Flujo del juego

```
Inicio de sesión (OAuth)
    ↓
Crear sala / Unirse con código de 6 caracteres
    ↓
Lobby — configurar dificultad y tiempo límite, marcar ready
    ↓
Partida en vivo — escribir texto, ver cursores de rivales en tiempo real
    ↓
Resultados — WPM, precisión, ranking final
    ↓
Revancha o salir
```

---

## Estructura del monorepo

```
ultimatype-monorepo/
├── apps/
│   ├── web/          # React 19 frontend
│   └── api/          # NestJS backend
└── libs/
    └── shared/       # DTOs, tipos y constantes compartidos
```

---

## Contribuir

1. Haz fork del repositorio
2. Crea una rama para tu feature: `git checkout -b feature/mi-feature`
3. Asegúrate de que todos los tests pasen: `npx nx test web && npx nx test api`
4. Abre un Pull Request describiendo el cambio
