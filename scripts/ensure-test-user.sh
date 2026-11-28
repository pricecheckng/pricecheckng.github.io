#!/usr/bin/env bash
# Creates (or resets) the PriceCheck test user used by the site tester. Needs SUPABASE_ACCESS_TOKEN in $T and TEST_EMAIL, TEST_PASS.
set -e
SQL=$(cat <<SQLEOF
do \$\$
declare uid uuid; em text := '${TEST_EMAIL}'; pw text := '${TEST_PASS}';
begin
  select id into uid from auth.users where email = em;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',em,extensions.crypt(pw, extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
    insert into auth.identities (id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',em),'email',now(),now(),now());
  else
    update auth.users set encrypted_password = extensions.crypt(pw, extensions.gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()) where id = uid;
  end if;
end \$\$;
SQLEOF
)
R=$(curl -s -X POST "https://api.supabase.com/v1/projects/lbkpdepqymfjgmoouafv/database/query" -H "Authorization: Bearer $T" -H "Content-Type: application/json" --data "$(jq -n --arg q "$SQL" '{query:$q}')")
echo "test user setup: $(echo "$R" | sed -E 's/[A-Za-z0-9_.:-]{40,}/<hidden>/g' | cut -c1-300)"
