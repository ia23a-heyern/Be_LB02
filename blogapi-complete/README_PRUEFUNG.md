# Prüfungsdokumentation – Blog API

## 🔐 Login-Daten

| Benutzername | Passwort   | Rollen                   |
|--------------|------------|---------------------------|
| admin        | admin123   | ADMIN, READER, USER       |
| berta        | berta123   | READER, USER              |
| max15        | pass123    | USER                      |

---

## 🧩 Rollen und Rechte

| Rolle  | Rechte                                   |
|--------|-------------------------------------------|
| USER   | Beiträge sehen                            |
| READER | Beiträge sehen (auch Details)             |
| ADMIN  | Beiträge erstellen, bearbeiten, löschen   |

---

## 🔑 Endpunkte (API)

| Methode | Pfad                    | Beschreibung                     | Zugriff         |
|---------|-------------------------|----------------------------------|------------------|
| GET     | /posts                  | Liste aller Beiträge (Titel für Gäste) | öffentlich     |
| GET     | /posts/{id}             | Beitrag mit Inhalt anzeigen      | eingeloggt       |
| POST    | /posts                  | Neuen Beitrag anlegen            | ADMIN            |
| PUT     | /posts/{id}             | Beitrag bearbeiten               | ADMIN            |
| DELETE  | /posts/{id}             | Beitrag löschen                  | ADMIN            |
| POST    | /posts/{id}/image       | Bild zu Beitrag hochladen        | ADMIN            |
| GET     | /me                     | Aktueller Benutzer + Rollen      | eingeloggt       |

---

## 🧪 Ablauf für Prüfungsteilnehmer

1. Öffne das Frontend (`index.html`) lokal im Browser.
2. Melde dich mit einem Benutzer an (siehe Tabelle oben).
3. Je nach Rolle kannst du:
   - Titel sehen (immer)
   - Inhalt anzeigen (READER, ADMIN)
   - Beiträge bearbeiten, erstellen, löschen (nur ADMIN)

---

## 📄 Technischer Hinweis

- Backend basiert auf Spring Boot (REST + Security)
- Login via HTTP JWT
- Rollenprüfung erfolgt serverseitig
- Frontend erkennt Berechtigung über `/me`-Endpunkt



## DB Handling

- Zugangsdaten in application.properties anpassen
- Scheme blogdb anlegen

