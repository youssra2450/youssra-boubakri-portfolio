# Lancer le portfolio sur votre ordinateur

Ce guide explique, pas à pas et sans jargon, comment démarrer le site, l'arrêter et modifier son contenu.
Tout se fait en **double-cliquant** sur des fichiers dans le dossier du projet
(`C:\Users\farah\Desktop\youssera portfolio`).

---

## 1. Ce qu'il faut sur l'ordinateur

Deux logiciels, **déjà installés sur votre PC** :

| Logiciel | Version | Où le trouver s'il manque un jour |
|---|---|---|
| **Python** | 3.10, 3.11 ou 3.12 | https://www.python.org/downloads/ (pendant l'installation, cochez **« Add python.exe to PATH »**) |
| **Node.js** | version « LTS » | https://nodejs.org/ |

Rien d'autre : pas de Docker, pas d'installation de base de données, pas de droits administrateur.
Une connexion Internet est nécessaire **uniquement la première fois** (téléchargement des composants).

> **Avant la toute première utilisation** : si des fenêtres noires lancées à la main tournent encore
> (par exemple une fenêtre avec `uvicorn` et une autre avec `npm run dev`), fermez-les d'abord. Sinon
> `start.bat` réutiliserait ces anciens serveurs au lieu des nouveaux.

---

## 2. Démarrer le site

1. Ouvrez le dossier du projet.
2. **Double-cliquez sur `start.bat`.**
3. Une fenêtre noire affiche les étapes :

   ```
   [1/6] Vérification des prérequis
   [2/6] Préparation du backend
   [3/6] Démarrage de la base de données
   [4/6] Mise à jour de la base (tables et contenu)
   [5/6] Préparation du site
   [6/6] Démarrage de l'API et du site
   Le portfolio est prêt
   ```

   - **La première fois**, comptez quelques minutes : l'ordinateur installe les composants et prépare la base
     de données.
   - **Les fois suivantes**, le démarrage prend environ 15 à 20 secondes.

4. Le navigateur s'ouvre tout seul sur le site : **http://localhost:5173**

### Ce qui s'ouvre

| Fenêtre | Rôle | À faire |
|---|---|---|
| Fenêtre de démarrage | Affiche les étapes puis se ferme toute seule | Rien |
| **« Portfolio — API »** | Le serveur qui fournit les données du site | La laisser ouverte (vous pouvez la réduire) |
| **« Portfolio — Site »** | Le serveur qui affiche le site | La laisser ouverte (vous pouvez la réduire) |
| Navigateur | Le site : http://localhost:5173 | Naviguer |

Adresses utiles :

- Le site : **http://localhost:5173**
- La documentation technique de l'API (pour les recruteurs techniques) : **http://localhost:8000/api/docs**

Le site n'est visible que sur votre ordinateur (« localhost »). Pour le publier sur Internet, voir la partie
« Deployment » du fichier `README.md`.

---

## 3. Arrêter le site

**Double-cliquez sur `stop.bat`.**

Il ferme les fenêtres « Portfolio — API » et « Portfolio — Site » et arrête proprement la base de données.
Il ne touche à aucun autre programme.

> Fermer simplement les deux fenêtres arrête aussi le site, mais la base de données continue alors de tourner
> discrètement en arrière-plan. Ce n'est pas grave (elle sera réutilisée au prochain démarrage), mais
> `stop.bat` est plus propre.

---

## 4. Modifier le contenu du site

**Tous les textes du site** (présentation, formations, expériences, compétences, projets, liens) se trouvent
dans **un seul fichier** :

```
database\seed\portfolio.json
```

### Étapes

1. Ouvrez `database\seed\portfolio.json` avec **Visual Studio Code** (clic droit → *Ouvrir avec* →
   *Visual Studio Code*). Le Bloc-notes fonctionne aussi.
2. Modifiez le texte **entre les guillemets**, puis enregistrez (Ctrl+S).
3. **Double-cliquez sur `update-content.bat`.** Le message « Contenu mis à jour » confirme que c'est fait.
4. Dans le navigateur, actualisez la page avec **Ctrl+F5**. Le changement peut mettre jusqu'à une minute à
   apparaître.

`update-content.bat` fonctionne que le site soit démarré ou non.

### Les règles à respecter dans ce fichier

Le fichier suit un format strict (JSON). Quelques règles suffisent :

- Le texte est toujours **entre guillemets droits** `"comme ceci"` (pas de guillemets « » ni “ ”).
- Les éléments d'une liste sont séparés par des **virgules**, mais **pas de virgule après le dernier**.
- Pour écrire un guillemet à l'intérieur d'un texte, tapez `\"`.
- Les lignes dont le nom commence par `_` (par exemple `"_source"`) sont des notes : le site les ignore.
- Laissez vide (`null` ou `[]`) ce qui n'existe pas : le site masque automatiquement les éléments vides.
- Les liens **GitHub** et **LinkedIn** du profil sont réglés dans le fichier `.env`
  (`PORTFOLIO_GITHUB_URL`, `PORTFOLIO_LINKEDIN_URL`) : ces valeurs ont priorité sur `portfolio.json`.

Exemple, pour modifier la phrase d'accroche :

```json
"tagline": "Turning complex data into decision-ready intelligence.",
```

**En cas d'erreur** (virgule oubliée, guillemet manquant…), `update-content.bat` affiche un message qui
indique le problème (pour une faute de frappe, avec le numéro de ligne) et **ne change rien** au site.
Corrigez le fichier, enregistrez, puis relancez `update-content.bat`.

> Conseil : avant une grosse modification, faites une copie du fichier (par exemple
> `portfolio - copie.json`) pour pouvoir revenir en arrière.

---

## 5. Le CV

Le CV n'est volontairement **pas publié** sur le site (il contient votre numéro de téléphone). Les recruteurs vous contactent par email, LinkedIn ou GitHub. Votre CV original reste dans votre dossier Téléchargements.

## 6. Activer le formulaire de contact (facultatif)

Par défaut, le site affiche vos contacts **e-mail, LinkedIn et GitHub**. Un **formulaire** peut aussi
apparaître : les messages des visiteurs arrivent alors directement dans votre boîte mail. Il suffit d'une
configuration Gmail :

1. Sur votre compte Google, activez la **validation en deux étapes**, puis créez un **« mot de passe
   d'application »** (Compte Google → Sécurité → Mots de passe des applications). Vous obtenez un code de
   16 lettres.
2. Ouvrez le fichier **`.env`** (à la racine du projet) avec Visual Studio Code, puis remplissez ces lignes
   (ajoutez celles qui manquent) :

   ```
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=votre.adresse@gmail.com
   SMTP_PASSWORD=le-code-de-16-lettres
   EMAIL_FROM=votre.adresse@gmail.com
   EMAIL_TO=l.adresse.qui.recoit.les.messages@gmail.com
   ```

3. Enregistrez, puis double-cliquez sur **`stop.bat`** et ensuite sur **`start.bat`**. Le formulaire apparaît
   dans la section Contact.

Le fichier `.env` contient des mots de passe : ne le partagez jamais et ne l'envoyez à personne.

---

## 7. Problèmes fréquents

| Message ou situation | Solution |
|---|---|
| **« Le port 8000 (ou 5173) est déjà utilisé par un autre programme »** | Un ancien serveur tourne encore. Fermez les fenêtres noires ouvertes (ou redémarrez l'ordinateur) puis relancez `start.bat`. Sinon, utilisez d'autres ports : voir « Changer les ports » plus bas. |
| **« Python est introuvable »** ou **« la base de données intégrée demande Python 3.10, 3.11 ou 3.12 »** | Installez Python 3.12 depuis python.org en cochant **« Add python.exe to PATH »**, puis relancez `start.bat`. |
| **« Node.js est introuvable »** ou **« trop ancien »** | Installez la version LTS depuis nodejs.org, puis relancez `start.bat`. |
| **« L'exécution de scripts est désactivée sur ce système »** | Lancez toujours le projet par un double-clic sur `start.bat` (et non sur les fichiers `.ps1` du dossier `scripts`). |
| **Windows affiche « Windows a protégé votre ordinateur »** | Cliquez sur **« Informations complémentaires »** puis **« Exécuter quand même »**. Cela arrive avec les fichiers téléchargés. |
| **« Le dossier du projet est trop profond pour Windows »** | Déplacez le dossier du projet vers un emplacement court, par exemple `C:\portfolio`, puis relancez `start.bat`. |
| **« L'installation des paquets a échoué »** | Vérifiez la connexion Internet et relancez `start.bat` : il reprend là où il s'était arrêté. |
| **Le site s'affiche mais sans contenu, ou avec une erreur** | Regardez les messages en rouge dans la fenêtre « Portfolio — API ». Le plus souvent, `stop.bat` puis `start.bat` règle le problème. |
| **Mes modifications n'apparaissent pas** | Avez-vous lancé `update-content.bat` ? Actualisez ensuite avec **Ctrl+F5** et attendez jusqu'à une minute. |
| **Tout repartir de zéro** | `stop.bat`, supprimez le dossier **`.local`** du projet, puis `start.bat`. La base de données est reconstruite à partir de `portfolio.json`, sans rien perdre du contenu. |

### Changer les ports (utilisateurs avancés)

Si un autre logiciel utilise déjà les ports 8000, 5173 ou 5433 : dans le dossier du projet, cliquez dans la
barre d'adresse de l'Explorateur, tapez `cmd`, validez, puis tapez par exemple :

```
start.bat -ApiPort 8001 -WebPort 5174 -DbPort 5434
```

Le site sera alors à l'adresse http://localhost:5174.

---

## 8. Où se trouve quoi ?

| Élément | Emplacement |
|---|---|
| Démarrer / arrêter | `start.bat` / `stop.bat` |
| Appliquer les modifications du contenu | `update-content.bat` |
| Tout le contenu du site | `database\seed\portfolio.json` |
| Les photos | `frontend\public\images\` |
| Les réglages (e-mail, liens GitHub / LinkedIn) | `.env` (modèle commenté : `.env.example`) |
| Les données locales de la base (automatique, ne pas modifier) | `.local\` |
| La documentation technique complète (en anglais) | `README.md` |
