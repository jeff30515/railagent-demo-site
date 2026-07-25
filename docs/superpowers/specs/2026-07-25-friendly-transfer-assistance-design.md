# Friendly Transfer Assistance Design

## Goal

Extend the existing passenger-facing Friendly Transfer Assistance entry so it serves two distinct journeys:

1. A low-vision or blind passenger can request station assistance through a voice-first, one-button flow.
2. A general passenger can provide an origin and destination and receive a local-Ollama transfer guidance response.

The feature remains a static GitHub Pages UI connected to the existing local API through the `apiBaseUrl` query parameter. It must not require a cloud model or a public third-party API at runtime.

## Scope and constraints

- The retained application is `railagent-demo-site`; do not modify the deleted legacy demo.
- The UI injection pattern in `assets/lost-found-local-api.js` remains the integration point because the application bundle is prebuilt.
- `gemma4:e4b` runs only behind the local API. Browser code must never call Ollama directly.
- A model does not decide phone numbers. The local API owns a versioned station-directory dataset and returns only a number present in that data.
- A browser may open a `tel:` URL only after an explicit user confirmation. On a desktop without a registered calling program, the UI must also show the number and explain that it can be dialed from a phone.
- Browser speech recognition is an optional progressive enhancement. Manual text entry and station selection remain available when voice input is unavailable or denied.

## Passenger experience

### Assistance for blind or low-vision passengers

The Friendly Transfer Assistance page gains a prominent first action, `轉乘協助`. Activating it opens a focused dialog that announces: `請說出您目前所在的車站。`

The dialog:

- Starts browser speech recognition when available and requested by the passenger.
- Displays the transcribed text and provides a large editable fallback input.
- Sends the spoken or typed station phrase to `POST /api/friendly-transfer/station`.
- Receives a canonical station name, station service phone number, and a short confirmation phrase.
- Speaks and displays: `您目前在 <station>，是否撥打站務人員電話？`
- Requires a separate confirmation button before opening `tel:<phone>`.
- Shows the phone number and a retry path if the station cannot be resolved.

This is an assistance-call demonstration, not a claim that a real station work-order has been received. The UI must state that the passenger should remain in a safe visible location while waiting for help.

### Route guidance for general passengers

Below the assistance action, the page provides two inputs: current location and intended destination. Submission calls `POST /api/friendly-transfer/route`.

The API uses local Ollama to produce concise Traditional Chinese guidance. It must distinguish a suggested route from verified real-time operations and instruct the passenger to confirm platform, departure time, and accessibility conditions with station staff where needed.

## API design

### `POST /api/friendly-transfer/station`

Request:

```json
{ "spokenStation": "我在台北車站" }
```

Successful response:

```json
{
  "station": "臺北車站",
  "phone": "02-2371-3558",
  "confirmation": "已辨識為臺北車站。是否撥打站務人員電話？"
}
```

The API normalizes obvious speech variants with deterministic matching first. If matching is ambiguous, it can ask the local model to select only from supplied station candidates. It returns `400` for empty input and `404` when no station can be resolved. It never invents a phone number.

### `POST /api/friendly-transfer/route`

Request:

```json
{ "origin": "台北車站", "destination": "南港車站" }
```

Response:

```json
{ "answer": "...", "model": "gemma4:e4b" }
```

The endpoint validates both inputs, bounds lengths, and asks Ollama for an accessible transfer explanation. It does not present its answer as live timetable or real-time station status.

## Local data

Add a small committed station-directory source under `local-api/src/friendlyTransfer/` with a focused initial set of demonstration stations. Each record contains:

- canonical station name
- supported spoken aliases
- public service telephone number

The data module is deliberately separate from model logic so a later official source import can replace its contents without altering request handling.

## Error handling and accessibility

- All dialogs use `role="dialog"`, focus management, visible text, and `aria-live` feedback.
- Speech recognition errors never block manual entry.
- API and Ollama failures show a concise retryable message and preserve entered data.
- `tel:` navigation is attempted only after explicit confirmation and remains a no-op-safe action on desktop.

## Verification

- Unit tests cover station normalization, unknown stations, required route fields, and no-invented-phone behavior.
- Local API tests cover CORS, successful responses, and validation failures for both endpoints.
- Browser smoke test covers opening the assistance dialog, resolving a station, confirming the call action, and receiving a route response with the active local tunnel URL.

## Rejected alternatives

- Live web scraping for a station phone number: rejected because it is unreliable, changes external data at runtime, and makes the local-demo flow dependent on the internet.
- Letting Ollama generate a phone number: rejected because a wrong emergency or station number is unsafe.
- Automatic calling after speech recognition: rejected because user confirmation is necessary and browsers restrict unsolicited call navigation.
