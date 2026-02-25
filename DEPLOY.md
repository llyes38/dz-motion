# Déploiement DZ Motion (GitHub + Vercel)

## 1. GitHub – Créer le dépôt et pousser le code

1. Va sur **https://github.com/new**
2. **Repository name** : `dz-motion` (ou un autre nom)
3. Laisse **Public**, ne coche pas "Add a README" (tu as déjà du code)
4. Clique sur **Create repository**
5. Dans ton terminal (à la racine du projet `dz-motion`) :

```bash
git remote add origin https://github.com/TON_USERNAME/dz-motion.git
git push -u origin master
```

Remplace `TON_USERNAME` par ton identifiant GitHub. Si ton dépôt s’appelle autrement, adapte l’URL.

Si GitHub te demande de te connecter : utilise un **Personal Access Token** (Settings → Developer settings → Personal access tokens) comme mot de passe.

---

## 2. Vercel – Déployer l’app

1. Va sur **https://vercel.com** et connecte-toi (avec GitHub si possible)
2. Clique sur **Add New…** → **Project**
3. **Import** le dépôt `dz-motion` (s’il n’apparaît pas, clique sur **Configure GitHub** et autorise Vercel)
4. **Framework Preset** : Next.js (détecté automatiquement)
5. Clique sur **Environment Variables** et ajoute :
   - **Name** : `RUNWARE_API_KEY`  
   - **Value** : ta clé API Runware (celle de ton `.env.local`)
6. Clique sur **Deploy**

À la fin du déploiement, Vercel te donne une URL du type `https://dz-motion-xxx.vercel.app`.

---

## 3. (Optionnel) URL de base pour les vidéos de référence

Sur Vercel, l’app utilise automatiquement l’URL du déploiement pour les vidéos (`/reference/chaoui.mp4`, etc.). Tu n’as rien à faire de plus.

Si tu ajoutes un **domaine personnalisé** plus tard, tu peux définir dans Vercel :
- **Name** : `NEXT_PUBLIC_APP_URL`
- **Value** : `https://ton-domaine.com`

---

## Résumé

| Étape | Où | Action |
|-------|-----|--------|
| 1 | GitHub | Créer le repo, puis `git remote add origin ...` et `git push -u origin master` |
| 2 | Vercel | Import du repo, ajout de `RUNWARE_API_KEY`, Deploy |

Ton `.env.local` reste sur ta machine et n’est **jamais** envoyé sur GitHub (il est dans `.gitignore`). La clé est uniquement saisie dans Vercel (Environment Variables).
