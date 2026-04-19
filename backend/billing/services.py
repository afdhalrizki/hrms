import midtransclient
import hashlib
import hmac
from django.conf import settings

class MidtransService:
    def __init__(self):
        # Configuration from settings.py (managed via .env)
        self.is_production = getattr(settings, 'MIDTRANS_IS_PRODUCTION', False)
        self.server_key = getattr(settings, 'MIDTRANS_SERVER_KEY', 'SB-Mid-server-placeholder')
        self.client_key = getattr(settings, 'MIDTRANS_CLIENT_KEY', 'SB-Mid-client-placeholder')
        
        self.snap = midtransclient.Snap(
            is_production=self.is_production,
            server_key=self.server_key,
            client_key=self.client_key
        )

    def create_transaction(self, order_id, gross_amount, customer_details=None, items=None):
        """
        Creates a Snap transaction and returns the snap_token.
        """
        params = {
            "transaction_details": {
                "order_id": order_id,
                "gross_amount": int(gross_amount)
            },
            "credit_card": {
                "secure": True
            },
            "customer_details": customer_details,
            "item_details": items
        }
        transaction = self.snap.create_transaction(params)
        return transaction  # {'token': '...', 'redirect_url': '...'}

    def verify_webhook_signature(self, order_id, status_code, gross_amount, received_signature):
        """
        Verifies the signature from Midtrans webhook to prevent fraud.
        Signature = SHA512(order_id + status_code + gross_amount + ServerKey)
        """
        # Ensure gross_amount is formatted correctly (usually string or decimal with .00)
        # Midtrans standard often sends 100000.00
        if not gross_amount.endswith('.00') and '.' not in gross_amount:
             gross_amount = f"{gross_amount}.00"
             
        payload = f"{order_id}{status_code}{gross_amount}{self.server_key}"
        expected_signature = hashlib.sha512(payload.encode()).hexdigest()
        
        return hmac.compare_digest(expected_signature, received_signature)
