with company_card_spend_by_month as (
  select
    trx.company_id,
    date_trunc(month, trx.transaction_settled_at) as month,
    sum(trx.amount) / 100 as amount
  from ANALYTICS.dev_airbase.transactions_current trx
  where trx.transaction_method = 'card' and trx.has_cashback_id
    and trx.settled_impact_cents > 0
  group by 1, 2
)
, company_check_ach_spend_by_month as (
  select
    trx.company_id,
    date_trunc(month, trx.transaction_settled_at) as month,
    sum(trx.amount) / 100 as amount
  from ANALYTICS.dev_airbase.transactions_current trx
  where trx.transaction_type = 'billpayment.outbound'
    and ( trx.transaction_method in ('ach', 'check') )
  group by 1, 2
)
, company_spend_by_month as (
  select
    trx.company_id,
    date_trunc(month, trx.transaction_settled_at) as month,
    sum(trx.amount) / 100 as amount
  from ANALYTICS.dev_airbase.transactions_current trx
  where (
      ( trx.transaction_method = 'card' and trx.has_cashback_id and trx.settled_impact_cents > 0 )
      or ( trx.transaction_type = 'billpayment.outbound' and trx.transaction_method in ('ach', 'check') )
    )
  group by 1, 2
)
, final as (
  select
    1 as group_id,
    month,
    max(amount) as max_amount,
    avg(amount) as avg_amount,
    median(amount) as median_amount
  from company_card_spend_by_month
  group by month

  union all 

  select
    2 as group_id,
    month,
    max(amount) as max_amount,
    avg(amount) as avg_amount,
    median(amount) as median_amount
  from company_check_ach_spend_by_month
  group by month

  union all 

  select
    3 as group_id,
    month,
    max(amount) as max_amount,
    avg(amount) as avg_amount,
    median(amount) as median_amount
  from company_spend_by_month
  group by month
)
select * from final
order by 1, 2