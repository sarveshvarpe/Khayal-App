FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# HF Spaces uses port 7860, local uses 8000
ENV PORT=7860
EXPOSE $PORT

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
