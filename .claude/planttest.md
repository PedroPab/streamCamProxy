Plan: Tests con node:test para streamCam
Resumen
Crear tests unitarios modulares usando solo node:test (sin frameworks externos) para los módulos críticos del backend (API) y frontend.

Estructura de Archivos a Crear

tests/
├── setup.js                          # Helpers globales (mocks de req/res)
├── helpers/
│   ├── mockDatabase.js               # SQLite en memoria para tests
│   └── fixtures.js                   # Datos de prueba reutilizables
├── unit/
│   ├── auth/
│   │   ├── jwt.test.js               # Tests de JWT (crítico)
│   │   └── authorize.test.js         # Tests del middleware authorize
│   ├── controller/
│   │   └── frameParser.test.js       # Tests de MJPEGFrameParser (crítico)
│   └── validators/
│       └── auth.validators.test.js   # Validaciones de email/password
└── frontend/
    ├── authManager.test.js           # Tests de lógica pura del AuthManager
    └── urlRouter.test.js             # Tests de parsing de URLs
Archivos a Modificar

1. package.json - Agregar scripts de test

"scripts": {
  "test": "node --test tests/**/*.test.js",
  "test:unit": "node --test tests/unit/**/*.test.js",
  "test:frontend": "node --test tests/frontend/**/*.test.js",
  "test:watch": "node --test --watch tests/**/*.test.js"
}
Detalle de Tests a Implementar
Backend
tests/unit/auth/jwt.test.js
Archivo fuente: src/auth/jwt.js

Función Tests
generateAccessToken(user) Token válido, payload correcto (sub, email, role, type), issuer/audience
generateRefreshToken(user) Token válido, type='refresh', sin audience
verifyAccessToken(token) Token válido retorna payload, token inválido retorna null, token manipulado retorna null
verifyRefreshToken(token) Token refresh válido, rechaza si type != 'refresh'
generateTokenPair(user) Retorna accessToken, refreshToken, expiresIn, tokenType
tests/unit/auth/authorize.test.js
Archivo fuente: src/auth/middleware/authorize.js

Función Tests
authorize(...roles) next() si rol permitido, 401 si no autenticado, 403 si rol no permitido
isAdmin Permite admin, rechaza user
isAuthenticated Permite admin y user
tests/unit/controller/frameParser.test.js
Archivo fuente: src/controller/frameParser.js

Método Tests
findMarker(buffer, marker, startPos) Encuentra al inicio, en medio, retorna -1 si no existe, respeta startPos
push(chunk) + extractFrames() Emite 'frame' para JPEG completo, maneja frames incompletos, múltiples frames en un chunk
getFrameCount() Incrementa después de cada frame
getLastFrame() Retorna último frame extraído
reset() Limpia buffer, currentFrame y frameCount
tests/unit/validators/auth.validators.test.js
Funciones puras extraídas de auth.controller.js

Función Tests
isValidEmail(email) Email válido, sin @, sin dominio, con espacios
isValidPassword(password) >=6 chars ok, <6 chars fail, vacío/null fail
Frontend
tests/frontend/authManager.test.js
Lógica extraída de: src/public/js/AuthManager.js

Función Tests
decodeToken(token) Decodifica JWT válido, error si <3 partes
isAuthenticated() false sin token, true con token válido, false con token expirado
getStreamUrl(baseUrl) URL base si no hay token, agrega ?token= si hay token
tests/frontend/urlRouter.test.js
Lógica extraída de: src/public/js/URLRouter.js

Función Tests
parseStreamIdFromSearch(search) Extrae ID, retorna null si no existe, parsea como int
buildURLWithStream(baseUrl, streamId) Agrega param stream, no agrega si null
Helpers
tests/setup.js
createMockRequest(overrides) - Mock de req para middlewares
createMockResponse() - Mock de res con status() y json()
createMockUser(overrides) - Usuario de prueba
tests/helpers/mockDatabase.js
createTestDatabase() - SQLite en memoria con schema completo
seedTestData(db) - Datos iniciales (admin, user, stream, group)
tests/helpers/fixtures.js
Constantes: TEST_PASSWORD, TEST_PASSWORD_HASH
Tokens JWT de prueba (válido y expirado)
Datos de usuarios, streams, grupos
Estrategia de Dependencias
Dependencia Estrategia
SQLite Base de datos en memoria (:memory:)
bcrypt No testear directamente, usar hash pre-calculado en fixtures
passport Solo testear authorize.js (lógica pura), no authenticate.js
HTTP/Network No testear en unit tests, enfocarse en lógica pura
localStorage/fetch Extraer lógica pura a funciones testeables sin dependencias del browser
Verificación
Ejecutar tests:

npm test                    # Todos los tests
npm run test:unit           # Solo backend
npm run test:frontend       # Solo frontend
npm run test:watch          # Modo watch
Salida esperada: Todos los tests pasan sin errores.

Archivos Críticos del Proyecto
src/auth/jwt.js - Módulo JWT
src/auth/middleware/authorize.js - Middleware de autorización
src/controller/frameParser.js - Parser MJPEG
src/public/js/AuthManager.js - Gestión de auth en cliente
src/public/js/URLRouter.js - Router de URLs
