import requests
from typing import Any
from pathlib import Path
import json
import logging  

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def write_json_file(
        data: Any,
        file_path: str = "partner_operations.json",
        indent: int = 4,
        ensure_ascii: bool = False,
        create_dirs: bool = True
) -> bool:
    """
    Write Python object to JSON file with error handling.

    Args:
        data: Python object to write (dict, list, etc.)
        file_path: Path to the output JSON file
        indent: Number of spaces for indentation (None for compact)
        ensure_ascii: If False, non-ASCII characters are preserved
        create_dirs: If True, create parent directories if they don't exist

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Convert to Path object for easier manipulation
        path = Path(file_path)

        # Create parent directories if needed
        if create_dirs and path.parent != Path('.'):
            path.parent.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created directory: {path.parent}")

        # Write to file with atomic operation (write to temp, then rename)
        temp_path = path.with_suffix('.tmp')

        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=indent, ensure_ascii=ensure_ascii)

        # Atomic rename (replaces existing file)
        temp_path.replace(path)

        logger.info(f"Successfully wrote JSON to: {file_path}")
        return True

    except TypeError as e:
        logger.error(f"Data is not JSON serializable: {e}")
        return False

    except PermissionError as e:
        logger.error(f"Permission denied writing to {file_path}: {e}")
        return False

    except OSError as e:
        logger.error(f"OS error writing to {file_path}: {e}")
        return False

    except Exception as e:
        logger.error(f"Unexpected error writing JSON to {file_path}: {e}")
        return False

def fetch_didox_documents(
    user_key: str,
    partner_token: str,
    base_url: str = "https://api2.didox.uz/v2",
    **filters
) -> dict:
    """
    Fetch documents from the Didox integrators API.

    Args:
        user_key (str): Your user-key token (auth).
        partner_token (str): Partner token for Partner-Authorization.
        base_url (str): Base API endpoint. Default is production base URL.
        **filters: Optional query filters (owner, page, limit, dates, etc.)

    Returns:
        dict: Parsed JSON response of documents.
    """
    url = f"{base_url}/documents"
    headers = {
        "user-key": user_key,
        "Partner-Authorization": partner_token,
        "Accept": "application/json"
    }
    
    # Send GET request with optional query parameters
    response = requests.get(url, headers=headers, params=filters)
    response.raise_for_status()  # Raise exception for HTTP errors

    return response.json()

# Example usage:
if __name__ == "__main__":
    USER_KEY = "bd545ed6-482c-4a66-901d-d198b323859d"
    PARTNER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwic3RhdHVzIjoiQUNUSVZFIiwibmFtZSI6IkRpZG94IiwiaWF0IjoxNjYwMDQ4NzE4fQ.mq9-3Oh2zw7epPhytcqD1YxhstY2Ge3VhMurhderD28"

    # Example filters (owner=1 outgoing docs, page=1, limit=10)
    documents = fetch_didox_documents(
        USER_KEY,
        PARTNER_TOKEN,
        owner=1,
        page=1,
        limit=1000
    )

    print(documents)
    write_json_file(documents, "documents.json")
