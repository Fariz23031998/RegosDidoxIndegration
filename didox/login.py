import base64
import asyncio
import sys
from pathlib import Path
import httpx

sys.path.append(str(Path(__file__).parent.parent))

from didox.eimzo import eimzo_pkcs7_timestamp
from backend.config import DIDOX_PARTNER_BASE_URL

async def didox_timestamp(pkcs7_64: str, signature_hex: str, base_url: str = DIDOX_PARTNER_BASE_URL):
    """
    Calls the Didox timestamp API to attach a TSA timestamp.
    """
    url = f"{base_url}/dsvs/timestamp"
    body = {
        "pkcs7": pkcs7_64,
        "signatureHex": signature_hex
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=body)
        resp.raise_for_status()
        data = resp.json()
        ts_token = data.get("timeStampTokenB64")
        if not ts_token:
            raise RuntimeError("Timestamp failed")
        return ts_token

async def didox_login_company(tax_id: str, ts_token_b64: str, base_url: str = DIDOX_PARTNER_BASE_URL, locale: str="ru"):
    """
    Logs in using company Tax ID and the timestamped signature.
    Returns the auth token.
    """
    url = f"{base_url}/auth/{tax_id}/token/{locale}"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json={"signature": ts_token_b64})
        resp.raise_for_status()
        return resp.json()

# ----------------
# END-TO-END FUNCTION
# ----------------

async def login_with_eimzo(tax_id: str, origin: str, base_url: str = DIDOX_PARTNER_BASE_URL, locale: str="ru", cert_index: int = 0):
    """
    Full flow:
    1) Base64 encode INN
    2) Sign and timestamp via E-IMZO
    3) Call Didox token endpoint
    
    Args:
        tax_id: Company Tax ID (INN)
        origin: Origin header for WebSocket connection
        base_url: Didox API base URL
        locale: Locale (default: "ru")
        cert_index: Index of certificate to use (default: 0)
    """
    # Convert INN to base64
    inn_b64 = base64.b64encode(tax_id.encode()).decode()

    # Sign & get timestamp (await the async function)
    pkcs7, sig_hex = await eimzo_pkcs7_timestamp(inn_b64, origin, cert_index)

    # Request timestamp (await the async function)
    ts_token = await didox_timestamp(pkcs7, sig_hex, base_url)

    # Login to get token (await the async function)
    return await didox_login_company(tax_id, ts_token, base_url, locale)

if __name__ == "__main__":
    # BASE_URL = "https://api-partners.didox.uz"  # or production
    ORIGIN   = "https://localhost"
    TAX_ID   = "306691996"  # your company INN

    result = asyncio.run(login_with_eimzo(TAX_ID, ORIGIN, locale="ru"))
    print("Auth Token:", result)