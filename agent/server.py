"""Agent local Desktop Tailor — FastAPI sur localhost:7420 uniquement."""
from __future__ import annotations

import hashlib
import json
import re
import secrets
import threading
import time

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

import detector
import executor
import snapshot

HOST = "127.0.0.1"
PORT = 7420
TOKEN_TTL_S = 15 * 60
ALLOWED_ORIGIN = re.compile(r"^http://localhost(:\d{1,5})?$")

app = FastAPI(title="Desktop Tailor", docs_url=None, redoc_url=None, openapi_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=ALLOWED_ORIGIN.pattern,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def origin_guard(request: Request, call_next):
    # Enregistré après CORS : s'exécute en premier, y compris pour les pré-requêtes.
    origin = request.headers.get("origin")
    if origin is not None and not ALLOWED_ORIGIN.match(origin):
        return JSONResponse({"detail": "Origine refusée"}, status_code=403)
    return await call_next(request)


# Jetons de dry-run : token -> (empreinte du profil, actions, expiration)
_tokens: dict[str, tuple[str, list[executor.Action], float, str]] = {}
_lock = threading.Lock()


def _fingerprint(profile: dict) -> str:
    return hashlib.sha256(json.dumps(profile, sort_keys=True).encode()).hexdigest()


async def _json(request: Request):
    try:
        return await request.json()
    except ValueError:
        return None


def _unsupported(detection: dict) -> bool:
    return detection["os"] == "unsupported" or detection["desktop"] == "unsupported"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/detect")
def detect():
    return detector.detect()


@app.post("/dryrun")
async def dryrun(request: Request):
    profile = await _json(request)
    errors = executor.validate_profile(profile)
    if errors:
        return JSONResponse({"detail": errors}, status_code=422)
    detection = detector.detect()
    if _unsupported(detection):
        return JSONResponse({"detail": "Système non pris en charge"}, status_code=409)
    actions = executor.build_actions(profile, detection)
    token = secrets.token_urlsafe(32)
    now = time.time()
    with _lock:
        for t in [t for t, v in _tokens.items() if v[2] < now]:
            del _tokens[t]
        _tokens[token] = (_fingerprint(profile), actions, now + TOKEN_TTL_S, detection["os"])
    return {"actions": [a.public() for a in actions], "token": token}


@app.post("/apply")
async def apply(request: Request):
    body = await _json(request)
    if not isinstance(body, dict) or not isinstance(body.get("token"), str):
        return JSONResponse({"detail": "Jeton de dry-run manquant"}, status_code=403)
    profile = body.get("profile")
    errors = executor.validate_profile(profile)
    if errors:
        return JSONResponse({"detail": errors}, status_code=422)
    with _lock:
        entry = _tokens.get(body["token"])
        if entry is None or entry[2] < time.time() or entry[0] != _fingerprint(profile):
            return JSONResponse(
                {"detail": "Jeton invalide ou expiré : relancez le dry-run"}, status_code=403
            )
        del _tokens[body["token"]]  # usage unique
    _, actions, _, _ = entry
    detection = detector.detect()
    snapshot.take(detection["desktop"])

    def stream():
        failed = False
        for line in executor.execute(actions):
            failed = failed or line["status"] == "error"
            yield json.dumps(line, ensure_ascii=False) + "\n"
        if not failed:
            snapshot.add_history(profile)

    return StreamingResponse(stream(), media_type="application/x-ndjson")


@app.post("/rollback")
def rollback():
    detection = detector.detect()
    return {"restored": snapshot.rollback(detection["os"])}


# Catch-all : doit rester APRÈS les 5 routes nommées.
@app.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    include_in_schema=False,
)
def not_found(full_path: str):
    return JSONResponse({"detail": "Introuvable"}, status_code=404)


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
