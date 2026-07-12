class BusinessRuleError(Exception):
    """Raised when a request violates a TransitOps business rule (maps to HTTP 409)."""
