# --- ?tape 1 : construction de l'interface React ---
FROM node:22-slim AS interface
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- ?tape 2 : serveur Python (API + interface compil?e) ---
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 MPLBACKEND=Agg
WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/app backend/app
# Seul le fichier PAM nettoy? est n?cessaire au fonctionnement (les fichiers bruts restent dans le d?p?t, hors image).
COPY data/processed/wfp_prices_clean.csv data/processed/wfp_prices_clean.csv
COPY --from=interface /app/frontend/dist frontend/dist

EXPOSE 8000
# Les h?bergeurs fournissent le port dans la variable PORT.
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
