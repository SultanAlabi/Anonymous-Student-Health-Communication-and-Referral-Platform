import hashlib, hmac, re, secrets
from django.conf import settings

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I

def generate_code():
    """12 random chars (~60 bits) from a CSPRNG, formatted ASCH-XXXX-XXXX-XXXX."""
    s = "".join(secrets.choice(ALPHABET) for _ in range(12))
    return f"ASCH-{s[:4]}-{s[4:8]}-{s[8:]}"

def hash_code(code):
    """Keyed HMAC-SHA256 of the normalised code. A leaked database alone cannot be brute-forced."""
    norm = re.sub(r"[^A-Z0-9]", "", code.upper())
    return hmac.new(settings.REFERENCE_CODE_PEPPER.encode(), norm.encode(), hashlib.sha256).hexdigest()
