-- Retire the phase-28 fixture identities without rewriting migration history.
--
-- Existing environments may already have applied 000019_demo_users. Deleting
-- those rows would cascade into audit/booking/content records and can make a
-- live database unrecoverable. Instead, this forward-only migration revokes
-- all access, removes roles and public tutor visibility, and anonymises the
-- known fixture emails. New environments must not rely on these rows; fixtures
-- are opt-in local development data only (SEED_DEMO_DATA=true).

DO $$
DECLARE
  demo_ids UUID[] := ARRAY[
    '00000000-0000-0000-0000-0000000000a1'::UUID,
    '00000000-0000-0000-0000-0000000000a2'::UUID,
    '00000000-0000-0000-0000-0000000000a3'::UUID,
    '00000000-0000-0000-0000-0000000000a4'::UUID
  ];
BEGIN
  -- Never allow an existing browser/mobile session or email token to remain
  -- usable after a deployment applying this cleanup.
  UPDATE sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ANY(demo_ids);
  DELETE FROM auth_tokens WHERE user_id = ANY(demo_ids);
  DELETE FROM devices WHERE user_id = ANY(demo_ids);
  DELETE FROM user_roles WHERE user_id = ANY(demo_ids);

  -- A fixture tutor profile must not be discoverable after its identity is
  -- retired. Keep the row for FK/audit integrity in pre-existing databases.
  UPDATE tutor_profiles
     SET is_public = FALSE,
         status = 'SUSPENDED',
         updated_at = NOW()
   WHERE user_id = ANY(demo_ids);

  UPDATE users
     SET email = 'retired-fixture-' || replace(id::text, '-', '') || '@invalid.local',
         password_hash = crypt(encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
         phone = NULL,
         status = 'DELETED',
         email_verified_at = NULL,
         phone_verified_at = NULL,
         deleted_at = COALESCE(deleted_at, NOW()),
         updated_at = NOW()
   WHERE id = ANY(demo_ids);
END $$;
