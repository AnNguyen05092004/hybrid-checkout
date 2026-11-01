"""Catalog use cases (BR-14, US15).

SKU catalogue: unique barcodes, prices kept per line, CSV import all-or-nothing.
One public function per operation; each runs in one database transaction.
"""
