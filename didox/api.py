import aiohttp
import json
import asyncio

from fastapi import HTTPException
import logging

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from backend.config import DIDOX_BASE_URL, PARTNER_TOKEN, DIDOX_PARTNER_BASE_URL
from didox.utils import write_json_file

logger = logging.getLogger(__name__)

async def didox_async_api_request(
                                    endpoint: str, 
                                    request_data: dict | list = None,
                                    user_key: str | None = None,
                                    base_url: str = DIDOX_BASE_URL, 
                                    partner_auth: str = PARTNER_TOKEN,
                                    timeout_seconds: int = 60,
                                    method: str = "GET"
                                ) -> dict:
    """
    Make an asynchronous request to the Didox API.
    Based on working test.py implementation.

    Parameters:
        endpoint (str): The specific API endpoint to call (e.g., "documents").
        request_data (dict | list): Query parameters for GET requests or body data for POST requests.
        user_key (str | None): User key token for authentication.
        base_url (str): Base URL of the API (default: DIDOX_BASE_URL).
        partner_auth (str): Partner authorization token.
        timeout_seconds (int): Timeout in seconds (default: 60).
        method (str): HTTP method - "GET" or "POST" (default: "GET").
    Returns:
        dict: The API response.

    Raises:
        HTTPException: For various API errors including timeouts, client errors, and non-200 status codes.
    """
    # Construct full URL - matching test.py format: f"{base_url}/documents"
    endpoint = endpoint.lstrip('/')
    base_url = base_url.rstrip('/')
    full_url = f"{base_url}/{endpoint}"
    logger.info(f"Making {method} request to: {full_url}")

    # Headers matching test.py format and order
    headers = {
        "user-key": user_key,
        "Partner-Authorization": partner_auth,
        "Accept": "application/json"
    }

    # Create timeout configuration
    timeout = aiohttp.ClientTimeout(total=timeout_seconds)

    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            if method.upper() == "GET":
                # For GET requests, use params (query parameters) - matching test.py
                async with session.get(
                        full_url,
                        headers=headers,
                        params=request_data if request_data else None
                ) as response:
                    # Check if response is successful (equivalent to raise_for_status())
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"Successfully received response from {full_url}")
                        return data
                    else:
                        error_text = await response.text()
                        logger.error(f"API returned status {response.status}: {error_text[:500]}")
                        raise HTTPException(
                            status_code=502,
                            detail=f"{full_url} returned status code {response.status}: {error_text[:500]}"
                        )
            else:
                # For POST requests, use json body
                async with session.post(
                        full_url,
                        headers=headers,
                        json=request_data if request_data else None
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"Successfully received response from {full_url}")
                        return data
                    else:
                        error_text = await response.text()
                        logger.error(f"API returned status {response.status}: {error_text[:500]}")
                        raise HTTPException(
                            status_code=502,
                            detail=f"{full_url} returned status code {response.status}: {error_text[:500]}"
                        )

    except asyncio.TimeoutError:
        logger.error(f"Request timed out after {timeout_seconds} seconds")
        raise HTTPException(
            status_code=504,
            detail=f"{full_url} request timed out after {timeout_seconds} seconds"
        )
    except aiohttp.ClientError as e:
        logger.error(f"Client error occurred: {str(e)}")
        raise HTTPException(
            status_code=502,
            detail=f"{full_url} client error: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"{full_url} error: {str(e)}"
        )

if __name__ == "__main__": 
    user_key = "e016e3ce-2a18-47f6-a8d7-236ce034bee6"
    result = asyncio.run(didox_async_api_request(
        endpoint="documents?partner=Regos", user_key=user_key))
    print(result)
    write_json_file(result, "test.json")