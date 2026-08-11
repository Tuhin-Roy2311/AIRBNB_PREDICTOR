from sqlalchemy.orm import Session

import models
import schemas


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, email: str, hashed_password: str) -> models.User:
    user = models.User(email=email, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_predictions_for_user(db: Session, user_id: int, limit: int = 100):
    return (
        db.query(models.PredictionLog)
        .filter(models.PredictionLog.user_id == user_id)
        .order_by(models.PredictionLog.created_at.desc())
        .limit(limit)
        .all()
    )


def log_prediction(
    db: Session,
    features: schemas.Features,
    predicted_room_type: str,
    user_id: int | None,
) -> models.PredictionLog:
    entry = models.PredictionLog(
        user_id=user_id,
        predicted_room_type=predicted_room_type,
        **features.dict(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry