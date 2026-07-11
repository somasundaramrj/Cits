import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from app.models import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserPublic
from app.database import UsersRepo
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token_type,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer_scheme = HTTPBearer()


def _generate_vehicle_id(vehicle_type: str) -> str:
    prefix = {"Car": "CAR", "Bike": "BIK", "Truck": "TRK", "Bus": "BUS", "Emergency": "EMG"}.get(
        vehicle_type, "VEH"
    )
    return f"{prefix}{uuid.uuid4().hex[:6].upper()}"


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    existing = await UsersRepo.find_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    vehicle_id = _generate_vehicle_id(payload.vehicle_type.value)

    user_doc = {
        "email": payload.email,
        "full_name": payload.full_name,
        "phone_number": payload.phone_number,
        "date_of_birth": payload.date_of_birth.isoformat(),
        "vehicleId": vehicle_id,
        "vehicle_registration_number": payload.vehicle_registration_number,
        "vehicle_type": payload.vehicle_type.value,
        "vehicle_brand": payload.vehicle_brand,
        "vehicle_model": payload.vehicle_model,
        "vehicle_color": payload.vehicle_color,
        "manufacturing_year": payload.manufacturing_year,
        "driving_license_number": payload.driving_license_number,
        "license_expiry_date": payload.license_expiry_date.isoformat(),
        "emergency_contact_name": payload.emergency_contact_name,
        "emergency_contact_number": payload.emergency_contact_number,
        "password_hash": hash_password(payload.password),
        "role": payload.role.value,
        "account_status": "active",
        "registered_at": datetime.now(timezone.utc),
    }

    await UsersRepo.insert(user_doc)

    return UserPublic(
        vehicle_id=vehicle_id,
        full_name=user_doc["full_name"],
        vehicle_type=user_doc["vehicle_type"],
        vehicle_brand=user_doc["vehicle_brand"],
        vehicle_model=user_doc["vehicle_model"],
        role=user_doc["role"],
        account_status=user_doc["account_status"],
        registered_at=user_doc["registered_at"],
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request):
    user = await UsersRepo.find_by_email(payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("account_status") != "active":
        raise HTTPException(status_code=403, detail="Account is not active")

    access_token = create_access_token(user["email"])
    refresh_token = create_refresh_token(user["email"])

    await UsersRepo.record_login(user["email"], time.time(), request.client.host if request.client else None)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        vehicle_id=user["vehicleId"],
        full_name=user["full_name"],
        role=user["role"],
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest):
    try:
        decoded = decode_token(payload.refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if not verify_token_type(decoded, "refresh"):
        raise HTTPException(status_code=401, detail="Not a refresh token")

    email = decoded["sub"]
    user = await UsersRepo.find_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")

    return TokenResponse(
        access_token=create_access_token(email),
        refresh_token=create_refresh_token(email),
        vehicle_id=user["vehicleId"],
        full_name=user["full_name"],
        role=user["role"],
    )


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = creds.credentials
    try:
        decoded = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not verify_token_type(decoded, "access"):
        raise HTTPException(status_code=401, detail="Not an access token")

    user = await UsersRepo.find_by_email(decoded["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


@router.get("/me", response_model=UserPublic)
async def me(user=Depends(get_current_user)):
    return UserPublic(
        vehicle_id=user["vehicleId"],
        full_name=user["full_name"],
        vehicle_type=user["vehicle_type"],
        vehicle_brand=user["vehicle_brand"],
        vehicle_model=user["vehicle_model"],
        role=user["role"],
        account_status=user["account_status"],
        registered_at=user["registered_at"],
    )


@router.post("/logout")
async def logout(user=Depends(get_current_user)):
    # Stateless JWT: real invalidation would need a token blocklist (e.g. in
    # Redis) keyed by jti. Left as a documented extension point.
    return {"detail": "Logged out"}
