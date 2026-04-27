from django.db import connection

class ConnectionResetMiddleware:
    """
    Ensures that every request starts with the 'public' schema in the search_path.
    This prevents UndefinedTable errors for shared models (like tenants.Domain)
    if a persistent connection was left pointing to a tenant schema.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Force connection reset to public schema at the start of every request
        from django.db import connection
        connection.set_schema_to_public()
        return self.get_response(request)
