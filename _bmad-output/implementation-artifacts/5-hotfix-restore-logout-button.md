# Hotfix: Restaurar botón "Cerrar Sesión"

Status: done
Date: 2026-04-07

## Contexto

Durante el refactor de Epic 5 (story 5-3, commit `fc2f482` — homepage-layout-extraction), el botón "Cerrar sesión" que vivía inline en `app.tsx` dentro del route `*` no fue migrado a ninguna de las nuevas secciones extraídas (`GameActionsSection`, `LiveMatchesSection`, `LeaderboardPreviewSection`, `PlayerProfileSection`). No fue un borrado intencional — fue una víctima del refactor.

**Código original** (en `app.tsx`, dentro del home inline):
```tsx
{isAuthenticated && (
  <button id="logout" onClick={logout} aria-label="Cerrar sesión">
    Cerrar sesión
  </button>
)}
```

## Decisión de diseño

Se evaluaron 3 opciones en Party Mode con Winston (Architect), Freya (UX Designer) y Amelia (Developer):

| Opción | Ubicación | Veredicto |
|--------|-----------|-----------|
| **A** | NavBar — dropdown al hacer click en el avatar | **Elegida** |
| B | PlayerProfileSection — dentro de la card "Tu Perfil" | Solo visible en home |
| C | Ambos breakpoints (hamburguesa + avatar dropdown) | Más trabajo |

**Decisión final del usuario**: Opción A — avatar dropdown en NavBar con dos items: "Perfil" y "Cerrar sesión", separados por un divider visual. Sin modal de confirmación (cerrar sesión no es destructivo).

## Cambios implementados

### Archivos modificados

1. **`apps/web/src/components/ui/nav-bar.tsx`**
2. **`apps/web/src/components/ui/nav-bar.spec.tsx`**

### Detalle de cambios en `nav-bar.tsx`

- **Avatar**: cambia de `<Link to={/u/${slug}}>` a un `<button>` que abre un dropdown
  - Agrega `aria-haspopup`, `aria-expanded`, `aria-label` dinámico
  - Agrega `flex items-center leading-none` para alineación vertical correcta
- **Dropdown menu** (`role="menu"`):
  - "Perfil" → `<Link to={/u/${slug}}>` con icono Material Symbols `person`
  - Divider (`border-t border-surface-raised`)
  - "Cerrar sesión" → `<button onClick={logout}>` con texto en `text-error` e icono `logout`
  - Container: `bg-surface-sunken rounded-card shadow-lg overflow-hidden`
- **Cierre del dropdown**: Escape key, click outside, segundo click en avatar, cambio de ruta
- **Menú hamburguesa mobile**: agrega "Perfil" y "Cerrar sesión" (con divider) cuando está autenticado
  - Padding mejorado (`pt-2 pb-4 gap-3`) y `py-1` en tabs para mejor espaciado

### Nuevos estados y refs

```tsx
const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
const avatarMenuRef = useRef<HTMLDivElement>(null);
const avatarButtonRef = useRef<HTMLButtonElement>(null);
```

### Detalle de cambios en `nav-bar.spec.tsx`

7 tests nuevos:
- Click en avatar abre dropdown con "Perfil" y "Cerrar sesión"
- "Perfil" navega a `/u/{slug}`
- "Cerrar sesión" llama a `logout()`
- Dropdown se cierra con Escape
- Dropdown se cierra con segundo click en avatar
- Menú mobile muestra "Perfil" y "Cerrar sesión" cuando autenticado
- Menú mobile NO muestra esas opciones sin autenticación
- Logout desde menú mobile llama a `logout()`

**Total: 27 tests pasando** (20 existentes + 7 nuevos, 1 test anterior de avatar actualizado)

## Estética

Se mantiene la estética Epic 5:
- `bg-surface-sunken`, `rounded-card`, `shadow-lg` para el dropdown
- `text-text-main` para "Perfil", `text-error` para "Cerrar sesión"
- `hover:bg-surface-container` en ambos items
- `border-t border-surface-raised` como separador
- Material Symbols (`person`, `logout`) consistente con el resto de la UI

## Fixes visuales adicionales

- **Hover desbordante**: agregado `overflow-hidden` al dropdown para que el hover respete `rounded-card`
- **Avatar desalineado**: agregado `flex items-center leading-none` al botón del avatar
- **Menú mobile apretado**: aumentado spacing (`gap-3`, `pt-2`, `pb-4`, `py-1` en tabs)
