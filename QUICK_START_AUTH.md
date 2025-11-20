# 🔐 Inicio Rápido - Sistema de Autenticación

## ⚡ Configuración Rápida

### 1. Configurar Variables de Entorno

```bash
# En el directorio backend/
cp .env.development .env

# O crear tu propio .env con:
# - JWT_SECRET (genera uno con: openssl rand -hex 64)
# - DEFAULT_ADMIN_USERNAME
# - DEFAULT_ADMIN_PASSWORD (mínimo 12 caracteres)
```

### 2. Iniciar el Backend

```bash
cd backend
npm install
npm start
```

El sistema creará automáticamente un usuario administrador con las credenciales configuradas en `.env`.

### 3. Iniciar el Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Primer Login

1. Abre la aplicación en tu navegador
2. Verás la pantalla de login
3. Ingresa las credenciales del admin:
   - Username: `admin` (o el que configuraste)
   - Password: `admin123456789` (o el que configuraste)

**⚠️ IMPORTANTE**: Cambia la contraseña del admin inmediatamente después del primer login.

## 👥 Gestión de Usuarios

### Como Administrador

1. Después de iniciar sesión como admin, haz clic en el ícono de usuarios (👥) en la barra superior
2. Desde el panel de gestión puedes:
   - **Crear usuarios**: Click en "Create User"
   - **Editar usuarios**: Click en el ícono de edición ✏️
   - **Eliminar usuarios**: Click en el ícono de eliminar 🗑️
   - **Asignar roles**: Admin o User

### Roles de Usuario

#### 👑 Admin
- ✅ Gestionar usuarios
- ✅ Crear, editar y eliminar canales
- ✅ Ver y seleccionar canales
- ✅ Chat
- ✅ Todas las configuraciones

#### 👤 User
- ✅ Ver y seleccionar canales
- ✅ Chat
- ❌ NO puede gestionar usuarios
- ❌ NO puede crear/editar/eliminar canales

## 🔒 Seguridad

### Contraseñas
- Mínimo 6 caracteres para usuarios
- Mínimo 12 caracteres para el admin inicial
- Todas las contraseñas se guardan hasheadas (SHA-256)

### JWT Tokens
- Los tokens expiran en 24 horas por defecto
- Configurar `JWT_EXPIRY` en `.env` para cambiar
- Ejemplos: `1h`, `7d`, `30d`

### HTTPS en Producción
**⚠️ OBLIGATORIO**: En producción, usa siempre HTTPS para proteger las credenciales.

## 🧪 Probar el Sistema

```bash
# Ejecuta el script de test
./test-auth.sh
```

Este script verifica:
- ✅ Estado de autenticación
- ✅ Login con credenciales
- ✅ Acceso a endpoints protegidos
- ✅ Protección contra acceso no autorizado

## 🆘 Solución de Problemas

### "Invalid or expired token"
- Tu token expiró
- Cierra sesión y vuelve a iniciar

### "Access denied. No token provided"
- La aplicación no guardó el token
- Limpia localStorage y vuelve a iniciar sesión

### Olvidé la contraseña del admin
```bash
# Detén el servidor
# Elimina el archivo de usuarios
rm backend/data/users.json

# Reinicia el servidor
# Se creará un nuevo admin con las credenciales del .env
```

### No puedo crear usuarios
- Solo los administradores pueden crear usuarios
- Verifica que iniciaste sesión como admin
- Verifica que tu token no haya expirado

## 📚 Documentación Completa

Ver `backend/AUTHENTICATION.md` para documentación detallada sobre:
- Arquitectura del sistema
- API endpoints
- Configuración avanzada
- Mejores prácticas de seguridad

## 🚀 Próximos Pasos

1. **Cambiar contraseña del admin**: Ve a gestión de usuarios → Editar admin → Nueva contraseña
2. **Crear usuarios**: Crea usuarios para cada persona que usará la aplicación
3. **Configurar JWT_SECRET**: Genera uno único y seguro para producción
4. **Backup**: Haz respaldo regular de `backend/data/users.json`

## 📝 Notas

- El archivo `backend/data/users.json` se crea automáticamente
- Los usuarios se almacenan en formato JSON
- No se pueden eliminar a sí mismos (prevención de lock-out)
- Los tokens se almacenan en localStorage del navegador

---

**Desarrollado con ❤️ para IPTV-Restream**
