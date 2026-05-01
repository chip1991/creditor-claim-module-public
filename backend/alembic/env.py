import os
import sys

from alembic import context
from sqlalchemy import engine_from_config, pool

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import get_settings
from app.db.base import Base
from app import models as _models


config = context.config
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)
target_metadata = Base.metadata

if settings.database_url.startswith("sqlite:////"):
    db_file_path = "/" + settings.database_url.removeprefix("sqlite:////")
    os.makedirs(os.path.dirname(db_file_path), exist_ok=True)
elif settings.database_url.startswith("sqlite:///"):
    db_file_path = settings.database_url.removeprefix("sqlite:///")
    os.makedirs(os.path.dirname(db_file_path), exist_ok=True)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(config.get_section(config.config_ini_section) or {}, prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
