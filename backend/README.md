# Backend

## 本地启动

1. 安装依赖

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
```

2. 启动依赖（可选）

```bash
docker compose up -d
```

3. 数据库迁移

```bash
alembic upgrade head
```

4. 启动 API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

5. 启动 Celery worker

```bash
celery -A app.tasks.celery_app.celery_app worker -l info
```

6. 启动 Celery beat

```bash
celery -A app.tasks.celery_app.celery_app beat -l info
```

## 健康检查

- GET /healthz
- GET /readyz
