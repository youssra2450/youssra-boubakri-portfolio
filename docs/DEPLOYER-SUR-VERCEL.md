# Mettre le portfolio en ligne sur Vercel

Le site (React) et l'API (FastAPI) sont déployés dans **un seul projet Vercel** grâce au fichier
`vercel.json` à la racine du dépôt (« Services » : `frontend` sur `/`, `backend` sur `/api`).
La base de données est une **PostgreSQL Neon** gratuite, connectée depuis Vercel.

## 1. Créer le projet

1. Sur [vercel.com/new](https://vercel.com/new), importez le dépôt GitHub `youssra2450/youssra-boubakri-portfolio`.
2. **Application Preset** : Vercel affiche **Services** avec `frontend` (Vite, `/`) et `backend` (FastAPI, `/api`).
   Laissez tel quel ; **Root Directory** reste `./`.
3. **Environment Variables** : supprimez les variables détectées automatiquement (bouton **—**) et ajoutez
   **une seule** variable :

   | Key | Value |
   |---|---|
   | `SECRET_KEY` | une longue valeur aléatoire (au moins 32 caractères) |

   Pour en générer une : `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

4. Cliquez sur **Deploy**. Le premier déploiement réussit, mais le contenu s'affiche seulement après l'étape 2.

## 2. Ajouter la base de données Neon

1. Dans le projet Vercel : onglet **Storage** → **Create Database** → **Neon (Serverless Postgres)** →
   acceptez, région proche (par ex. Europe), **Connect** au projet (environnements Production + Preview).
   Vercel ajoute automatiquement `DATABASE_URL` (et les variantes `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`…).
2. Onglet **Deployments** → sur le dernier déploiement, menu **⋯** → **Redeploy**.

Pendant le build, `backend/scripts/vercel_build.py` crée les tables (Alembic) et charge le contenu de
`database/seed/portfolio.json`. Le site affiche ensuite vos 8 projets.

## 3. Mettre à jour le contenu

Modifiez `database/seed/portfolio.json`, puis envoyez sur GitHub (`git add`, `git commit`, `git push`).
Vercel redéploie tout seul et **recharge le contenu à chaque déploiement** (les messages de contact ne sont
jamais effacés).

## Ce qui est automatique

| Réglage | Valeur sur Vercel |
|---|---|
| `ENVIRONMENT` | `production` |
| `TRUST_PROXY_HEADERS` | `true` (adresse IP réelle des visiteurs derrière le proxy Vercel) |
| `SITE_URL` (sitemap, robots.txt) et `VITE_SITE_URL` (balises SEO) | le domaine de production Vercel |
| Base de données | `DATABASE_URL` fourni par Neon (`POSTGRES_URL` accepté aussi) |

Vous pouvez les remplacer en les définissant vous-même dans **Settings → Environment Variables**
(par exemple `SITE_URL` et `VITE_SITE_URL` si vous ajoutez un nom de domaine personnalisé).

## Vérifier

- `https://<votre-projet>.vercel.app/` : le portfolio.
- `https://<votre-projet>.vercel.app/api/health` : `{"status":"healthy", "database":"connected", …}`.
- `https://<votre-projet>.vercel.app/api/docs` : la documentation de l'API.

Si `/api/health` répond `degraded` ou si le site affiche « contenu indisponible » : vérifiez que la base Neon est
bien connectée au projet (Storage), puis **Redeploy**. Les journaux du build (onglet **Deployments** → le
déploiement → **Build Logs**) contiennent les lignes `vercel-build: …`.
