# Model-ViewModel Example

Dieses Beispiel demonstriert die Trennung zwischen **Model** und **ViewModel** mit simuliertem Backend im Browser.

## Architektur

```
FakeBackend (Browser)     ↕    Simulated API
                               ↕
Model                          (Data + API calls)
  ↓ (getters/setters)
ViewModel                      (Computed properties)
  ↕ (Template Engine)
View                           (DOM)
  ↓ (actions)
Actions                        → Model
```

## Setup

Einfach die [frontend/index.html](frontend/index.html) im Browser öffnen:

```bash
cd frontend
npx http-server -p 8080 -c-1
```

Oder direkt mit `file://` öffnen (kein Server nötig, da keine CORS-Probleme)

## Features

- **Model**: Verwaltet Daten und Backend-API-Calls (fake-backend.js)
- **ViewModel**: Computed Properties (totalCount, completedCount, activeCount)
- **Two-way Binding**: `bind-input-value` und `bind-input-checked`
- **Fake Backend**: Simulierte REST API im Browser (keine Server-Installation nötig)
- **Actions**: Event Handler für User-Interaktionen
- **Status Management**: Loading/Success/Error States
