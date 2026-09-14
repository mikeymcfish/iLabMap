import secrets
import time
from collections import deque
from functools import wraps
from threading import Lock
from flask import abort, current_app, request, session


def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(32)
    return session["csrf"]


def check_csrf():
    token = request.headers.get("X-CSRF-Token", "")
    if not token or not secrets.compare_digest(token, session.get("csrf", "")):
        abort(403, "Your session expired. Reload the page and try again.")


def staff_only(func):
    @wraps(func)
    def wrapped(*args, **kwargs):
        if not session.get("staff"):
            abort(401, "Staff sign-in is required.")
        return func(*args, **kwargs)

    return wrapped


def rate_limit(bucket, limit, seconds=60):
    state = current_app.extensions.setdefault("rate_limit", {"lock": Lock(), "buckets": {}})
    now = time.monotonic()
    with state["lock"]:
        buckets = state["buckets"]
        for key in list(buckets):
            if not buckets[key] or buckets[key][-1] < now - 600:
                del buckets[key]
        key = (bucket, request.remote_addr)
        if key not in buckets and len(buckets) >= 10000:
            abort(429, "Please try again shortly.")
        queue = buckets.setdefault(key, deque())
        while queue and queue[0] <= now - seconds:
            queue.popleft()
        if len(queue) >= limit:
            abort(429, "Too many requests. Please try again in a minute.")
        queue.append(now)
