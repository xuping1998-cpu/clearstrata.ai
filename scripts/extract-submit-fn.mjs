import fs from 'fs';

const patched = fs.readFileSync('supabase/migrations/_patched_submit_join.sql', 'utf8');
const start = patched.indexOf('CREATE OR REPLACE FUNCTION public.submit_join_request');
const notify = patched.indexOf('\nNOTIFY pgrst', start);
if (start < 0 || notify < 0) throw new Error('markers not found');
const block = patched.slice(start, notify).trimEnd() + '\n';
fs.writeFileSync('supabase/migrations/_submit_fn_only.sql', block, 'utf8');
console.log('bytes', block.length);
