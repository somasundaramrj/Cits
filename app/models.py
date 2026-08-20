from datetime import date, datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class VehicleType(str, Enum):
    car = "Car"
    bike = "Bike"
    truck = "Truck"
    bus = "Bus"
    emergency = "Emergency"


class Role(str, Enum):
    admin = "admin"
    driver = "driver"
    operator = "operator"


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: str
    date_of_birth: date

    vehicle_registration_number: str
    vehicle_type: VehicleType
    vehicle_brand: str
    vehicle_model: str
    vehicle_color: str
    manufacturing_year: int

    driving_license_number: str
    license_expiry_date: date

    emergency_contact_name: str
    emergency_contact_number: str

    password: str = Field(min_length=8)
    role: Role = Role.driver


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    vehicle_id: str
    full_name: str
    role: Role


class RefreshRequest(BaseModel):
    refresh_token: str


class UserPublic(BaseModel):
    vehicle_id: str
    full_name: str
    vehicle_type: VehicleType
    vehicle_brand: str
    vehicle_model: str
    role: Role
    account_status: str
    registered_at: datetime


class VehicleUpdate(BaseModel):
    """Payload a client sends over the WebSocket, matching the spec's packet."""
    vehicleId: str
    vehicleType: str
    latitude: float
    longitude: float
    speed: float = 0
    heading: float = 0
    acceleration: float = 0
    brake: bool = False
    timestamp: float
