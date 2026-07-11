#!/bin/bash
# test-api.sh - Script de test pour l'API hiérarchique

BASE_URL="http://localhost:5000"

echo "🧪 Tests API StageFlow - Architecture Multi-Facultés"
echo "════════════════════════════════════════════════════════"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────
# 1. INITIALISER LA HIÉRARCHIE (Demo Setup)
# ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}1️⃣ Initialiser la hiérarchie (SKIP si déjà fait)${NC}"
echo "POST /api/demo/setup-hierarchy"
# curl -X POST $BASE_URL/api/demo/setup-hierarchy

# ─────────────────────────────────────────────────────────
# 2. LOGIN - Admin Université
# ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}2️⃣ LOGIN - Admin Université${NC}"
echo "POST /api/auth/login"

TOKEN_UNIV=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@univ-bejaia.dz",
    "password": "admin123"
  }' | jq -r '.token')

echo "Token Admin Université: ${TOKEN_UNIV:0:30}..."

# ─────────────────────────────────────────────────────────
# 3. LOGIN - Admin Faculté
# ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}3️⃣ LOGIN - Admin Faculté${NC}"
echo "POST /api/auth/login"

TOKEN_FACULTY=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.fshs@univ-bejaia.dz",
    "password": "faculty123"
  }' | jq -r '.token')

echo "Token Admin Faculté: ${TOKEN_FACULTY:0:30}..."

# ─────────────────────────────────────────────────────────
# 4. LOGIN - Admin Département
# ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}4️⃣ LOGIN - Admin Département${NC}"
echo "POST /api/auth/login"

TOKEN_DEPT=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.sic@univ-bejaia.dz",
    "password": "dept123"
  }' | jq -r '.token')

echo "Token Admin Département: ${TOKEN_DEPT:0:30}..."

# ─────────────────────────────────────────────────────────
# 5. VOIR SA HIÉRARCHIE - Admin Université
# ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}5️⃣ Voir sa hiérarchie - Admin Université${NC}"
echo "GET /api/me/hierarchy"
curl -s -X GET $BASE_URL/api/me/hierarchy \
  -H "Authorization: Bearer $TOKEN_UNIV" | jq '.'

# ─────────────────────────────────────────────────────────
# 6. VOIR SA HIÉRARCHIE - Admin Faculté
# ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}6️⃣ Voir sa hiérarchie - Admin Faculté${NC}"
echo "GET /api/me/hierarchy"
curl -s -X GET $BASE_URL/api/me/hierarchy \
  -H "Authorization: Bearer $TOKEN_FACULTY" | jq '.'

# ─────────────────────────────────────────────────────────
# 7. LISTER LES FACULTÉS - Admin Université
# ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}7️⃣ Lister les facultés - Admin Université${NC}"
echo "GET /api/faculties"
FACULTIES=$(curl -s -X GET $BASE_URL/api/faculties \
  -H "Authorization: Bearer $TOKEN_UNIV" | jq '.')
echo "$FACULTIES"

# Extraire le ID de la première faculté
FACULTY_ID=$(echo "$FACULTIES" | jq -r '.faculties[0]._id')
echo "Faculty ID extrait: $FACULTY_ID"

# ─────────────────────────────────────────────────────────
# 8. LISTER LES DÉPARTEMENTS D'UNE FACULTÉ
# ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}8️⃣ Lister les départements d'une faculté${NC}"
echo "GET /api/faculties/$FACULTY_ID/departments"
curl -s -X GET $BASE_URL/api/faculties/$FACULTY_ID/departments \
  -H "Authorization: Bearer $TOKEN_FACULTY" | jq '.'

# ─────────────────────────────────────────────────────────
# 9. CRÉER UN NOUVEAU DÉPARTEMENT (Admin Faculté)
# ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}9️⃣ Créer un nouveau département (Admin Faculté)${NC}"
echo "POST /api/faculties/$FACULTY_ID/departments"
curl -s -X POST $BASE_URL/api/faculties/$FACULTY_ID/departments \
  -H "Authorization: Bearer $TOKEN_FACULTY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Département Psychologie",
    "code": "PSYCH",
    "headOfDepartment": {
      "name": "Dr. Leila Messaoudi",
      "email": "head.psych@univ-bejaia.dz"
    },
    "maxStudents": 100
  }' | jq '.'

# ─────────────────────────────────────────────────────────
# 10. TEST: Admin Département tente d'accéder à une autre faculté (DOIT ÉCHOUER)
# ─────────────────────────────────────────────────────────
echo -e "\n${YELLOW}🚫 TEST SÉCURITÉ: Admin Dept accède à autre faculté${NC}"
echo "GET /api/faculties/INVALID_ID/departments"
curl -s -X GET $BASE_URL/api/faculties/INVALID_ID/departments \
  -H "Authorization: Bearer $TOKEN_DEPT" | jq '.'

# ─────────────────────────────────────────────────────────
# 11. CRÉER UNE NOUVELLE FACULTÉ (Admin Université seulement)
# ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}🔟 Créer une nouvelle faculté (Admin Université)${NC}"
echo "POST /api/faculties"
curl -s -X POST $BASE_URL/api/faculties \
  -H "Authorization: Bearer $TOKEN_UNIV" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Faculté de Médecine",
    "code": "FMEDECINE",
    "dean": {
      "name": "Dr. Yacine Bouaroua",
      "email": "dean.med@univ-bejaia.dz"
    },
    "description": "Nouvelle faculté de médecine"
  }' | jq '.'

# ─────────────────────────────────────────────────────────
# 12. TEST: Admin Faculté tente de créer une faculté (DOIT ÉCHOUER)
# ─────────────────────────────────────────────────────────
echo -e "\n${YELLOW}🚫 TEST SÉCURITÉ: Admin Faculté crée une faculté${NC}"
echo "POST /api/faculties"
curl -s -X POST $BASE_URL/api/faculties \
  -H "Authorization: Bearer $TOKEN_FACULTY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Faculté Pirate",
    "code": "PIRATE"
  }' | jq '.'

echo -e "\n${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Tests terminés!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
