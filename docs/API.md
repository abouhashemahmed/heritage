# Our Arab Heritage API

This document provides a complete overview of the backend RESTful API for Our Arab Heritage.  
Authentication is required for protected routes. All data is returned in JSON format.

---

## 🛍️ Products

### `GET /products`
Returns all products. Supports optional filtering and pagination.

**Query Parameters:**
- `country` (optional): Filter by country.
- `page` (optional): Page number (default: 1).
- `limit` (optional): Results per page (default: 20).

**Response:**
```json
[
  {
    "id": "string",
    "title": "string",
    "description": "string",
    "price": 9.99,
    "images": ["string"],
    "country": "Palestine"
  }
]
