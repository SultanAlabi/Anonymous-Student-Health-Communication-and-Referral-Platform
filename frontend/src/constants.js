export const CONCERN_CATEGORIES = [
  ["general", "General health"], ["sexual_reproductive", "Sexual & reproductive health"],
  ["menstrual", "Menstrual health"], ["mental", "Mental health"], ["other", "Other"],
];
export const RESOURCE_CATEGORIES = [...CONCERN_CATEGORIES.slice(0, 4), ["nutrition", "Nutrition"], ["preventive", "Preventive healthcare"]];
export const label = (list, v) => list.find(([k]) => k === v)?.[1] ?? v;
export const CASE_STATUS = { open: "Awaiting review", in_review: "Being reviewed", responded: "Response available", closed: "Closed" };
export const SERVICES = [["counselling", "Counselling"], ["mental_health", "Mental health support"], ["sexual_health", "Sexual & reproductive health clinic"], ["menstrual_health", "Menstrual health"], ["general_checkup", "General check-up"], ["other", "Other"]];
export const URGENCY = [["routine", "Routine"], ["soon", "Soon"], ["urgent", "Urgent"]];
export const WINDOWS = [["any", "Any time"], ["morning", "Morning"], ["afternoon", "Afternoon"]];
export const CONCERN_STATUS = { open: "Waiting for a professional", in_review: "Being reviewed", responded: "Response received", closed: "Closed" };
export const REFERRAL_STATUS = { pending: "Waiting to be picked up", assigned: "Assigned", in_progress: "In progress", referred: "Referred", completed: "Completed", closed: "Closed" };
export const APPT_STATUS = { requested: "Requested", approved: "Approved", rescheduled: "Rescheduled", rejected: "Declined", cancelled: "Cancelled", completed: "Completed" };
export const ROLE_LABEL = { student: "Student", ambassador: "Health ambassador", professional: "Healthcare professional", admin: "Administrator" };
export const fmt = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "");
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString([], { dateStyle: "medium" }) : "");
export const EMERGENCY_CATEGORIES = [["emergency_services", "Emergency services"], ["health_centre", "University health centre"], ["hospital", "Hospital / emergency facility"], ["crisis_line", "Crisis / mental health line"], ["campus_security", "Campus security"]];
export const STAFF_ROLES = [["ambassador", "Health ambassador"], ["professional", "Healthcare professional"], ["admin", "Administrator"]];
