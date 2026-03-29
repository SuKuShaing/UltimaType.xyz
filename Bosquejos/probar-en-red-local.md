# Probar UltimaType desde otro PC en red local

## Tu IP local

Ejecutar en terminal:
```bash
ipconfig
```
Buscar la IPv4 de tu adaptador Wi-Fi o Ethernet. Ejemplo: `192.168.1.119`

---

## Paso 1: Vite — escuchar en todas las interfaces

En `apps/web/vite.config.mts`, cambiar la linea 11:

```ts
// ANTES
host: 'localhost',

// DESPUÉS (temporalmente)
host: '0.0.0.0',
```

---

## Paso 2: FRONTEND_URL en .env

En `ultimatype-monorepo/.env`, cambiar:

```env
# ANTES
FRONTEND_URL="http://localhost:4200"

# DESPUÉS (temporalmente)
FRONTEND_URL="http://192.168.1.119:4200"
```

Reemplazar `192.168.1.119` por tu IP real.

---

## Paso 3: Reiniciar ambos servicios

```bash
npx nx serve api
npx nx serve web
```

---

## Paso 4: Desde el otro PC

Abrir navegador y ir a:
```
http://192.168.1.119:4200
```

---

## Paso 5: Firewall de Windows (si no carga)

Abrir PowerShell como administrador y ejecutar:

```powershell
netsh advfirewall firewall add rule name="UltimaType Dev" dir=in action=allow protocol=TCP localport=3000,4200
```

Para eliminar la regla despues:
```powershell
netsh advfirewall firewall delete rule name="UltimaType Dev"
```

---

## OAuth desde el otro PC

Google y GitHub OAuth tienen redirect URIs configuradas con `localhost`. Desde el otro PC, el callback seria `192.168.1.119` que no esta autorizado. Opciones:

**Opcion A: Copiar tokens manualmente**
1. Loguearte en este PC (localhost) con Google/GitHub
2. Abrir DevTools > Application > Local Storage > `http://localhost:4200`
3. Copiar los valores de `accessToken` y `refreshToken`
4. En el otro PC, abrir DevTools > Console y ejecutar:
```js
localStorage.setItem('accessToken', 'PEGAR_ACCESS_TOKEN_AQUI');
localStorage.setItem('refreshToken', 'PEGAR_REFRESH_TOKEN_AQUI');
```
5. Refrescar la pagina

**Opcion B: NO funciona con IPs privadas**
Google Cloud Console rechaza IPs de red local (192.168.x.x) como redirect URIs. Solo acepta `localhost` como excepcion especial. Para usar OAuth desde otro PC en red local, usar la Opcion A.

---

## Revertir cambios al terminar

1. `vite.config.mts`: volver `host` a `'localhost'`
2. `.env`: volver `FRONTEND_URL` a `"http://localhost:4200"`
3. Eliminar regla de firewall si la creaste
4. Reiniciar servicios
