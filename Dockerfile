FROM python:3.12-slim
WORKDIR /app

# 1) CPU-only torch first (small; avoids the ~2 GB GPU build)
RUN pip install --no-cache-dir torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu

# 2) The rest of the packages (torch is already satisfied)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3) Bake the public e5-small model into the image, so the container needs no internet at runtime
ENV E5_MODEL=/app/e5-small
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small').save('/app/e5-small')"

# 4) App code, trained model, data for the drift demo
COPY backend/ backend/
COPY ml/ ml/
COPY models/ models/
COPY data/processed/ data/processed/
COPY reports/ reports/

ENV DB_PATH=/app/runtime/scamradar.db MODEL_PATH=/app/models/model.joblib
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]