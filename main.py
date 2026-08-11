from datetime import timedelta

import joblib
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import auth
import crud
import models
import schemas
from config import settings
from database import Base, engine, get_db

# Create DB tables on startup if they don't exist yet.
# For production, prefer Alembic migrations instead of this.
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

COLUMNS = [
    "latitude", "longitude", "price", "minimum_nights",
    "number_of_reviews", "reviews_per_month",
    "calculated_host_listings_count", "availability_365",
    "neighbourhood_group", "neighbourhood",
]

model = joblib.load("Model_Pipeline.pkl")


@app.get("/")
def greet():
    return "Hello Guyss"


# ---------- Auth endpoints ----------

@app.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = auth.hash_password(user_in.password)
    user = crud.create_user(db, email=user_in.email, hashed_password=hashed)
    return user


@app.post("/token", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # form_data.username is treated as the email here
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return schemas.Token(access_token=access_token)


@app.get("/me", response_model=schemas.UserOut)
def read_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.get("/predictions", response_model=list[schemas.PredictionRecordOut])
def list_my_predictions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return crud.get_predictions_for_user(db, current_user.id)


# ---------- Prediction endpoint (now protected) ----------

@app.post("/predict", response_model=schemas.PredictionOut)
def predict(
    features: schemas.Features,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    row = pd.DataFrame([features.dict()], columns=COLUMNS)
    prediction = model.predict(row)
    probability = model.predict_proba(row)

    predicted_label = prediction[0]

    crud.log_prediction(
        db,
        features=features,
        predicted_room_type=predicted_label,
        user_id=current_user.id,
    )

    return schemas.PredictionOut(
        Predicted_room_type=predicted_label,
        Probability=probability.tolist()[0],
    )