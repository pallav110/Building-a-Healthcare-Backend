FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV SECRET_KEY=build-time-placeholder
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "healthcare.wsgi:application", "--bind", "0.0.0.0:8000"]
