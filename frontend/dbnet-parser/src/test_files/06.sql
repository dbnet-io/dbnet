 select a.date, a.channel,
                  today,
                  yesterday,
                  yesterday_minus_1,
                  yesterday_minus_2,
                  yesterday_minus_3,
                  yesterday_minus_4,
                  yesterday_minus_5,
                  yesterday_minus_6,
                  yesterday_minus_7,
                  yesterday_minus_8,
                  bookings_today,
                 bookings_yesterday,
                 bookings_yesterday_minus_1,
                 bookings_yesterday_minus_2,
                 bookings_yesterday_minus_3,
                 bookings_yesterday_minus_4,
                 bookings_yesterday_minus_5,
                 bookings_yesterday_minus_6,
                 bookings_yesterday_minus_7,
                 bookings_yesterday_minus_8
        from (select a.date, b.channel, 'Paid' as channel_group,
        sum(case when a.date=c.date then c.spend end) as today,
        sum(case when a.date = dateadd('day',1,c.date) then c.spend end) as yesterday,
        sum(case when a.date = dateadd('day',2,c.date) then c.spend end) as yesterday_minus_1,
        sum(case when a.date = dateadd('day',3,c.date) then c.spend end) as  yesterday_minus_2,
        sum(case when a.date = dateadd('day',4,c.date) then c.spend end) as  yesterday_minus_3,
        sum(case when a.date = dateadd('day',5,c.date) then c.spend end) as  yesterday_minus_4,
        sum(case when a.date = dateadd('day',6,c.date) then c.spend end) as  yesterday_minus_5,
        sum(case when a.date = dateadd('day',7,c.date) then c.spend end) as  yesterday_minus_6,
        sum(case when a.date = dateadd('day',8,c.date) then c.spend end) as  yesterday_minus_7,
        sum(case when a.date = dateadd('day',9,c.date) then c.spend end) as  yesterday_minus_8,
        sum(case when a.date = c.date then c.cumulative_spend end) as cumulative_spend
        from analytics.bi_dates a
        cross join (select distinct channel from marketing.jin_channel where channel not in ('Total','Other','Social','Direct','Email','Paid Email','Organic Search','Referral','Unknown!!!','Partner','Paid Search')) b
        left join (select
                               first_day_of_month,
                               date,
                               traffic_source,
                               business_unit,
                               channel,
                               spend,
                               sum(spend) over(partition by first_day_of_month, traffic_source, business_unit,channel order by date asc ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_spend
                        from(
                                select date_trunc('month',date) as first_day_of_month, a.*
                                from (
                                select traffic_source,business_unit, date, sum(total_cost) as spend, sum(impressions) as impressions, sum(click_throughs) as clicks, sum(total_pixel) as conversions, 'External Display' as channel
                                                    from marketing.funnel_amazon
                                                    group by 1,2,3
                                                    UNION ALL
                                                          select traffic_source,business_unit, date,
                                                          sum(cost) as spend, sum(impressions) as impressions, sum(clicks) as clicks,
                                                          sum(nvl(plus_a_ko,0) + nvl(business_ko,0) + nvl(business_live_a_ko,0) + nvl(business_live_m_ko,0) + nvl(plus_m_ko,0) + nvl(pro_ko,0) + nvl(pro_live_a_ja,0) + nvl(pro_live_m_ko,0) + nvl(pro_unlimited_ko,0) + nvl(premium_a_ko,0) + nvl(premium_m_ja,0)) as conversions,
                                                           case when lower(campaign) like '%display%' then 'CPC Display'
                                                               else 'SEM' end as channel
                                                          from marketing.funnel_adwords
                                                          group by 1,2,3,8
                                                    UNION ALL
                                                          select traffic_source,business_unit, date, sum(spend) as spend, sum(impressions) as impressions, sum(clicks) as clicks, sum(conversions) as conversions, 'SEM' as channel
                                                          from marketing.funnel_bing
                                                          group by 1,2,3
                                                    UNION ALL
                                                          select traffic_source, business_unit, date, sum(publisher_commission) as spend, null as impressions, null as clicks,  sum(sales) as conversions, 'Affiliate' as channel
                                                          from marketing.funnel_cj
                                                          group by 1,2,3
                                                    UNION ALL
                                                          select traffic_source, business_unit, date, sum(media_cost+dbm_cost) as spend, sum(impressions) as impressions, sum(clicks) as clicks,
                                                          sum( nvl(plus_a_mobile_clickthru_conv,0) + nvl(plus_a_mobile_viewthru_conv,0)  + nvl(biz_clickthru_conv,0)  + nvl(biz_viewthru_conv,0)  + nvl(biz_live_a_clickthru_conv,0)  +  nvl(biz_live_a_viewthru_conv,0)  + nvl(biz_live_m_clickthru_conv,0)  + nvl(biz_live_m_viewthru_conv,0)  + nvl(live_clickthru_conv,0)  + nvl(live_viewthru_conv,0)  + nvl(pro_live_a_clickthru_conv,0)
                                                          + nvl(pro_live_a_viewthru_conv,0)  + nvl(pro_live_m_clickthru_conv,0)  + nvl(pro_live_m_viewthru_conv,0)  + nvl(plus_m_mobile_clickthru_conv,0)  + nvl(plus_m_mobile_viewthru_conv,0)  + nvl(pro_clickthru_conv,0)  + nvl(pro_viewthru_conv,0)  + nvl(pro_unlimited_clickthru_conv,0)  + nvl(pro_unlimited_viewthru_conv,0)  + nvl(plus_a_clickthru_conv,0)  + nvl(plus_a_viewthru_conv,0)
                                                          + nvl(plus_m_clickthru_conv,0)  + nvl(plus_m_viewthru_conv,0)  + nvl(premium_a_clickthru_conv,0)  + nvl(premium_a_viewthru_conv,0)  + nvl(premium_m_clickthru_conv,0)  + nvl(premium_m_viewthru_conv,0)  + nvl(pro_mobile_clickthru_conv,0)  + nvl(pro_mobile_viewthru_conv,0)) as conversions,
                                                          'External Display' as channel
                                                          from marketing.funnel_dcm
                                                          group by 1,2,3
                                                    UNION ALL
                                                          select traffic_source,business_unit, date, sum(spend) as spend, sum(impressions) as impressions,  sum(link_clicks) as clicks, sum(website_purchases) as conversions, 'Paid Social' as channel
                                                          from marketing.funnel_fb
                                                          group by 1,2,3
                                                    UNION ALL
                                                          select traffic_source, business_unit, date, sum(spend) as spend, sum(impressions) as impressions, sum(clicks) as clicks,  sum(viewthru_conv) as conversiosn, 'Paid Social' as channel
                                                          from marketing.funnel_linkedin
                                                          group by 1,2,3
                                                    UNION ALL
                                                          select traffic_source, business_unit, date, sum(spend) as spend, sum(impressions) as impressions, /*sum(clicks) as all_clicks,*/ sum(link_clicks) as clicks, 0 as conversions, 'Paid Social' as channel
                                                          from marketing.funnel_twitter
                                                          group by 1,2,3
                                                    UNION ALL
                                                          select traffic_source, business_unit, date, sum(spend) as spend, sum(impressions) as impressions, sum(clicks) as clicks, sum(conversions) as conversions, 'SEM' as channel
                                                          from marketing.funnel_yahoo
                                                          group by 1,2,3
                                                          ) a
                                                          ) aa
                        where business_unit = 'Vimeo'
                        group by 1,2,3,4,5, spend
                         order by channel asc, traffic_source,  date asc , cumulative_spend desc
) c
on b.channel = c.channel
        --where a.date between '2018-06-01' and '2018-06-05'
        group by 1,2,3
        order by 1,2,3
        ) a
        inner join (select date, channel, sum(bookings_today) as bookings_today,
                        sum(bookings_yesterday) as bookings_yesterday,
                        sum(bookings_yesterday_minus_1)as bookings_yesterday_minus_1,
                        sum(bookings_yesterday_minus_2)as bookings_yesterday_minus_2,
                        sum(bookings_yesterday_minus_3)as bookings_yesterday_minus_3,
                        sum(bookings_yesterday_minus_4)as bookings_yesterday_minus_4,
                        sum(bookings_yesterday_minus_5)as bookings_yesterday_minus_5 ,
                        sum(bookings_yesterday_minus_6)as bookings_yesterday_minus_6,
                        sum(bookings_yesterday_minus_7)as bookings_yesterday_minus_7,
                        sum(bookings_yesterday_minus_8)as bookings_yesterday_minus_8
                        from (
                              select a.date, b.channel,  d.retention_type_u,
                case when b.channel in ('Social','Referral','Direct','Organic Search') then 'Organic'
                     when b.channel in ('Paid Search','External Display','Paid Social','SEM','CPC Display', 'Email', 'Affiliate') then 'Paid'
                     when b.channel = 'Total' then 'Total'
                     else 'Other' end as channel_group,
                sum(case when a.date = c.date then c.conversions end) as today,
                sum(case when a.date = dateadd('day',1,c.date) then c.conversions end) as yesterday,
                sum(case when a.date = dateadd('day',2,c.date) then c.conversions end) as yesterday_minus_1,
                sum(case when a.date = dateadd('day',3,c.date) then c.conversions end) as  yesterday_minus_2,
                sum(case when a.date = dateadd('day',4,c.date) then c.conversions end) as  yesterday_minus_3,
                sum(case when a.date = dateadd('day',5,c.date) then c.conversions end) as  yesterday_minus_4,
                sum(case when a.date = dateadd('day',6,c.date) then c.conversions end) as  yesterday_minus_5,
                sum(case when a.date = dateadd('day',7,c.date) then c.conversions end) as  yesterday_minus_6,
                sum(case when a.date = dateadd('day',8,c.date) then c.conversions end) as  yesterday_minus_7,
                sum(case when a.date = dateadd('day',9,c.date) then c.conversions end) as  yesterday_minus_8,
                sum(case when a.date = c.date then c.cumulative_fts end) as cumulative_fts,
                sum(case when a.date = c.date then c.cumulative_bookings end) as cumulative_bookings,
                sum(case when a.date = c.date then c.bookings end) as bookings_today,
                sum(case when a.date = dateadd('day',1,c.date) then c.bookings end) as bookings_yesterday,
                sum(case when a.date = dateadd('day',2,c.date) then c.bookings end) as bookings_yesterday_minus_1,
                sum(case when a.date = dateadd('day',3,c.date) then c.bookings end) as  bookings_yesterday_minus_2,
                sum(case when a.date = dateadd('day',4,c.date) then c.bookings end) as  bookings_yesterday_minus_3,
                sum(case when a.date = dateadd('day',5,c.date) then c.bookings end) as  bookings_yesterday_minus_4,
                sum(case when a.date = dateadd('day',6,c.date) then c.bookings end) as  bookings_yesterday_minus_5,
                sum(case when a.date = dateadd('day',7,c.date) then c.bookings end) as  bookings_yesterday_minus_6,
                sum(case when a.date = dateadd('day',8,c.date) then c.bookings end) as  bookings_yesterday_minus_7,
                sum(case when a.date = dateadd('day',9,c.date) then c.bookings end) as  bookings_yesterday_minus_8
            from analytics.bi_dates a
            cross join (select distinct channel from marketing.jin_channel where channel not in ('Paid Email','Paid Search')) b
            cross join (select distinct retention_type_u from analytics.bi_subscription_events where retention_type_u in ('fts','migration','renewal','returner')) d
            left join (
                        select date, channel, retention_type_u,
                                max(cumulative_fts) as cumulative_fts,
                                (max(cumulative_bookings)-max(cumulative_neg_amt)) as cumulative_bookings,
                                sum(conversions) as conversions,
                                (sum(bookings) - sum(negative_amt)) as bookings
                        from
                                (select aa.date,
                                           aa.channel,
                                           aa.retention_type_u,
                                           --aa.sub_u,
                                           aa.conversions,
                                           aa.bookings,
                                           aa.cumulative_fts,
                                           aa.cumulative_bookings,
                                           case when bb.cumulative_neg_cnt is null then 0 else bb.cumulative_neg_cnt end as cumulative_neg_cnt,
                                           case when bb.cumulative_neg_amt is null then 0 else bb.cumulative_neg_amt end as cumulative_neg_amt,
                                           case when bb.negative_cnt is null then 0 else bb.negative_cnt end as negative_cnt,
                                           case when bb.negative_amt is null then 0 else bb.negative_amt end as negative_amt
                                          from
                                          (
                                          select
                                                       first_day_of_month,
                                                       date,
                                                       channel,
                                                       retention_type_u,
                                                       --sub_u,
                                                       conversions,
                                                       bookings,
                                                       sum(conversions) over(partition by first_day_of_month, channel, retention_type_u order by date asc ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_fts,
                                                       sum(bookings) over(partition by first_day_of_month, channel, retention_type_u order by date asc ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_bookings
                                                from
                                                (
                                                select  date_trunc('month',date) as first_day_of_month,
                                                        date,
                                                        case when channel is null then 'Total'
                                                        else channel end as channel,
                                                        retention_type_u,
                                                        --sub_u,
                                                        conversions,
                                                        bookings
                                                from (
                                                          select date,
                                                                 b.channel,
                                                                 c.retention_type_u,
                                                                 --e.sub_u,
                                                                 count(distinct d.merchant_id) as conversions,
                                                                 case when sum(d.usd_price) is null then 0
                                                                 else sum(d.usd_price) end as bookings
                                                          from analytics.bi_dates a
                                                          cross join (select distinct channel from marketing.jin_channel where channel not in ('Paid Email','Paid Search','Total')) b
                                                          cross join (select distinct retention_type_u from analytics.bi_subscription_events  where retention_type_u in('fts','migration','renewal','returner')) c
                                                          --cross join (select distinct sub_u from analytics.bi_subscription_events) e
                                                          left join
                                                                    ( select sold_ts,
                                                                             case when retention_type_u ='migration returner' then 'returner'
                                                                                   when retention_type_u='migration winback' then 'returner'
                                                                                   when retention_type_u='returner' then'returner'
                                                                                   when retention_type_u='winback' then 'returner'
                                                                                  else retention_type_u end as retention_type_u,
                                                                             case when channel = 'Paid Search' and lower(campaign) like '%display%' then 'CPC Display'
                                                                                when channel = 'Paid Search' and medium = 'display' then 'CPC Display'
                                                                                when channel = 'Paid Search' then 'SEM'
                                                                                  when channel in ('Email', 'Paid Email') then 'Email'
                                                                                  else channel end as channel,
                                                                            -- sub_u,
                                                                             a.merchant_id, usd_price
                                                                      from analytics.bi_subscription_events a
                                                                      inner join analytics.bi_conversion_events b
                                                                      on a.merchant_id = b.merchant_id
                                                                      and rank_desc ='1'
                                                                      where year(sold_ts) >= 2017
                                                                      --where date_trunc('day',sold_ts) between '2018-05-31'and'2018-06-06'
                                                                      ) d
                                                          on a.date = date_trunc('day',d.sold_ts)
                                                          and b.channel = d.channel
                                                          and c.retention_type_u = d.retention_type_u
                                                          --and d.sub_u = e.sub_u
                                                          where year(a.date)>= 2017
                                                          --where a.date between '2018-05-31'and'2018-06-06'
                                                          and a.date <= current_timestamp()
                                                          group by 1,3, rollup(2) ) m
                                                ) xyz
                                                group by 1,2,3,4,conversions,bookings
                                                --order by channel asc, retention_type_u,  date asc
                                                 ) aa
                                          left join
                                                    (
                                                    select
                                                               first_day_of_month,
                                                               negative_date,
                                                               channel,
                                                               retention_type_u,
                                                              -- sub_u,
                                                               negative_cnt,
                                                               negative_amt,
                                                               sum(negative_cnt) over(partition by first_day_of_month, channel, retention_type_u order by negative_date asc ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_neg_cnt,
                                                               sum(negative_amt) over(partition by first_day_of_month, channel, retention_type_u order by negative_date asc ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_neg_amt
                                                        from
                                                        (
                                                         select
                                                               date_trunc('month',negative_date) as first_day_of_month,
                                                               negative_date,
                                                               case when channel is null then 'Total'
                                                               else channel end as channel,
                                                               retention_type_u,
                                                               --sub_u,
                                                               negative_cnt,
                                                               negative_amt
                                                             from (
                                                                    select date_trunc('day',coalesce(a.chargeback_ts, a.refund_ts)) as negative_date,
                                                                           case when channel = 'Paid Search' and lower(campaign) like '%display%' then 'CPC Display'
                                                                                when channel = 'Paid Search' and medium = 'display' then 'CPC Display'
                                                                                when channel = 'Paid Search' then 'SEM'
                                                                                when channel in ('Email', 'Paid Email') then 'Email'
                                                                                else channel end as channel,
                                                                            case when a.retention_type_u='migration returner' then 'returner'
                                                                                 when a.retention_type_u='migration winback' then 'returner'
                                                                                 when a.retention_type_u='returner' then'returner'
                                                                                 when a.retention_type_u='winback' then 'returner'
                                                                            else a.retention_type_u end as retention_type_u,
                                                                            --a.sub_u,
                                                                            count(distinct case when chargeback_ts is not null or refund_ts is not null then a.merchant_id end) as negative_cnt,
                                                                            sum(case when chargeback_ts is not null or refund_ts is not null then usd_price end) as negative_amt
                                                                     from analytics.bi_subscription_events a
                                                                     inner join analytics.bi_conversion_events b
                                                                     on a.merchant_id = b.merchant_id
                                                                     and rank_desc ='1'
                                                                     where year(chargeback_ts) >= 2017
                                                                    -- where date_trunc('day',chargeback_ts) between '2018-05-31'and'2018-06-06'
                                                                     or year(refund_ts) >= 2017
                                                                     --or date_trunc('day',refund_ts) between '2018-05-31'and'2018-06-06'
                                                                     group by 1,3, rollup(2)
                                                                     ) n
                                                                     )aaa
                                                                     group by 1,2,3,4,negative_cnt,negative_amt
                                                                     order by channel asc, retention_type_u,  negative_date asc
                                                  ) bb
                                          on date_trunc('day',aa.date) = bb.negative_date
                                          and aa.channel = bb.channel
                                          and aa.retention_type_u = bb.retention_type_u
                                )aaaa
                               group by 1,2,3
                                order by channel asc, retention_type_u,  date asc , cumulative_fts desc
            ) c
            on b.channel = c.channel
            and d.retention_type_u = c.retention_type_u
            --where a.date = '2018-06-06'
            group by 1,2,3,4
            order by 1
                        )m
                        --where date between '2018-01-01' and '2018-01-05'
                        group by 1,2
                        order by 1,2
        )b
        on a.date = b.date
        and a.channel = b.channel
      