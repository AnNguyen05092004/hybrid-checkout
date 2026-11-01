"""Auth, Profile use cases (BR-15, UC01–UC03, UC12).

Login, JWT access tokens, rotating refresh tokens in Redis, password and PIN hashing, manager PIN check with
the per-counter lockout.
One public function per operation; each runs in one database transaction.
"""
