import httpx
from supabase import create_client, ClientOptions
from app.core.config import settings

# The postgrest-py SDK hardcodes http2=True when it creates its internal
# httpx session (see postgrest/_sync/client.py:60).  On Windows, HTTP/2's
# multiplexed non-blocking sockets trigger intermittent
# "WinError 10035: A non-blocking socket operation could not be completed
# immediately" errors — especially when the sync client is called from
# FastAPI's thread pool.
#
# There is no public API to disable HTTP/2, so we replace the postgrest
# session after creation with an identical one that uses HTTP/1.1.

supabase = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
    options=ClientOptions(
        postgrest_client_timeout=15,
    ),
)

_old = supabase.postgrest.session
supabase.postgrest.session = type(_old)(
    base_url=str(_old.base_url),
    headers=dict(_old.headers),
    timeout=_old.timeout,
    follow_redirects=True,
    http2=False,           # ← the fix
)
_old.close()