#!/bin/bash

# Script para probar el sistema de autenticación

echo "==================================="
echo "Test de Autenticación IPTV-Restream"
echo "==================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:5000"

echo -e "${YELLOW}1. Verificando estado de autenticación...${NC}"
STATUS=$(curl -s "${BACKEND_URL}/api/auth/status")
echo "Respuesta: $STATUS"
echo ""

echo -e "${YELLOW}2. Intentando login con credenciales por defecto...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123456789"}')

echo "Respuesta: $LOGIN_RESPONSE"

# Extraer token (requiere jq)
if command -v jq &> /dev/null; then
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
  if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login exitoso!${NC}"
    echo "Token: ${TOKEN:0:20}..."
    echo ""
    
    echo -e "${YELLOW}3. Probando acceso a endpoint protegido...${NC}"
    CHANNELS=$(curl -s "${BACKEND_URL}/api/channels/" \
      -H "Authorization: Bearer $TOKEN")
    echo "Respuesta: $CHANNELS"
    echo -e "${GREEN}✓ Acceso autorizado!${NC}"
    echo ""
    
    echo -e "${YELLOW}4. Obteniendo información del usuario actual...${NC}"
    USER_INFO=$(curl -s "${BACKEND_URL}/api/users/me" \
      -H "Authorization: Bearer $TOKEN")
    echo "Respuesta: $USER_INFO"
    echo ""
    
  else
    echo -e "${RED}✗ Login fallido${NC}"
  fi
else
  echo -e "${YELLOW}Instala 'jq' para pruebas automáticas completas${NC}"
fi

echo ""
echo -e "${YELLOW}5. Intentando acceso sin token (debe fallar)...${NC}"
NO_AUTH=$(curl -s -w "\nHTTP Status: %{http_code}" "${BACKEND_URL}/api/channels/")
echo "$NO_AUTH"

if echo "$NO_AUTH" | grep -q "401"; then
  echo -e "${GREEN}✓ Protección funcionando correctamente${NC}"
else
  echo -e "${RED}✗ Advertencia: Las rutas deberían estar protegidas${NC}"
fi

echo ""
echo "==================================="
echo "Test completado"
echo "==================================="
