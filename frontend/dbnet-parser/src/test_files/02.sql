SELECT teamname, maxteamsize AS team_size,

case 
when maxteamsize >= 100 then 'XXL' 
when maxteamsize >= 50 then 'XL' 
when maxteamsize>= 20 then 'Large' 
when maxteamsize >= 10 then 'Medium'
when maxteamsize >= 5 then 'Small'
else 'Very Small' END AS teamsize_grouping,

COUNT(DISTINCT name) AS no_of_active_members, concat((COUNT(DISTINCT name) * 100/NULLIF(maxteamsize,0)),'%') AS percentage_active



FROM

(SELECT DISTINCT name, teamname, maxteamsize
FROM leadiqplay.team__members AS tm 
JOIN leadiqplay.team AS team
ON tm._sdc_source_key__id = team._id
WHERE tm.email IN


(SELECT DISTINCT l.useremail
FROM leadiqplay.lead AS l
WHERE (createddate BETWEEN '{{ Date Range.start }}' AND '{{ Date Range.end }}'))
AND team.disabled = false
AND team.maxcredits > 0
)

GROUP BY teamname, maxteamsize
ORDER BY (COUNT(DISTINCT name) * 100/NULLIF(maxteamsize,0)) ASC
