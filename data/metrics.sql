SELECT COUNT(*) AS days,
       COALESCE(SUM(suggested),0) AS suggested,
       COALESCE(SUM(accepted),0) AS accepted,
       COALESCE(SUM(CASE WHEN working=1 THEN active ELSE 0 END),0) AS active,
       SUM(working) AS working_days
FROM daily WHERE team=? AND day BETWEEN ? AND ?;
