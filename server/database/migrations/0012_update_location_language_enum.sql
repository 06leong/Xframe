UPDATE `settings`
SET `enum` = '["zh","zh-TW","en"]'
WHERE `namespace` = 'location' AND `key` = 'language';
--> statement-breakpoint

UPDATE `settings`
SET `value` = CASE
  WHEN `value` = 'zh-CN' THEN 'zh'
  WHEN `value` = 'zh-HK' THEN 'zh-TW'
  WHEN `value` IN ('zh', 'zh-TW', 'en') THEN `value`
  ELSE 'en'
END
WHERE `namespace` = 'location' AND `key` = 'language';
