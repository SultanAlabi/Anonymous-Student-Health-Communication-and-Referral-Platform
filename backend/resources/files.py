import os, re, zipfile

MAX_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_FILES = 5                # per resource
TYPES = {
    ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAGIC = {".pdf": (b"%PDF-",), ".png": (b"\x89PNG\r\n\x1a\n",), ".jpg": (b"\xff\xd8\xff",), ".jpeg": (b"\xff\xd8\xff",)}
INLINE = ("application/pdf", "image/png", "image/jpeg")


def ext_of(name):
    return os.path.splitext(name)[1].lower()


def clean_name(name):
    base = os.path.basename(name.replace("\\", "/"))
    return re.sub(r"[\x00-\x1f\x7f]", "", base).strip()[:200] or "file"


def validate_upload(f):
    """Allowlist by extension, then check the real content. The client-supplied content type is ignored."""
    ext = ext_of(f.name)
    if ext not in TYPES:
        raise ValueError("Allowed file types: PDF, PNG, JPG and Word (.docx).")
    if f.size == 0:
        raise ValueError("The file is empty.")
    if f.size > MAX_SIZE:
        raise ValueError("Files must be 10 MB or smaller.")
    f.seek(0)
    head = f.read(16)
    f.seek(0)
    if ext == ".docx":
        ok = zipfile.is_zipfile(f)
        f.seek(0)
        if ok:
            with zipfile.ZipFile(f) as z:
                ok = "word/document.xml" in z.namelist()
            f.seek(0)
    else:
        ok = any(head.startswith(m) for m in MAGIC[ext])
    if not ok:
        raise ValueError("The file's contents don't match its type.")
    return ext