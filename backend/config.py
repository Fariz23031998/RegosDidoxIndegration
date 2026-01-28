import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
DIDOX_BASE_URL = os.getenv("DIDOX_BASE_URL", "https://api2.didox.uz/v2")
ORIGIN = os.getenv("ORIGIN", "http://localhost:5173")
TAX_ID = os.getenv("TAX_ID", "")
PARTNER_TOKEN = os.getenv("PARTNER_TOKEN", "")
DIDOX_PARTNER_BASE_URL = os.getenv("DIDOX_PARTNER_BASE_URL", "https://api-partners.didox.uz/v1")
REGOS_TOKEN = os.getenv("REGOS_TOKEN", "")