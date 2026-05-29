# Schemas define the exact shape of request and response data.

from pydantic import BaseModel, EmailStr, field_validator
import re

class RegisterRequest(BaseModel):
    # Organization details
    company_name: str
    company_slug: str

    # First admin user details
    first_name: str
    last_name: str
    email: EmailStr
    password: str

    @field_validator("password")
    def password_strength(cls, v):
        """
        Enforce strong passwords:
        - At least 8 characters
        - At least one uppercase letter
        - At least one number
        - At least one special character
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("company_slug")
    def slug_format(cls, v):
        """Slug must be lowercase letters, numbers, hyphens only"""
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("Slug must be lowercase letters, numbers, and hyphens only")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    message: str
    user_id: str
    org_id: str
    role: str

class RefreshResponse(BaseModel):
    message: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain special character")
        return v