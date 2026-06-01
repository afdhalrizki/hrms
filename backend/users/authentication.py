from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        # Bypass CSRF checks for SessionAuthentication to avoid issues 
        # when session cookies exist in the browser but requests are stateless.
        return
