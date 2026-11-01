"""Celery application, queues and the periodic schedule.

worker:  celery -A app.worker.celery_app worker -Q cpu
trainer: celery -A app.worker.celery_app worker -Q gpu --concurrency 1
beat:    celery -A app.worker.celery_app beat
"""

from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery = Celery(
    "hybrid_checkout",
    broker=settings.redis_url,
    include=[
        "app.worker.tasks.cutouts",
        "app.worker.tasks.composites",
        "app.worker.tasks.training",
        "app.worker.tasks.evaluation",
        "app.worker.tasks.retention",
        "app.worker.tasks.cameras",
    ],
)
celery.conf.update(
    task_default_queue="cpu",
    task_routes={
        "app.worker.tasks.training.*": {"queue": "gpu"},
        "app.worker.tasks.evaluation.*": {"queue": "gpu"},
    },
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "purge-expired-images": {
            "task": "app.worker.tasks.retention.purge_expired_images",
            "schedule": crontab(hour=2, minute=0),
        },
        "poll-cameras": {"task": "app.worker.tasks.cameras.poll_cameras", "schedule": 10.0},
    },
)
