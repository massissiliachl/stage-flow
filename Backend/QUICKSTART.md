# 🚀 Démarrage Rapide - Architecture Multi-Facultés

## Prerequisites

- Node.js 16+
- MongoDB 4.4+ (ou Atlas)
- Postman ou CURL (pour tester)

---

## Installation

```bash
cd Backend

# 1. Installer les dépendances
npm install

# 2. Créer .env
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/stageflow
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=7d
PORT=5000
EOF

# 3. Initialiser la base de données (Seed)
node seed.js

# 4. Démarrer le serveur
npm start
# ou pour développement avec auto-reload:
npm run dev  # (ajouter script dans package.json si nécessaire)
```

---

## Configuration package.json

Ajouter les scripts dans votre `package.json`:

```json
{
  "name": "stageflow-backend",
  "version": "2.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node seed.js",
    "test": "bash test-api.sh"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

---

## 5 Minutes - Premier Test

### 1️⃣ Démarrer MongoDB (si local)

```bash
# MacOS avec Homebrew
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:5.0
```

### 2️⃣ Lancer le seed

```bash
node seed.js

# Output:
# ✅ MongoDB connecté
# ✅ Université créée: Université Abderrahmane Mira — Béjaïa
# ✅ Facultés créées: FSHS, FST
# ✅ Départements créés: SIC, INFORMATIQUE, GC
# ✅ Utilisateurs créés: 6 users
```

### 3️⃣ Démarrer le serveur

```bash
npm start

# Output:
# 🚀 Serveur StageFlow lancé sur le port 5000
# 📝 Pour tester: POST /api/demo/setup-hierarchy
```

### 4️⃣ Tester une requête (dans un autre terminal)

```bash
# Test 1: Login Admin Université
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@univ-bejaia.dz",
    "password": "admin123"
  }' | jq '.'

# Copier le token

# Test 2: Voir sa hiérarchie
curl -X GET http://localhost:5000/api/me/hierarchy \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" | jq '.'

# Test 3: Lister les facultés
curl -X GET http://localhost:5000/api/faculties \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" | jq '.'
```

---

## Fichiers Clés

```
Backend/
├── models/
│   ├── University.js          # Université (nouveau)
│   ├── Faculty.js             # Faculté (nouveau)
│   ├── Department.js          # Département (modifié)
│   └── User.js                # Utilisateur (modifié)
├── middleware/
│   └── accessControl.js       # Contrôle d'accès hiérarchique
├── routes/
│   └── faculties.js           # Routes API
├── services/
│   └── authService.js         # Authentification
├── seed.js                    # Initialisation BD
├── test-api.sh                # Tests CURL
├── server-integration.js      # Exemple server.js
└── ARCHITECTURE-HIERARCHIE.md # Documentation complète
```

---

## Flux de Travail Typique

### Pour un Admin Université

1. **Login**
   ```bash
   POST /api/auth/login
   { "email": "admin@univ-bejaia.dz", "password": "admin123" }
   ```

2. **Lister toutes les facultés**
   ```bash
   GET /api/faculties
   Authorization: Bearer {token}
   ```

3. **Créer une nouvelle faculté**
   ```bash
   POST /api/faculties
   { "name": "...", "code": "...", "dean": {...} }
   ```

4. **Voir les depts d'une faculté**
   ```bash
   GET /api/faculties/:facultyId/departments
   ```

### Pour un Admin Faculté

1. **Login**
   ```bash
   POST /api/auth/login
   { "email": "admin.fshs@univ-bejaia.dz", "password": "faculty123" }
   ```

2. **Voir SA faculté uniquement**
   ```bash
   GET /api/faculties
   # Retourne sa faculté seulement
   ```

3. **Créer un département dans SA faculté**
   ```bash
   POST /api/faculties/:facultyId/departments
   { "name": "...", "code": "...", ... }
   ```

4. **Modifier un département**
   ```bash
   PUT /api/faculties/:facultyId/departments/:departmentId
   ```

---

## Sécurité - Tests

### ✅ Cas autorisés

```bash
# Admin Université peut voir toutes les facultés
GET /api/faculties
Authorization: Bearer {admin_univ_token}
# ✅ 200 OK - Toutes les facultés

# Admin Faculté crée un dept dans SA faculté
POST /api/faculties/{SA_FACULTE}/departments
Authorization: Bearer {admin_faculty_token}
# ✅ 201 Created
```

### ❌ Cas refusés (403 Forbidden)

```bash
# Admin Faculté FSHS tente de créer une faculté
POST /api/faculties
Authorization: Bearer {admin_fshs_token}
# ❌ 403 Forbidden - Rôle insuffisant

# Admin Faculté FSHS accède à un dept de FST
GET /api/faculties/{FST_ID}/departments
Authorization: Bearer {admin_fshs_token}
# ❌ 403 Forbidden - Accès refusé: ce département n'appartient pas à votre faculté

# Admin Département accède à une autre faculté
GET /api/faculties/{OTHER_FACULTY_ID}
Authorization: Bearer {admin_dept_token}
# ❌ 403 Forbidden - Rôle non autorisé
```

---

## Debugging

### Voir les logs MongoDB

```bash
# Activer les logs Mongoose
MONGOOSE_DEBUG=true npm start
```

### Test avec Postman

1. Importer les tokens JWT dans Postman:
   - **Type**: Bearer Token
   - **Token**: Coller le token reçu du login

2. Pré-remplir les variables:
   ```json
   {
     "base_url": "http://localhost:5000",
     "faculty_id": "...",
     "department_id": "..."
   }
   ```

---

## Aide / Dépannage

### ❌ Erreur: "Cannot connect to MongoDB"

```bash
# Vérifier que MongoDB est lancé
mongosh  # ou mongo

# Vérifier la URI dans .env
MONGODB_URI=mongodb://localhost:27017/stageflow
```

### ❌ Erreur: "Token expired"

```bash
# Les tokens JWT expirent après 7j (par défaut)
# Faire un nouveau login:
POST /api/auth/login
```

### ❌ Erreur: "Role not found"

```bash
# Vérifier que les rôles sont valides:
# admin_universite, admin_faculte, admin_departement,
# responsable_stages, enseignant, etudiant, entreprise
```

---

## Prochaines Étapes

1. **Frontend** - Adapter `copie.html` pour afficher la hiérarchie
2. **Conventions** - Filtrer par hiérarchie
3. **Notifications** - Alert admins de faculté/université
4. **Audit** - Logs d'actions par utilisateur
5. **Produits** - Déployer sur production (AWS, Heroku, VPS)

---

## Support

Pour toute question, vérifier:
- `ARCHITECTURE-HIERARCHIE.md` - Documentation complète
- `models/` - Schémas Mongoose
- `middleware/accessControl.js` - Logique d'accès
- `routes/faculties.js` - Endpoints API

Bonne chance! 🚀
