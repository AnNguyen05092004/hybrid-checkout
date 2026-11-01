"""ModelRuntime: holds the one loaded checkpoint and its class map; swaps to a new one only after a warm-up run (BR-07).

The only file that imports the recognition model's code, so a model change touches nothing else (D07).
"""
