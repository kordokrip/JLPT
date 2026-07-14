-- Seed the historical local owner account without creating deploy-time
-- credentials. Real administrators are provisioned through the protected
-- bootstrap flow and secrets.
INSERT OR IGNORE INTO `users` (`id`, `email`, `display_name`, `role`, `auth_provider`)
VALUES ('owner', 'owner@nihongo-n3.local', 'Owner', 'admin', 'password');

UPDATE `users`
SET `role` = 'admin'
WHERE `id` = 'owner' OR `email` = 'owner@nihongo-n3.local';
