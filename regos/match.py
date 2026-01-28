from typing import Literal

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from regos.api import regos_async_api_request
MatchType = Literal["Code", "Name", "Articul", "Barcode"]


async def match_products(match_type: MatchType, products: list[dict]) -> dict:
    """
    Match products with the REGOS API.
    
    Args:
        match_type: Type of matching - "Code", "Name", "Articul", or "Barcode"
        products: List of dictionaries with "index" (str) and "value" (str) keys
                 Maximum 250 items allowed
    
    Returns:
        dict: API response with "ok" and "result" keys
        result contains array of matching results with:
        - index: String (original index from request)
        - item_id: Int64 (REGOS item ID if found)
        - value: String (matched value)
    
    Raises:
        HTTPException: If API request fails or returns error
    """
    if len(products) > 250:
        raise ValueError("Maximum 250 products allowed per request")
    
    # Validate products structure
    for product in products:
        if "index" not in product or "value" not in product:
            raise ValueError("Each product must have 'index' and 'value' keys")
    
    request_data = {
        "type": match_type,
        "data": products
    }
    
    return await regos_async_api_request(
        endpoint="Item/Match",
        request_data=request_data
    )