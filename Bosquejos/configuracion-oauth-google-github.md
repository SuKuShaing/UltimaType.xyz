# Configuracion OAuth 2.0 — Google y GitHub

Guia paso a paso para configurar las credenciales OAuth necesarias para UltimaType.

---

## Google OAuth 2.0

### Paso 1: Crear proyecto en Google Cloud

1. Ir a **https://console.cloud.google.com/**
2. Arriba a la izquierda, al lado de "Google Cloud", hay un selector de proyecto. Click en **"Seleccionar proyecto"**
3. Click en **"Nuevo Proyecto"** (arriba a la derecha del modal)
4. Nombre del proyecto: `UltimaType`
5. Organizacion: dejar vacia o seleccionar la propia
6. Click **"Crear"**
7. Esperar unos segundos y seleccionar el proyecto recien creado

### Paso 2: Configurar pantalla de consentimiento OAuth

Esto es lo que ve el usuario cuando hace login con Google.

1. En el menu lateral izquierdo: **APIs & Services** -> **OAuth consent screen**
   - Si no se encuentra, usar la barra de busqueda de arriba y escribir "OAuth consent screen"
2. Click en **"Get started"** o **"Configurar pantalla de consentimiento"**
3. Completar:
   - **App name:** `UltimaType`
   - **User support email:** tu email
   - **Audience:** seleccionar **External** (cualquier usuario con cuenta Google)
4. Click **"Next"** o **"Guardar y continuar"**
5. **Scopes (alcances):** Si aparece la opcion de agregar scopes, agregarlos ahora (ver detalle abajo). Si no aparece, **saltear este paso** — se configuran despues de crear las credenciales (ver Paso 4)
6. **Test users:**
   - Click **"Add users"**
   - Agregar tu email
   - Agregar cualquier otro email que necesite hacer login durante desarrollo
   - Click **"Save and continue"**
7. **Summary:** revisar y click **"Back to dashboard"**

> **Estado "Testing":** mientras la app este en estado "Testing", SOLO los emails agregados como test users pueden hacer login. Para abrirla al publico (hackathon), cambiar el estado a **"In production"** desde OAuth consent screen -> **"Publish app"**. No requiere verificacion de Google si solo se piden scopes basicos (openid, email, profile).

### Paso 3: Crear credenciales OAuth 2.0

1. En el menu lateral: **APIs & Services** -> **Credentials**
2. Click **"+ Create Credentials"** (arriba) -> **"OAuth client ID"**
3. **Application type:** seleccionar **"Web application"**
4. **Name:** `UltimaType Web Client`
5. **Authorized JavaScript origins:** click **"+ Add URI"**
   - Agregar: `http://localhost:4200` (frontend local)
   - Agregar: `http://localhost:3000` (backend local)
   - Para produccion agregar tambien: `https://tu-dominio.com` (cuando se tenga)
6. **Authorized redirect URIs:** click **"+ Add URI"**
   - Agregar: `http://localhost:3000/api/auth/google/callback` (local)
   - Para produccion agregar tambien: `https://tu-dominio.com/api/auth/google/callback`
7. Click **"Create"**
8. Google muestra un modal con:
   - **Client ID:** algo como `123456789-abc...apps.googleusercontent.com`
   - **Client Secret:** algo como `GOCSPX-...`
   - **Descargarlos o copiarlos ahora** — el Secret no se puede ver de nuevo (si regenerar)

### Paso 4: Configurar scopes (si no aparecio en el Paso 2)

En la version actual de Google Cloud Console, los scopes a veces se configuran despues de crear las credenciales.

1. Ir a **APIs & Services** -> **OAuth consent screen**
2. Buscar la seccion **"Data Access"** o **"Scopes"** en el sidebar
3. Click en **"Add or remove scopes"**
4. Buscar y seleccionar:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. Click **"Update"** -> **"Save"**

> **Nota:** Estos tres scopes son basicos y Google los habilita por defecto. Si no se encuentran en la consola, no hay problema — el codigo de NestJS ya los solicita en la strategy (`scope: ['email', 'profile']`) y Google los concede automaticamente. Solo es necesario agregarlos manualmente para APIs mas sensibles (Calendar, Drive, etc.).

### Paso 5: Configurar `.env`

En el archivo `.env` de `ultimatype-monorepo/`:

```env
# ---- Google OAuth 2.0 ----
GOOGLE_CLIENT_ID="123456789-abc...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"
```

### Paso 6: Verificar

1. Reiniciar la API: `npx nx serve api`
2. Ir a `http://localhost:4200`
3. Click "Iniciar sesion con Google"
4. Deberia redirigir a la pantalla de consentimiento de Google
5. Seleccionar cuenta -> autorizar -> redirige de vuelta a la app con sesion iniciada

---

## GitHub OAuth 2.0

### Paso 1: Crear OAuth App en GitHub

1. Ir a **https://github.com/settings/developers**
2. Click **"OAuth Apps"** en el sidebar izquierdo
3. Click **"New OAuth App"**
4. Completar:
   - **Application name:** `UltimaType`
   - **Homepage URL:** `http://localhost:4200`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/github/callback`
5. Click **"Register application"**

### Paso 2: Obtener credenciales

1. En la pagina de la app recien creada:
   - **Client ID:** visible directamente en la pagina
   - **Client Secret:** click **"Generate a new client secret"** -> copiarlo inmediatamente (no se puede ver de nuevo)

### Paso 3: Configurar `.env`

```env
# ---- GitHub OAuth 2.0 ----
GITHUB_CLIENT_ID="Iv1.abc123..."
GITHUB_CLIENT_SECRET="abc123..."
GITHUB_CALLBACK_URL="http://localhost:3000/api/auth/github/callback"
```

### Paso 4: Verificar

1. Reiniciar la API: `npx nx serve api`
2. Ir a `http://localhost:4200`
3. Click "Iniciar sesion con GitHub"
4. Autorizar la app -> redirige de vuelta con sesion iniciada

---

## Local vs Produccion

| Proveedor | Mismo cliente para local y prod? | Que cambiar para prod |
|-----------|----------------------------------|----------------------|
| **Google** | **Si** — agregar los redirect URIs de produccion al mismo cliente | Agregar `https://tu-dominio.com/api/auth/google/callback` a Authorized redirect URIs + `https://tu-dominio.com` a Authorized JS origins |
| **GitHub** | **No recomendado** — GitHub permite un solo callback URL por OAuth App | Crear segunda OAuth App con callback de produccion |

### Variables `.env` en produccion (Dokploy)

```env
GOOGLE_CALLBACK_URL="https://tu-dominio.com/api/auth/google/callback"
GITHUB_CALLBACK_URL="https://tu-dominio.com/api/auth/github/callback"
FRONTEND_URL="https://tu-dominio.com"
NODE_ENV="production"
```

> **Recordatorio:** `NODE_ENV=production` debe estar seteado en produccion. El seed script esta bloqueado en ese ambiente para prevenir borrado accidental de datos.
