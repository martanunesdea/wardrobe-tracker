"""
Shared test fixtures.
Creates a temporary SQLite database and a Flask test client for each test.
"""

import os
import sys
import tempfile
import pytest

# Make backend packages importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["FLASK_DEBUG"] = "true"


@pytest.fixture()
def app(tmp_path):
    import models.database as db_mod

    db_file = str(tmp_path / "test.db")
    db_mod.DB_PATH = db_file

    from server import create_app
    application = create_app()
    application.config["TESTING"] = True

    yield application


@pytest.fixture()
def client(app):
    return app.test_client()
