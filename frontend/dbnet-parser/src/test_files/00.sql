
		with t1 as (select 1 as id from mytable),
		t2 (select * from t1)
		select
			account_id::varchar as pendo_account_id,
			coalesce(events."Id", accounts."Id") as other_id,
			'event' as type,
			-- visitor_id,
			page_id,
			p.name,
			'-1' as feature_id,
			sum(num_events) as num_events,
			sum(num_minutes) as num_minutes,
			count(case 
				when created_at > current_timestamp::timestamp+ ((interval '1 day') * (-90))
				then last_response__id 
				end) responses_last_90_days
		from analytics.pendo_production.events, ( select * from schema1.dates)  dates
		LeFt join analytics.pendo_production.accounts a on a.id = events.account_id::varchar
		right outer join pendo_production.pages as p on p.type = split_part(events.page_type, '@', 2)
		join (select * from t2) as t3 on t3.id = events.account_id
		inner join (select * from t2) as t4 on t4.id = events.account_id
		where account_id is not null
		group by 1,2,3,4,5,6
		order by 1,2