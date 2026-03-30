FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    ffmpeg \
    xdotool \
    x11-utils \
    libgl1 \
    libglu1-mesa \
    libxcursor1 \
    libxrandr2 \
    libxi6 \
    livasound2t64 \
    libpulse0 \
    libsdl2-2.0-0 \
    libsdl2-image-2.0-0 \
    libsdl2-mixer-2.0-0 \
    libsdl2-ttf-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 9000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:9000/health')" || exit 1

CMD [ "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000" ]