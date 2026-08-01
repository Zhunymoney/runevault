-- Server APIs read and append audit records; they must never rewrite history.
grant select, insert on public.audit_logs to service_role;
