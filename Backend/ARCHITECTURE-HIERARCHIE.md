# 🏛️ Architecture Multi-Facultés & Multi-Départements

## Vue d'ensemble

Cette architecture transforme votre application StageFlow d'un modèle simple à un système **hiérarchique** :

```
Université (Admin Racine)
    ├── Faculté A (Admin Faculté)
    │   ├── Département A1 (Admin Département)
    │   ├── Département A2 (Admin Département)
    ├── Faculté B (Admin Faculté)
    │   ├── Département B1 (Admin Département)
```

---

## 1️⃣ MODÈLES DE DONNÉES

### University (Nouveau)
```javascript
{
  _id: ObjectId,
  name: "Université Abderrahmane Mira — Béjaïa",
  acronym: "UAMB",
  wilaya: "Béjaïa",
  email: "admin@univ-bejaia.dz",
  subscriptionPlan: "Standard",
  subscriptionExpiry: Date
}
```

### Faculty (Nouveau)
```javascript
{
  _id: ObjectId,
  name: "Faculté des Sciences Humaines et Sociales",
  code: "FSHS",
  university: ObjectId,        // ← Référence université
  dean: {
    name: "Dr. Mohamed Belkaïd",
    email: "dean@univ-bejaia.dz"
  },
  isActive: true
}
```

### Department (MODIFIÉ)
```javascript
{
  _id: ObjectId,
  name: "Département SIC",
  code: "SIC",
  university: ObjectId,        // ← Conservé
  faculty: ObjectId,           // ← NOUVEAU: Référence faculté
  headOfDepartment: { ... },
  stagesCoordinator: { ... }
}
```

### User (MODIFIÉ)
```javascript
{
  _id: ObjectId,
  email: "admin.sic@univ-bejaia.dz",
  role: "admin_departement",   // admin_universite | admin_faculte | admin_departement | ...
  
  university: ObjectId,        // ← Toujours requis
  faculty: ObjectId,           // ← NOUVEAU (si admin_faculte)
  department: ObjectId,        // ← MODIFIÉ (si admin_departement/responsable/enseignant)
  
  studentData: { ... },
  companyData: { ... }
}
```

---

## 2️⃣ CONTRÔLE D'ACCÈS HIÉRARCHIQUE

### Permissions par Rôle

| Rôle | Université | Faculté | Département |
|------|-----------|---------|------------|
| **admin_universite** | ✅ Toutes | ✅ Toutes | ✅ Tous |
| **admin_faculte** | ❌ SA seule | ✅ SA seulement | ✅ Ses depts |
| **admin_departement** | ❌ Voir | ❌ Voir | ✅ SON seul |
| **responsable_stages** | ❌ - | ❌ - | ✅ SON seul |

### Middleware: `checkFacultyAccess`

```javascript
// Un admin_faculte qui tente d'accéder à une autre faculté:
GET /api/faculties/FACID-OTHER/departments
// Réponse: 403 Forbidden
{
  error: "Accès refusé: vous pouvez uniquement accéder à votre propre faculté",
  yourFacultyId: "FACID-MINE"
}
```

### Middleware: `checkDepartmentAccess`

Cascade de vérification:
1. Admin Université: ✅ Accès
2. Admin Faculté: Vérifier que le département est dans SA faculté
3. Admin Département: Vérifier que c'est SON département

---

## 3️⃣ API ENDPOINTS

### Créer une Faculté
```bash
POST /api/faculties
Authorization: Bearer {token_admin_universite}
Content-Type: application/json

{
  "name": "Faculté des Sciences Exactes",
  "code": "FSE",
  "dean": {
    "name": "Dr. Ahmed Saidane",
    "email": "dean.fse@univ-bejaia.dz"
  }
}

# Réponse: 201 Created
{
  "message": "Faculté créée avec succès",
  "faculty": { ... }
}
```

### Créer un Département sous une Faculté
```bash
POST /api/faculties/:facultyId/departments
Authorization: Bearer {token_admin_faculte}
Content-Type: application/json

{
  "name": "Département Informatique",
  "code": "INFO",
  "headOfDepartment": {
    "name": "Dr. Karim Belkadi",
    "email": "head.info@univ-bejaia.dz"
  },
  "stagesCoordinator": {
    "name": "Mme. Leila Ouali",
    "email": "coord.info@univ-bejaia.dz"
  },
  "maxStudents": 150
}

# Réponse: 201 Created
{
  "message": "Département créé avec succès dans la faculté",
  "department": { ... }
}
```

### Lister les Départements d'une Faculté
```bash
GET /api/faculties/:facultyId/departments
Authorization: Bearer {token}

# Réponse: 200 OK
{
  "count": 3,
  "facultyId": "...",
  "departments": [
    { name: "SIC", code: "SIC", ... },
    { name: "INFO", code: "INFO", ... },
    { ... }
  ]
}
```

### Voir sa Hiérarchie (Debug)
```bash
GET /api/me/hierarchy
Authorization: Bearer {token}

# Réponse: 200 OK (Admin Faculté)
{
  "user": {
    "email": "admin.fshs@univ-bejaia.dz",
    "role": "admin_faculte",
    "firstName": "Admin",
    "lastName": "FSHS"
  },
  "hierarchy": {
    "university": { "name": "Univ. Béjaïa", ... },
    "faculty": { "name": "Faculté FSHS", ... },
    "department": "N/A"  // Admin faculté n'a pas de dept spécifique
  }
}
```

---

## 4️⃣ FILTRAGE EN CASCADE

### Exemple: Admin Faculté consulte les Conventions

```javascript
// middleware/accessControl.js
exports.getAccessFilter = (req) => {
  const filter = {};
  
  if (req.user.role === 'admin_universite') {
    filter.university = req.user.university._id;
  } 
  else if (req.user.role === 'admin_faculte') {
    // Récupérer tous les depts de SA faculté
    // Puis filtrer les conventions par ces depts
    filter.faculty = req.user.faculty._id;
  }
  else if (req.user.role === 'admin_departement') {
    filter.department = req.user.department._id;
  }
  
  return filter;
};
```

### Utilisation dans une route (Conventions)

```javascript
// routes/conventions.js
router.get('/list', authMiddleware, async (req, res) => {
  const filter = getAccessFilter(req);
  
  // Si admin_faculte, construire le filtre
  if (req.user.role === 'admin_faculte') {
    const departments = await Department.find({ 
      faculty: filter.faculty 
    }).select('_id');
    
    const deptIds = departments.map(d => d._id);
    filter.department = { $in: deptIds };
  }
  
  const conventions = await Convention.find(filter);
  res.json(conventions);
});
```

---

## 5️⃣ MISE EN PLACE

### 1. Installation des dépendances

```bash
cd Backend
npm install mongoose express jsonwebtoken bcryptjs dotenv
```

### 2. Variables d'environnement (.env)

```env
MONGODB_URI=mongodb://localhost:27017/stageflow
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=7d
PORT=5000
```

### 3. Initialiser la hiérarchie

```bash
# Via l'endpoint de démo
curl -X POST http://localhost:5000/api/demo/setup-hierarchy

# Réponse:
{
  "message": "✅ Hiérarchie créée avec succès",
  "credentials": {
    "adminUniversity": { "email": "admin@univ-bejaia.dz", "password": "admin123" },
    "adminFaculty": { "email": "admin.fshs@univ-bejaia.dz", "password": "faculty123" },
    "adminDepartment": { "email": "admin.sic@univ-bejaia.dz", "password": "dept123" }
  }
}
```

### 4. Tester un login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.fshs@univ-bejaia.dz",
    "password": "faculty123"
  }'

# Réponse:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

---

## 6️⃣ MIGRATION DEPUIS L'ANCIEN MODÈLE

Si vous avez déjà des données:

```javascript
// Migration Mongoose
const Faculty = require('./models/Faculty');
const Department = require('./models/Department');
const University = require('./models/University');

async function migrateToHierarchy() {
  // 1. Créer une Faculté par défaut pour chaque université
  const universities = await University.find();
  
  for (const univ of universities) {
    const defaultFaculty = new Faculty({
      name: `Faculté - ${univ.acronym}`,
      code: univ.acronym,
      university: univ._id
    });
    await defaultFaculty.save();
    
    // 2. Assigner tous les départements existants à cette faculté
    await Department.updateMany(
      { university: univ._id, faculty: null },
      { faculty: defaultFaculty._id }
    );
  }
  
  console.log('✅ Migration complète');
}

// Exécuter: node migrate.js
```

---

## 7️⃣ SÉCURITÉ & BONNES PRATIQUES

### ✅ À Faire

- ✅ **Toujours valider** qu'un admin_faculte ne crée des depts QUE dans SA faculté
- ✅ **Utiliser des indexes** sur `faculty_id` pour les performances
- ✅ **Logs d'audit**: Enregistrer qui a créé/modifié quoi et quand
- ✅ **Rate limiting**: Limiter les requêtes pour éviter les abus

### ❌ À Éviter

- ❌ Permettre à un admin_faculte de modifier d'autres universités
- ❌ Stocker les passwords en clair
- ❌ Oublier de popule les relations (Mongoose)
- ❌ Permettre à un étudiant de voir les depts d'autres facultés

---

## 📚 Fichiers Fournis

| Fichier | Purpose |
|---------|---------|
| `models/University.js` | Schéma Université |
| `models/Faculty.js` | Schéma Faculté (NOUVEAU) |
| `models/Department.js` | Schéma Département (MODIFIÉ) |
| `models/User.js` | Schéma Utilisateur (MODIFIÉ) |
| `middleware/accessControl.js` | Contrôle d'accès & filtrage |
| `routes/faculties.js` | API Endpoints |
| `services/authService.js` | Authentification & JWT |
| `server-integration.js` | Exemple d'intégration server.js |
| `prisma-schema.prisma` | Alternative SQL (Prisma) |

---

## 🚀 Prochaines Étapes

1. **Frontend**: Adapter `copie.html` pour afficher la hiérarchie
   - Menu: Université → Faculté → Département
   - Formulaire d'création avec sélections en cascade

2. **Convention Filtering**: Adapter les routes conventions pour cascade
   - Admin Faculté voit toutes les conventions de ses depts
   - Admin Dept voit que SES conventions

3. **Audit & Logs**: Implémenter un système d'audit complet

4. **Notifications**: Notifier les admins supérieurs (faculté, université)

---

**Support**: Pour toute question sur cette architecture, consultez les commentaires dans les fichiers source.
