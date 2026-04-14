import fs from 'fs';

const src = 'supabase/migrations/20260722120000_unified_property_entry_submit_join.sql';
const out = 'supabase/migrations/_patched_submit_join.sql';

let s = fs.readFileSync(src, 'utf8');

const removePendingPicBump =
  /(\s+RETURNING id INTO v_join_id;\s+)\s+UPDATE public\.property_invite_codes\s+SET used_count = used_count \+ 1\s+WHERE id = pic\.id;\s+IF pic\.max_uses > 0 AND pic\.used_count \+ 1 >= pic\.max_uses THEN\s+UPDATE public\.property_invite_codes\s+SET is_active = false\s+WHERE id = pic\.id;\s+END IF;\s+/;

s = s.replace(removePendingPicBump, '$1');

const ins = `
      IF pic.unit_no IS NOT NULL AND length(trim(pic.unit_no)) > 0 THEN
        IF lower(trim(coalesce(p_unit_number, ''))) IS DISTINCT FROM lower(trim(pic.unit_no)) THEN
          RETURN jsonb_build_object(
            'ok', false,
            'success', false,
            'message', 'UNIT_INVITE_MISMATCH',
            'message_zh', '房号与邀请码绑定房号不一致'
          );
        END IF;
      END IF;

`;

const insertAfterPropertyMatch =
  /(IF pic\.property_id IS DISTINCT FROM p_property_id THEN\s+RETURN jsonb_build_object\([\s\S]*?END IF;\s+)(      SELECT \* INTO vprof)/;

if (!insertAfterPropertyMatch.test(s)) {
  console.error('insertAfterPropertyMatch pattern not found');
  process.exit(1);
}
s = s.replace(insertAfterPropertyMatch, `$1${ins}$2`);

fs.writeFileSync(out, s, 'utf8');
console.log('written', out, 'len', s.length, 'has mismatch', s.includes('UNIT_INVITE_MISMATCH'));
