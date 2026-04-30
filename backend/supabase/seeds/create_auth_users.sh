#!/bin/bash
# ============================================================
# Script para crear 10 usuarios de prueba en Supabase Auth
# SOLO para entornos dev y staging.
#
# Uso:
#   export SUPABASE_PROJECT_REF="tu-project-ref"
#   export SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
#   bash create_auth_users.sh
# ============================================================

BASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/admin/users"
PASSWORD="Test1234!"

USERS=(
  "test1@cannatrack.dev"
  "test2@cannatrack.dev"
  "test3@cannatrack.dev"
  "test4@cannatrack.dev"
  "test5@cannatrack.dev"
  "test6@cannatrack.dev"
  "test7@cannatrack.dev"
  "test8@cannatrack.dev"
  "test9@cannatrack.dev"
  "test10@cannatrack.dev"
)

for email in "${USERS[@]}"; do
  echo "Creando usuario: $email"
  curl -s -X POST "$BASE_URL" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"password\": \"$PASSWORD\",
      \"email_confirm\": true,
      \"user_metadata\": { \"is_test_user\": true }
    }" | jq '.id // .error'
done

echo ""
echo "Usuarios creados. Copiar los UUIDs al archivo seeds/test_users.sql"
