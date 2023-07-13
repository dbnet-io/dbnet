 select a.sold_ts::date as date,
    b.channel as last_touch_channel,
    case when sub_u = 'pro business' then 'business yearly'
         when sub_u = 'pro' then 'pro yearly' else sub_u end as subscription_type,
    case when d.sale_type is not null then 'CyberWeek Discount'
         else 'Non-CyberWeek/GWP' end as campaign_type,
    case when retention_type_u = 'fts' then 'fts' else 'non-fts' end as retention_type,
    retention_type_u as retention_type_detail,
    case when a.refund_ts is not null then 'Refund'
         when a.chargeback_ts is not null then 'Chargedback'
         end as refund_chargeback_status,
    case when lower(a.merchant_id) like 'mod%' then 'Gifted'
         when d.promo_used <> '0' then 'Discounted'
         when a.is_prev_freetrial = '1' and lower(loc) in ('apple','google') then 'Free Trial Rollover (app)'
         when a.is_prev_freetrial = '1' then 'Free Trial Rollover (Desktop)'
         when a.merchant_id is not null then 'Full Price'
         else 'Other' end as price_type,
    --a.currency, a.country_code,
    count(distinct a.merchant_id) as total_conversions,
    sum(a.usd_price) as total_bookings
from analytics.bi_subscription_events a
inner join analytics.bi_conversion_events b on a.merchant_id = b.merchant_id and b.rank_Desc = 1
left join (
select b.user_id, b.sale_type, a.merchant_transaction_id as merchant_id, a.promo_used
from txns.transactions a
inner join txns.promo_uses b on a.promo_used = b.id
inner join txns.promo_codes c on c.id = b.promo_id
where c.code in ('PLSCAW2020', 'PROCAW2020', 'BIZCAW2020', 'PRECAW2020', '2PLSCAW2020', '2PROCAW2020', '2BIZCAW2020',
    'PLSCAW2019', 'PROCAW2019', 'BIZCAW2019', 'PLSCAW2018', 'PROCAW2018', 'BIZCAW2018')
and b.sale_type is not null
) d on a.user_id = d.user_id and a.merchant_id = d.merchant_id
where a.sub_u in ('premium yearly', 'pro business', 'pro', 'plus yearly')
and (a.sold_ts::date between '2020-11-16' and '2020-12-01' or
     a.sold_ts::date between '2019-11-25' and '2019-12-03' or
     a.sold_ts::date between '2018-11-19' and '2018-11-28')
and a.auto_renewal = false
and NOT lower(a.merchant_id) like 'mod%'
and NOT (a.sold_ts::date between '2020-11-23' and '2020-12-01' and a.sub_u = 'premium yearly')
group by 1,2,3,4,5,6,7,8
union all
select a.sold_ts::date as date,
    b.channel as last_touch_channel,
    a.sub_u,
    'GWP Premium' as campaign_type,
    case when a.retention_type_u = 'fts' then 'fts' else 'non-fts' end as retention_type,
    retention_type_u as retention_type_detail,
    case when a.refund_ts is not null then 'Refund'
         when a.chargeback_ts is not null then 'Chargedback'
         end as refund_chargeback_status,
    case when lower(a.merchant_id) like 'mod%' then 'Gifted'
         when s.promo_used <> '0' then 'Discounted'
         when a.is_prev_freetrial = '1' and lower(loc) in ('apple','google') then 'Free Trial Rollover (app)'
         when a.is_prev_freetrial = '1' then 'Free Trial Rollover (Desktop)'
         when a.merchant_id is not null then 'Full Price'
         else 'Other' end as price_type,
    --a.currency, a.country_code,
    count(distinct a.merchant_id) as premium_purchases,
    sum(usd_price) as premium_bookings
from analytics.bi_subscription_events a
inner join (
select distinct id,
purgatory_date,
purgatory
from txns.users
where purgatory not in (1,2)
) c on a.user_id = c.id
inner join analytics.bi_conversion_events b on a.merchant_id = b.merchant_id and b.rank_Desc = 1
left join txns.transactions s
    on a.merchant_id = s.merchant_transaction_id
where auto_renewal = false
and sub_u like '%premium%'
and (a.sold_ts::date between '2020-11-23' and '2020-12-22'
     or a.sold_ts::date between '2019-11-25' and '2019-12-20'
     or a.sold_ts::date between '2018-11-19' and '2018-12-14')
and refund_ts is null
and chargeback_ts is null
and lower(a.merchant_id) not like 'mod%'
and retention_type_u <> 'renewal'
group by 1,2,3,4,5,6,7,8
order by 4, 1, 10 desc, 9 desc, 3,5,2,6,7,8
 