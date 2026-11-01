"""Tray reconciliation (UC07): scanned quantities + detections + learned SKUs + thresholds -> alerts.

Pure functions, no I/O, so unit tests run without a database or a GPU. Same algorithm as frontend/src/lib/reconcile.ts.
"""
