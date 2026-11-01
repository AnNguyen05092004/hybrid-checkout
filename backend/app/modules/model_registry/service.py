"""Models use cases (BR-07–BR-09, UC21, UC22).

Model versions and their gate report; deploy loads the checkpoint into the inference service before the
database changes; rollback to the previous version.
One public function per operation; each runs in one database transaction.
"""
