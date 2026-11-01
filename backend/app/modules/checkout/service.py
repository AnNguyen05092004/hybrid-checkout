"""Checkout use cases (BR-01–BR-06, UC05–UC12).

The cart from first scan to payment: scanning, line removal, tray checks through the camera and the inference
service, pay blockers, payment with idempotency, cancel and skip with a manager PIN.
One public function per operation; each runs in one database transaction.
"""
