import json

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import ConfidenceCheck
from app.rag import service
from app.schemas import CamelModel

router = APIRouter(prefix="/api/rag", tags=["rag"])


class ConfidenceCheckRead(CamelModel):
    id: str
    entity_type: str
    entity_id: str
    status: str
    confidence: float | None
    verdict: str | None
    rationale: str | None
    citations: list[str]

    @classmethod
    def from_row(cls, row: ConfidenceCheck) -> "ConfidenceCheckRead":
        return cls(
            id=row.id,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            status=row.status.value,
            confidence=row.confidence,
            verdict=row.verdict.value if row.verdict else None,
            rationale=row.rationale,
            citations=json.loads(row.citations) if row.citations else [],
        )


class ValidateRequest(CamelModel):
    query: str


class ValidateResponse(CamelModel):
    confidence: float
    verdict: str
    rationale: str
    citations: list[str]


@router.get("/checks/{entity_type}/{entity_id}", response_model=list[ConfidenceCheckRead])
def get_checks(
    entity_type: str, entity_id: str, session: Session = Depends(get_session), _=Depends(get_current_user)
) -> list[ConfidenceCheckRead]:
    rows = session.exec(
        select(ConfidenceCheck)
        .where(ConfidenceCheck.entity_type == entity_type, ConfidenceCheck.entity_id == entity_id)
        .order_by(ConfidenceCheck.created_at.desc())
    ).all()
    return [ConfidenceCheckRead.from_row(r) for r in rows]


@router.post("/validate", response_model=ValidateResponse)
def validate(payload: ValidateRequest, _=Depends(get_current_user)) -> ValidateResponse:
    """On-demand, ad-hoc grounding check against the policy corpus. Relevance-only
    (no numeric rule comparison) since there's no structured entity/field context here."""
    result = service.score_relevance_only(payload.query)
    return ValidateResponse(
        confidence=result.confidence, verdict=result.verdict, rationale=result.rationale, citations=result.citations
    )
