"""Generate SQL fragment: DROP + CREATE policies with property_members. Run from project root."""
import re
from pathlib import Path

path = Path("supabase/migrations/20260405120100_multi_tenant_rls.sql")
s = path.read_text(encoding="utf-8")
start = s.find('CREATE POLICY "cn_select_tenant"')
if start < 0:
    raise SystemExit("block not found")
block = s[start:]
block = block.replace("public.property_users pu", "public.property_members pm")
block = block.replace("pu.user_id", "pm.user_id")
block = block.replace("pu.property_id", "pm.property_id")
block = block.replace("pu.role", "pm.role")

# Add active status for staff membership checks
block = re.sub(
    r"(WHERE pm\.user_id = \(SELECT auth\.uid\(\)\)\s*\n\s*AND pm\.property_id = [^\n]+\s*\n\s*)(AND pm\.role IN)",
    r"\1AND pm.status = 'active'::member_status\n        \2",
    block,
)

# Policy name -> table for DROP
policies = re.findall(
    r'CREATE POLICY "([^"]+)"\s*\n\s*ON public\.(\w+)',
    block,
)
drops = []
for name, table in policies:
    drops.append(f'DROP POLICY IF EXISTS "{name}" ON public.{table};')

out = Path("supabase/migrations/_generated_policy_fix_fragment.sql")
out.write_text(
    "-- GENERATED — do not commit; merged into migration\n"
    + "\n".join(drops)
    + "\n\n"
    + block,
    encoding="utf-8",
)
print("Wrote", out, "policies", len(policies))
