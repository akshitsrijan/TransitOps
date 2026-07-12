import json
from datetime import datetime

from fastapi import BackgroundTasks
from sqlmodel import Session, select

from app.database import engine
from app.models import CheckStatus, ConfidenceCheck, MaintenanceLog, Trip, Vehicle, Verdict
from app.rag import service
from app.services import next_id

_STOPWORDS = {"the", "and", "for", "with", "from", "this", "that", "replacement", "inspection", "service", "check"}


def _significant_tokens(text: str) -> set[str]:
    return {w.lower() for w in text.split() if len(w) > 3 and w.lower() not in _STOPWORDS}


def _find_prior_matching_log(session: Session, vehicle_id: str, description: str, exclude_id: str) -> MaintenanceLog | None:
    logs = session.exec(
        select(MaintenanceLog)
        .where(MaintenanceLog.vehicle_id == vehicle_id, MaintenanceLog.id != exclude_id)
        .order_by(MaintenanceLog.opened_at.desc())
    ).all()
    target_tokens = _significant_tokens(description)
    if not target_tokens:
        return None
    for log in logs:
        if target_tokens & _significant_tokens(log.description):
            return log
    return None


def _verdict_from_str(value: str) -> Verdict:
    return {"Pass": Verdict.pass_, "Fail": Verdict.fail, "Unverifiable": Verdict.unverifiable}[value]


def run_maintenance_check(maintenance_id: str) -> None:
    with Session(engine) as session:
        log = session.get(MaintenanceLog, maintenance_id)
        if not log:
            return
        check = ConfidenceCheck(id=next_id("cc"), entity_type="maintenance", entity_id=maintenance_id)
        try:
            prior = _find_prior_matching_log(session, log.vehicle_id, log.description, exclude_id=maintenance_id)
            delta_km = (log.odometer_km_at_open - prior.odometer_km_at_open) if prior else None
            query = f"{log.description} maintenance service interval schedule replace"
            result = service.score_against_interval(query, delta_km, "km")
            check.status = CheckStatus.complete
            check.confidence = result.confidence
            check.verdict = _verdict_from_str(result.verdict)
            check.rationale = result.rationale
            check.citations = json.dumps(result.citations)
            check.completed_at = datetime.utcnow()
        except Exception as exc:  # keep advisory checks from ever surfacing as user-facing errors
            check.status = CheckStatus.error
            check.rationale = f"Confidence check failed: {exc}"
        session.add(check)
        session.commit()


def run_trip_check(trip_id: str) -> None:
    with Session(engine) as session:
        trip = session.get(Trip, trip_id)
        if not trip:
            return
        check = ConfidenceCheck(id=next_id("cc"), entity_type="trip", entity_id=trip_id)
        try:
            vehicle = session.get(Vehicle, trip.vehicle_id)
            vehicle_type = vehicle.type if vehicle else ""
            query = (
                f"{trip.cargo_weight_kg} kg cargo, {vehicle_type} vehicle, route from {trip.source} to "
                f"{trip.destination}, cargo handling loading special hazardous oversized"
            )
            result = service.score_relevance_only(query)
            check.status = CheckStatus.complete
            check.confidence = result.confidence
            check.verdict = _verdict_from_str(result.verdict)
            check.rationale = result.rationale
            check.citations = json.dumps(result.citations)
            check.completed_at = datetime.utcnow()
        except Exception as exc:
            check.status = CheckStatus.error
            check.rationale = f"Confidence check failed: {exc}"
        session.add(check)
        session.commit()


def queue_maintenance_check(background_tasks: BackgroundTasks, maintenance_id: str) -> None:
    background_tasks.add_task(run_maintenance_check, maintenance_id)


def queue_trip_check(background_tasks: BackgroundTasks, trip_id: str) -> None:
    background_tasks.add_task(run_trip_check, trip_id)
