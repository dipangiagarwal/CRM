import hmac
import hashlib
import json
import requests

WEBHOOK_SECRET = "test_webhook_secret"
SERVER_URL = "http://localhost:8000"
ORG_ID = "511ab2cd-ef30-43bd-9234-84e681c070cc"
ORDER_ID = "order_SuGxYJDJTwpelp"

payload = {
    "event": "payment.captured",
    "payload": {
        "payment": {
            "entity": {
                "id": "pay_test123456",
                "order_id": ORDER_ID,
                "amount": 29900,
                "notes": {
                    "tenant_id": ORG_ID,
                    "plan": "starter"
                }
            }
        }
    }
}

body = json.dumps(payload).encode()

signature = hmac.new(
    WEBHOOK_SECRET.encode(),
    body,
    hashlib.sha256
).hexdigest()

response = requests.post(
    f"{SERVER_URL}/api/v1/webhooks/razorpay",
    data=body,
    headers={
        "Content-Type": "application/json",
        "X-Razorpay-Signature": signature
    }
)

print("Status:", response.status_code)
print("Response:", response.json())

