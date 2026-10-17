FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ backend/
COPY ml/ ml/
COPY models/ models/
COPY data/processed/ data/processed/
COPY reports/ reports/
ENV DB_PATH=/app/runtime/scamradar.db MODEL_PATH=/app/models/model.joblib
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
