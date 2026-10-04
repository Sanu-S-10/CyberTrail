"""
backend/app/main.py
FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.routers import cases

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Cyber Fraud Money Trail Analyzer API (env=%s)", settings.app_env)
    yield
    logger.info("Shutting down API")


app = FastAPI(
    title="CyberTrail — Money Trail Analyzer",
    description=(
        "Investigation support tool for analysing financial fraud transaction trails. "
        "THIS IS NOT A CRIMINAL ACCUSATION TOOL — all data is investigative only."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.is_development else None,
    redoc_url="/api/redoc" if settings.is_development else None,
)

# CORS — restrict to configured origins only
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Request-ID"],
)

# Register routers
app.include_router(cases.router, prefix="/api")


@app.get("/api/health", tags=["health"])
async def health_check():
    return {"status": "ok", "env": settings.app_env, "version": "0.1.0"}


# Global exception handler — never expose raw stack traces
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again or contact support.",
            "path": str(request.url.path),
        },
    )
