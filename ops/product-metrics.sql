SELECT
  COUNT(DISTINCT CASE WHEN name = 'visited' THEN session_hash END) AS visitors,
  COUNT(DISTINCT CASE WHEN name = 'analyzed' THEN session_hash END) AS analyzers,
  COUNT(DISTINCT CASE WHEN name = 'example_opened' THEN session_hash END) AS example_users,
  COUNT(DISTINCT CASE WHEN name = 'diagnosis_viewed' THEN session_hash END) AS diagnosis_users,
  COUNT(DISTINCT CASE WHEN name = 'structure_viewed' THEN session_hash END) AS structure_users,
  COUNT(DISTINCT CASE WHEN name = 'question_copied' THEN session_hash END) AS question_copiers,
  COUNT(DISTINCT CASE WHEN name = 'official_source_opened' THEN session_hash END) AS source_users,
  COUNT(DISTINCT CASE WHEN name = 'returned' THEN session_hash END) AS returned,
  COUNT(DISTINCT CASE WHEN name = 'visited' AND day >= date('now', '-6 days') THEN session_hash END) AS visitors_7d
FROM product_events
WHERE is_qa = 0;
