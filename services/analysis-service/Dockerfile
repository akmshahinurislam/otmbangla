# Use Python 3.10 slim for a fast and light build
FROM python:3.10-slim

# Set system env variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies if any are needed (e.g., build-essential, git)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy microservice code
COPY . .

# Expose port 8000
EXPOSE 8000

# Start Uvicorn bound to 0.0.0.0 so it's accessible from host
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
