def student_identity(user):
    """Identity block for the professional who handles a student's request. Never shown to ambassadors/admins."""
    sp = getattr(user, "student_profile", None)
    return {"name": f"{user.first_name} {user.last_name}",
            "student_number": getattr(sp, "student_number", None),
            "department": getattr(sp, "department", None)}
