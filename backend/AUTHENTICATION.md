# Sistema de Autenticación de Usuarios

Este documento explica el nuevo sistema de autenticación implementado en IPTV-Restream.

## Características

### Sistema de Usuarios
- **Login obligatorio**: Todos los usuarios deben autenticarse para acceder a la aplicación
- **Roles de usuario**:
  - **Admin**: Puede gestionar usuarios, crear/editar/eliminar canales
  - **User**: Puede ver y usar los canales, participar en el chat

### Seguridad
- Contraseñas hasheadas con SHA-256
- Autenticación JWT con tokens que expiran
- Protección de todas las rutas (API y WebSocket)

## Configuración Inicial

### Variables de Entorno

Añade estas variables a tu archivo `.env`:

```env
# JWT Secret (genera uno seguro con: openssl rand -hex 64)
JWT_SECRET=your_secure_random_secret_here

# JWT Token expiration (default: 24h)
JWT_EXPIRY=24h

# Default admin credentials (usado solo si no existen usuarios)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=changeThisPassword123
```

### Primer Usuario Administrador

Si no existe ningún usuario en el sistema, se creará automáticamente un usuario administrador con las credenciales especificadas en `DEFAULT_ADMIN_USERNAME` y `DEFAULT_ADMIN_PASSWORD`.

**⚠️ IMPORTANTE**: Cambia la contraseña del administrador predeterminado después del primer inicio de sesión.

## Uso

### Inicio de Sesión

1. Al acceder a la aplicación, se mostrará la pantalla de login
2. Ingresa tu nombre de usuario y contraseña
3. Una vez autenticado, tendrás acceso a la aplicación

### Gestión de Usuarios (Solo Administradores)

Los administradores pueden gestionar usuarios desde el panel de gestión:

1. Haz clic en el icono de usuarios (👥) en la barra superior
2. Desde aquí puedes:
   - **Crear nuevos usuarios**: Click en "Create User"
   - **Editar usuarios**: Click en el icono de edición
   - **Eliminar usuarios**: Click en el icono de eliminar
   - **Cambiar roles**: Asignar rol de admin o user

### Permisos por Rol

#### Administrador
- ✅ Gestionar usuarios (crear, editar, eliminar)
- ✅ Agregar, editar y eliminar canales
- ✅ Ver y seleccionar canales
- ✅ Usar el chat
- ✅ Acceso a todas las configuraciones

#### Usuario Regular
- ❌ NO puede gestionar usuarios
- ❌ NO puede crear, editar o eliminar canales
- ✅ Ver y seleccionar canales (si `CHANNEL_SELECTION_REQUIRES_ADMIN` es `false`)
- ✅ Usar el chat
- ✅ Acceso limitado a configuraciones

## Variables de Configuración Adicionales

```env
# Si es true, solo admins pueden cambiar de canal (default: false)
CHANNEL_SELECTION_REQUIRES_ADMIN=false
```

## API Endpoints

### Autenticación

- `POST /api/auth/login` - Login de usuario
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```

- `GET /api/auth/status` - Estado de autenticación

### Gestión de Usuarios (Admin solamente)

- `GET /api/users` - Listar todos los usuarios
- `GET /api/users/me` - Obtener información del usuario actual
- `GET /api/users/:id` - Obtener usuario por ID
- `POST /api/users` - Crear nuevo usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

## Estructura de Archivos

```
backend/
  models/
    User.js                    # Modelo de usuario
  services/
    UserService.js             # Servicio de gestión de usuarios
    auth/
      AuthService.js           # Servicio de autenticación
  controllers/
    UserController.js          # Controlador de usuarios
    AuthController.js          # Controlador de autenticación
  data/
    users.json                 # Almacenamiento de usuarios (creado automáticamente)

frontend/
  src/
    components/
      auth/
        LoginModal.tsx         # Componente de login
      admin/
        UserManagement.tsx     # Panel de gestión de usuarios
```

## Migración desde Versión Anterior

Si estabas usando el sistema anterior con `ADMIN_ENABLED`:

1. El sistema antiguo ya no está disponible
2. Se requiere autenticación para todos los usuarios
3. Los administradores ahora son usuarios con rol "admin"
4. Las variables `ADMIN_ENABLED` y `ADMIN_PASSWORD` ya no se usan
5. Usa `DEFAULT_ADMIN_USERNAME` y `DEFAULT_ADMIN_PASSWORD` para el primer admin

## Solución de Problemas

### No puedo acceder (olvidé la contraseña)

Si eres el único administrador y olvidaste tu contraseña:

1. Detén el servidor
2. Elimina el archivo `backend/data/users.json`
3. Reinicia el servidor (se creará un nuevo admin con las credenciales por defecto)
4. Inicia sesión y crea usuarios nuevamente

### Error: "Authentication required"

- Verifica que el token JWT no haya expirado (cierra sesión y vuelve a iniciar)
- Asegúrate de que `JWT_SECRET` esté configurado en el `.env`

### Los WebSockets no conectan

- Verifica que estés autenticado correctamente
- El token se pasa automáticamente a las conexiones WebSocket
- Revisa la consola del navegador para errores

## Seguridad

### Mejores Prácticas

1. **JWT_SECRET**: Usa una cadena aleatoria segura (al menos 64 caracteres)
2. **Contraseñas**: Usa contraseñas fuertes (mínimo 12 caracteres)
3. **HTTPS**: En producción, usa siempre HTTPS
4. **Token Expiry**: Ajusta `JWT_EXPIRY` según tus necesidades de seguridad
5. **Backups**: Haz respaldo del archivo `users.json` regularmente

### Generación de JWT_SECRET Seguro

```bash
# Linux/Mac
openssl rand -hex 64

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
