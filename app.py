"""
Career Interview Platform — FastAPI Backend
============================================
Endpoints:
  GET  /                            → Serve index.html
  GET  /api/questions               → Return all questions (full JSON)
  GET  /api/questions/{company}/{domain} → Return questions for a company + domain
  POST /api/questions               → Add a new question to the JSON store

Static files are served from the `static/` directory under the /static path,
and index.html is served at the root so the SPA handles all client routing.
"""

import json
import os
from datetime import date

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

# ---------------------------------------------------------------------------
# App initialisation
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Career Interview Platform API",
    description="A platform to browse and contribute interview questions by company and domain.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins for local dev + Vercel preview URLs
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------
BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
DATA_FILE: str = os.path.join(BASE_DIR, "data", "questions.json")
STATIC_DIR: str = os.path.join(BASE_DIR, "static")

# ---------------------------------------------------------------------------
# Mount static assets (CSS, JS) at /static
# ---------------------------------------------------------------------------
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ---------------------------------------------------------------------------
# Pydantic model for incoming question payload
# ---------------------------------------------------------------------------
class QuestionCreate(BaseModel):
    company: str
    domain: str
    role_applied_for: str
    question: str
    difficulty: str

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Question text cannot be empty.")
        return value.strip()

    @field_validator("role_applied_for")
    @classmethod
    def role_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Role applied for cannot be empty.")
        return value.strip()

    @field_validator("difficulty")
    @classmethod
    def difficulty_valid(cls, value: str) -> str:
        if value not in ("Easy", "Medium", "Hard"):
            raise ValueError("Difficulty must be one of: Easy, Medium, Hard.")
        return value

    @field_validator("company")
    @classmethod
    def company_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Company cannot be empty.")
        return value.strip()

    @field_validator("domain")
    @classmethod
    def domain_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Domain cannot be empty.")
        return value.strip()


# ---------------------------------------------------------------------------
# Helper — read / write JSON
# ---------------------------------------------------------------------------
def _load_questions() -> dict:
    """Load and return the full questions dictionary from disk."""
    with open(DATA_FILE, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _save_questions(data: dict) -> None:
    """Persist the questions dictionary to disk."""
    with open(DATA_FILE, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
def serve_index():
    """Serve the single-page frontend application."""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="index.html not found.")
    return FileResponse(index_path, media_type="text/html")


@app.get("/api/questions", summary="Get all questions")
def get_all_questions():
    """
    Return the complete questions database structured as:
    { "EY": { "Audit": [...], ... }, ... }
    """
    data = _load_questions()
    return JSONResponse(content={"data": data, "success": True})


@app.get("/api/questions/{company}/{domain}", summary="Get questions by company and domain")
def get_questions_by_company_domain(company: str, domain: str):
    """
    Return all questions for a specific company + domain combination.
    Returns an empty list (not 404) when the pair exists but has no questions,
    so the frontend can still render the empty-state UI.
    """
    data = _load_questions()

    if company not in data:
        return JSONResponse(
            content={
                "company": company,
                "domain": domain,
                "questions": [],
                "count": 0,
                "success": True,
            }
        )

    if domain not in data[company]:
        return JSONResponse(
            content={
                "company": company,
                "domain": domain,
                "questions": [],
                "count": 0,
                "success": True,
            }
        )

    questions = data[company][domain]
    return JSONResponse(
        content={
            "company": company,
            "domain": domain,
            "questions": questions,
            "count": len(questions),
            "success": True,
        }
    )


@app.post("/api/questions", summary="Add a new interview question", status_code=201)
def add_question(payload: QuestionCreate):
    """
    Add a new question under the given company + domain.
    - Automatically stamps today's date as `date_added`.
    - Creates the company and/or domain entry dynamically if they do not exist.
    - Returns the newly created question object.
    """
    data = _load_questions()

    # Dynamically create company entry if it does not exist
    if payload.company not in data:
        data[payload.company] = {}

    # Dynamically create domain entry if it does not exist
    if payload.domain not in data[payload.company]:
        data[payload.company][payload.domain] = []

    new_question: dict = {
        "question": payload.question,
        "difficulty": payload.difficulty,
        "date_added": str(date.today()),
        "role_applied_for": payload.role_applied_for,
    }

    data[payload.company][payload.domain].append(new_question)
    _save_questions(data)

    return JSONResponse(
        status_code=201,
        content={
            "success": True,
            "message": "Question added successfully.",
            "question": new_question,
        },
    )


# ---------------------------------------------------------------------------
# Catch-all → serve index.html so the SPA handles its own routes
# ---------------------------------------------------------------------------
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """For any unmatched route, return the SPA entry-point."""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    return JSONResponse(status_code=404, content={"detail": "Not found."})

