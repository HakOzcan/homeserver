"""
@file env.py
@brief Alembic environment configuration for database migrations.
@details This file is executed by Alembic every time a migration command is run
         (e.g. `alembic upgrade head`, `alembic revision --autogenerate`).
         It tells Alembic:
         1. Where the database is (connection URL)
         2. What the models look like (metadata) so it can detect changes
         3. How to run migrations (offline mode for SQL scripts, online mode for live DB)
"""

from logging.config import fileConfig
import sys
import os
from sqlalchemy import engine_from_config, pool
from alembic import context

"""
@brief Add the backend directory to Python's import path.
@details Without this, Python can't find `app.code.config` or `app.db.models`
         because Alembic runs from the `backend/` directory but doesn't
         automatically know about our package structure.
"""
sys.path.insert(0, os.path.join(os.path.dirname(___file___), ".."))

from app.core.config import settings
from app.db.database import Base
from app.db import models # noqa - importing models registers them on Base.metadata

## @brief Alembic's config object - provides access to alembic.ini values.
config = context.config

"""
@brief Override the sqlalchemy.url from alembic.ini with our real DATABASE_URL.
@details This way we don't duplicate the connection string in two places.
         The single source of truth remains our .env file -> config.py -> here.
"""
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

## @brief Set up Python logging from alembic.ini's [loggers] section.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


"""
@brief The MetaData object that holds all our model definitions.
@details Alembic compares this metadata against the actual database schema
         to auto-detect what changed (new tables, new columns, etc.)
         when you run `alembic revision --autogenerate`.
"""
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """
    @brief Run migrations in 'ofline' mode - generates SQL without connecting.
    @details Useful for producing migration SQL scripts to review or apply manually.
             No database connection is created; SQL is emitted to stdout or a file.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """
    @brief Run migrations in 'online' mode - connects to DB and paplies changes directly.
    @details This is the normal mode used by `alembic upgrade head`.
             Creates an engine, opens a connection, and runs all pending migrations
             inside a transaction (so if something fails, it rolls back cleanly).
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

## @brief Entry point - Alembic checks which mode to run in and calls the right function.
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
