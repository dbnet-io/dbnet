with month_volume as (
  select  
    date_part(month, trx.marqeta_created_time) as month,
    sum(trx.amount) as volume
  from ANALYTICS.dev_airbase.transactions trx
  where trx.transaction_method = 'card' and trx.has_cashback_id
  group by 1
)
, method_day_volume as (
  select  
    date_part(month, trx.marqeta_created_time) as month,
    date_part(day, trx.marqeta_created_time) as day,
    trx.payment_method,
    sum(trx.amount) as volume
  from ANALYTICS.dev_airbase.transactions trx
  where trx.transaction_method = 'card' and trx.has_cashback_id
  group by 1, 2, 3
)
, week_volume as (
  select  
    date_part(week, trx.marqeta_created_time) as week,
    sum(trx.amount) as volume
  from ANALYTICS.dev_airbase.transactions trx
  where trx.transaction_method = 'card' and trx.has_cashback_id
  group by 1
)
, method_week_volume as (
  select  
    date_part(week, trx.marqeta_created_time) as week,
    dayofweekiso(trx.marqeta_created_time) as week_day,
    trx.payment_method,
    sum(trx.amount) as volume
  from ANALYTICS.dev_airbase.transactions trx
  where trx.transaction_method = 'card' and trx.has_cashback_id
  group by 1, 2, 3
)
, month_share_volume as (
  select
    1 as flag,
    mdv.payment_method,
    mdv.day,
    mdv.month,
    mdv.volume / mv.volume as vol_share
  from method_day_volume mdv
  join month_volume mv
    on mdv.month = mv.month
)
, week_share_volume as (
  select
    2 as flag,
    mwv.payment_method,
    mwv.week_day,
    mwv.week,
    mwv.volume / wv.volume as vol_share
  from method_week_volume mwv
  join week_volume wv
    on mwv.week = wv.week
)
, week_count as (
  select
    max(date_part(week, trx.marqeta_created_time)) as week_count
  from ANALYTICS.dev_airbase.transactions trx
  where trx.transaction_method = 'card' and trx.has_cashback_id
)
select
  msv.flag,
  msv.payment_method,
  msv.day,
  msv.vol_share / 12 as avg_vol_share
from month_share_volume msv

union all

select
  wsv.flag,
  wsv.payment_method,
  wsv.week_day, 
  wsv.vol_share / wc.week_count as avg_vol_share
from week_share_volume wsv, week_count wc