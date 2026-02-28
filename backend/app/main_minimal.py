"""Minimal test app to verify Railway can run FastAPI"""
from fastapi import FastAPI

app = FastAPI(title="Test")

@app.get("/")
async def root():
    return {"message": "Hello from minimal app"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
