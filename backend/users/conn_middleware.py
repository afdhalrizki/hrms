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
        print(f"DEBUG: ConnectionResetMiddleware - Start. Connection Schema: {connection.schema_name}")
        # Reset search_path to include public
        with connection.cursor() as cursor:
            cursor.execute('SET search_path TO "public"')
        
        # Also reset the connection's internal tenant state to public
        connection.set_schema_to_public()
        print(f"DEBUG: ConnectionResetMiddleware - Reset complete.")
        
        return self.get_response(request)
