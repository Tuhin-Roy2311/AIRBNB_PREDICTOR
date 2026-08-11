from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    predictions = relationship("PredictionLog", back_populates="user")


class PredictionLog(Base):
    """Optional: keep a record of every prediction a user makes."""
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    latitude = Column(Float)
    longitude = Column(Float)
    price = Column(Float)
    minimum_nights = Column(Integer)
    number_of_reviews = Column(Integer)
    reviews_per_month = Column(Float)
    calculated_host_listings_count = Column(Integer)
    availability_365 = Column(Integer)
    neighbourhood_group = Column(String)
    neighbourhood = Column(String)

    predicted_room_type = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="predictions")