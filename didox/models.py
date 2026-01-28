from typing import Optional
from pydantic import BaseModel


class CertificateInfo(BaseModel):
    disk: str
    path: str
    name: str
    alias: str
    index: int
    cn: Optional[str] = None  # Common Name if available
    serial: Optional[str] = None  # Serial number if available


class LoginRequest(BaseModel):
    cert_index: Optional[int] = 0


class DocumentFilter(BaseModel):
    document_type: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    page: int = 1
    limit: int = 20