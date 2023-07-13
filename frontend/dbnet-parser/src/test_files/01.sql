
	with initial_data as (
		select
			replace(sig_alerts.root_folder, '_database', '') as database_name_prefix, 
			sig_alerts.loaded_at
		from raw.snowpipe.sig_alerts_all sig_alerts		
	)
	, cdc_data as (
		select
			data['op']::VARCHAR as "Op",
			replace(sig_alerts.root_folder, '_database', '') as database_name_prefix, 
			sig_alerts.loaded_at
		from raw.snowpipe.sig_alerts_all sig_alerts
	)

	, latest_change as (
		select *
		from cdc_data
		where rank_num = 1 -- only latest for a sig_id
	)

	, final as (
		select
			coalesce(latest.database_name_prefix, source.database_name_prefix) as database_name_prefix,
			coalesce(latest.loaded_at, source.loaded_at) as loaded_at,
      coalesce(latest."Op", 'UNK') as "Operation"
		from initial_data as source
		full outer join latest_change latest
			on latest.database_name_prefix = source.database_name_prefix
			and latest.sig_id = source.sig_id
	)

	select
		customers.uuid as customer_uuid,
		final.*
	from final
	left join ANALYTICS.base.customers customers
		on final.database_name_prefix = customers.database_name_prefix