import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import health, trips, itineraries, recommendations, shares, auth, history, routes
from app.services.ai.base import LLMProviderError as BaseLLMProviderError
from app.core.exceptions import AppException, LLMProviderError as CoreLLMProviderError

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Production-ready backend API for the Personalized Travel Itinerary Planner. "
        "Supports multi-provider AI generation (Groq, Hugging Face, Ollama), "
        "Supabase Auth & PostgreSQL RLS, day-level schedule editing, PDF exports, and secure sharing."
    ),
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic Request Timing Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

# Helper for consistent CORS headers on error responses
def _cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin", "*")
    return {
        "Access-Control-Allow-Origin": origin if origin else "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }

# Custom Exception Handlers
@app.exception_handler(BaseLLMProviderError)
@app.exception_handler(CoreLLMProviderError)
async def handle_llm_provider_error(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "error": "AIProviderError",
            "message": str(exc),
            "detail": "The AI provider encountered an error generating recommendations. Please retry."
        },
        headers=_cors_headers(request)
    )

@app.exception_handler(AppException)
async def handle_app_exception(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details
        },
        headers=_cors_headers(request)
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.getLogger("uvicorn.error").exception("Unhandled error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": exc.__class__.__name__,
            "message": str(exc),
            "detail": "An internal server error occurred. Please retry."
        },
        headers=_cors_headers(request)
    )

# Include Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(trips.legacy_router)
app.include_router(itineraries.router)
app.include_router(recommendations.router)
app.include_router(shares.router)
app.include_router(history.router)
app.include_router(routes.router)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs_url": "/docs",
        "health_url": "/health"
    }
