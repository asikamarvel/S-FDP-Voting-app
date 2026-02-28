"""
Entry point for Railway deployment.
This file is detected by Railpack and starts the FastAPI backend.
"""
import os
import sys

# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Import and re-export the FastAPI app
from app.main import app

# This allows: uvicorn main:app
__all__ = ['app']
