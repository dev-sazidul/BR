FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    U2NET_HOME=/models \
    REMOVER_HOST=0.0.0.0 \
    REMOVER_PORT=8001

RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /models \
    && chown appuser:appuser /models

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY background_remover.py .

USER appuser
EXPOSE 8001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health', timeout=4)"
CMD ["python", "background_remover.py"]
