

with leadiq_events_source as (
  select
    event_measures.event_date as event_date,
    event_measures.team_id as team_id,
    event_measures.user_id as user_id,
    event_measures.is_paid as is_paid,
    sum(event_measures.invite_accepts) as invite_accepts,
    sum(event_measures.user_sign_ups) as user_sign_ups,
    sum(event_measures.lead_searches) as lead_searches,
    sum(event_measures.profile_views) as profile_views,
    sum(event_measures.leadiq_captures) as leadiq_captures,
    sum(event_measures.work_emails_searches) as work_emails_searches,
    sum(event_measures.work_emails_unlocks) as work_emails_unlocks,
    sum(event_measures.work_phones_searches) as work_phones_searches,
    sum(event_measures.work_phones_unlocks) as work_phones_unlocks,
    sum(event_measures.mobile_phones_searches) as mobile_phones_searches,
    sum(event_measures.mobile_phones_unlocks) as mobile_phones_unlocks,
    sum(event_measures.personal_data_searches) as personal_data_searches,
    sum(event_measures.personal_data_unlocks) as personal_data_unlocks,
    sum(event_measures.personal_emails_searches) as personal_emails_searches,
    sum(event_measures.personal_emails_unlocks) as personal_emails_unlocks,
    sum(event_measures.personal_phones_unlocks) as personal_phones_unlocks,
    sum(event_measures.work_phones_searches) + sum(event_measures.mobile_phones_searches) as phones_searches,
    sum(event_measures.work_phones_unlocks) + sum(event_measures.mobile_phones_unlocks) as phones_unlocks,
    sum(event_measures.work_emails_searches) + sum(event_measures.personal_emails_searches) as emails_searches,
    sum(event_measures.work_emails_unlocks) + sum(event_measures.personal_emails_unlocks) as emails_unlocks,
    sum(event_measures.hubspot_events) as hubspot_events,
    sum(event_measures.salesforce_events) as salesforce_events,
    sum(event_measures.outreach_events) as outreach_events,
    sum(event_measures.salesloft_events) as salesloft_events,
  
    min(team_milestones.hubspot_enabled_at) as hubspot_enabled_at,
    min(team_milestones.salesforce_enabled_at) as salesforce_enabled_at,
    min(team_milestones.outreach_enabled_at) as outreach_enabled_at,
    min(team_milestones.salesloft_enabled_at) as salesloft_enabled_at,
  
    min(user_milestones.first_event) as first_event,
    min(user_milestones.first_invite_accept) as first_invite_accept,
    min(user_milestones.first_lead_search) as first_lead_search,
    min(user_milestones.first_profile_view) as first_profile_view,
    min(user_milestones.first_leadiq_capture) as first_leadiq_capture,
  
    count(1) as num_events
  from "prod"."dbtdev_events"."event_measures" event_measures
  left join "prod"."dbtdev_leadiq"."team_milestones" team_milestones
    on team_milestones.team_id = event_measures.team_id
  left join "prod"."dbtdev_leadiq"."user_milestones" user_milestones
    on user_milestones.team_id = event_measures.team_id
    and user_milestones.user_id = event_measures.user_id
  group by 1, 2, 3, 4
)
, leadiq_events_dates as (
  select distinct
leadiq_events_source.is_paid as is_paid,
    
    date_trunc('day', leadiq_events_source.event_date)
 as date
  from leadiq_events_source
  
)
, leadiq_events_by_day as (
  select
    leadiq_events_dates.date as date,
leadiq_events_dates.is_paid as is_paid,

    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.invite_accepts end, 0))  as daily_invite_accepts,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.invite_accepts end, 0)) as rolling7_invite_accepts,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.invite_accepts end, 0)) as rolling30_invite_accepts,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.invite_accepts end, 0)) as rolling90_invite_accepts,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.invite_accepts end, 0))  as cumul_invite_accepts,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.user_sign_ups end, 0))  as daily_user_sign_ups,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.user_sign_ups end, 0)) as rolling7_user_sign_ups,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.user_sign_ups end, 0)) as rolling30_user_sign_ups,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.user_sign_ups end, 0)) as rolling90_user_sign_ups,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.user_sign_ups end, 0))  as cumul_user_sign_ups,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.lead_searches end, 0))  as daily_lead_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)) as rolling7_lead_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)) as rolling30_lead_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)) as rolling90_lead_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.lead_searches end, 0))  as cumul_lead_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.profile_views end, 0))  as daily_profile_views,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.profile_views end, 0)) as rolling7_profile_views,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.profile_views end, 0)) as rolling30_profile_views,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.profile_views end, 0)) as rolling90_profile_views,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.profile_views end, 0))  as cumul_profile_views,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.leadiq_captures end, 0))  as daily_leadiq_captures,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.leadiq_captures end, 0)) as rolling7_leadiq_captures,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.leadiq_captures end, 0)) as rolling30_leadiq_captures,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.leadiq_captures end, 0)) as rolling90_leadiq_captures,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.leadiq_captures end, 0))  as cumul_leadiq_captures,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.work_emails_searches end, 0))  as daily_work_emails_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_emails_searches end, 0)) as rolling7_work_emails_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_emails_searches end, 0)) as rolling30_work_emails_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_emails_searches end, 0)) as rolling90_work_emails_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.work_emails_searches end, 0))  as cumul_work_emails_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.work_emails_unlocks end, 0))  as daily_work_emails_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_emails_unlocks end, 0)) as rolling7_work_emails_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_emails_unlocks end, 0)) as rolling30_work_emails_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_emails_unlocks end, 0)) as rolling90_work_emails_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.work_emails_unlocks end, 0))  as cumul_work_emails_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.work_phones_searches end, 0))  as daily_work_phones_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_phones_searches end, 0)) as rolling7_work_phones_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_phones_searches end, 0)) as rolling30_work_phones_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_phones_searches end, 0)) as rolling90_work_phones_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.work_phones_searches end, 0))  as cumul_work_phones_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.work_phones_unlocks end, 0))  as daily_work_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_phones_unlocks end, 0)) as rolling7_work_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_phones_unlocks end, 0)) as rolling30_work_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.work_phones_unlocks end, 0)) as rolling90_work_phones_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.work_phones_unlocks end, 0))  as cumul_work_phones_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.mobile_phones_searches end, 0))  as daily_mobile_phones_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.mobile_phones_searches end, 0)) as rolling7_mobile_phones_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.mobile_phones_searches end, 0)) as rolling30_mobile_phones_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.mobile_phones_searches end, 0)) as rolling90_mobile_phones_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.mobile_phones_searches end, 0))  as cumul_mobile_phones_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.mobile_phones_unlocks end, 0))  as daily_mobile_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.mobile_phones_unlocks end, 0)) as rolling7_mobile_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.mobile_phones_unlocks end, 0)) as rolling30_mobile_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.mobile_phones_unlocks end, 0)) as rolling90_mobile_phones_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.mobile_phones_unlocks end, 0))  as cumul_mobile_phones_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.personal_data_searches end, 0))  as daily_personal_data_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_data_searches end, 0)) as rolling7_personal_data_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_data_searches end, 0)) as rolling30_personal_data_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_data_searches end, 0)) as rolling90_personal_data_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.personal_data_searches end, 0))  as cumul_personal_data_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.personal_data_unlocks end, 0))  as daily_personal_data_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_data_unlocks end, 0)) as rolling7_personal_data_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_data_unlocks end, 0)) as rolling30_personal_data_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_data_unlocks end, 0)) as rolling90_personal_data_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.personal_data_unlocks end, 0))  as cumul_personal_data_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.personal_emails_searches end, 0))  as daily_personal_emails_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_emails_searches end, 0)) as rolling7_personal_emails_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_emails_searches end, 0)) as rolling30_personal_emails_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_emails_searches end, 0)) as rolling90_personal_emails_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.personal_emails_searches end, 0))  as cumul_personal_emails_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.personal_emails_unlocks end, 0))  as daily_personal_emails_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_emails_unlocks end, 0)) as rolling7_personal_emails_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_emails_unlocks end, 0)) as rolling30_personal_emails_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_emails_unlocks end, 0)) as rolling90_personal_emails_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.personal_emails_unlocks end, 0))  as cumul_personal_emails_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.personal_phones_unlocks end, 0))  as daily_personal_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_phones_unlocks end, 0)) as rolling7_personal_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_phones_unlocks end, 0)) as rolling30_personal_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.personal_phones_unlocks end, 0)) as rolling90_personal_phones_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.personal_phones_unlocks end, 0))  as cumul_personal_phones_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.phones_searches end, 0))  as daily_phones_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.phones_searches end, 0)) as rolling7_phones_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.phones_searches end, 0)) as rolling30_phones_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.phones_searches end, 0)) as rolling90_phones_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.phones_searches end, 0))  as cumul_phones_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.phones_unlocks end, 0))  as daily_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.phones_unlocks end, 0)) as rolling7_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.phones_unlocks end, 0)) as rolling30_phones_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.phones_unlocks end, 0)) as rolling90_phones_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.phones_unlocks end, 0))  as cumul_phones_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.emails_searches end, 0))  as daily_emails_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.emails_searches end, 0)) as rolling7_emails_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.emails_searches end, 0)) as rolling30_emails_searches,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.emails_searches end, 0)) as rolling90_emails_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.emails_searches end, 0))  as cumul_emails_searches,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.emails_unlocks end, 0))  as daily_emails_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.emails_unlocks end, 0)) as rolling7_emails_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.emails_unlocks end, 0)) as rolling30_emails_unlocks,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.emails_unlocks end, 0)) as rolling90_emails_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.emails_unlocks end, 0))  as cumul_emails_unlocks,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.hubspot_events end, 0))  as daily_hubspot_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.hubspot_events end, 0)) as rolling7_hubspot_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.hubspot_events end, 0)) as rolling30_hubspot_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.hubspot_events end, 0)) as rolling90_hubspot_events,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.hubspot_events end, 0))  as cumul_hubspot_events,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.salesforce_events end, 0))  as daily_salesforce_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.salesforce_events end, 0)) as rolling7_salesforce_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.salesforce_events end, 0)) as rolling30_salesforce_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.salesforce_events end, 0)) as rolling90_salesforce_events,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.salesforce_events end, 0))  as cumul_salesforce_events,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.outreach_events end, 0))  as daily_outreach_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.outreach_events end, 0)) as rolling7_outreach_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.outreach_events end, 0)) as rolling30_outreach_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.outreach_events end, 0)) as rolling90_outreach_events,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.outreach_events end, 0))  as cumul_outreach_events,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.salesloft_events end, 0))  as daily_salesloft_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.salesloft_events end, 0)) as rolling7_salesloft_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.salesloft_events end, 0)) as rolling30_salesloft_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.salesloft_events end, 0)) as rolling90_salesloft_events,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.salesloft_events end, 0))  as cumul_salesloft_events,
    coalesce(count(distinct case when leadiq_events_source.hubspot_enabled_at <= leadiq_events_dates.date then leadiq_events_source.team_id end), 0) as cumul_hubspot_enabled_teams,
    coalesce(count(distinct case when leadiq_events_source.salesforce_enabled_at <= leadiq_events_dates.date then leadiq_events_source.team_id end), 0) as cumul_salesforce_enabled_teams,
    coalesce(count(distinct case when leadiq_events_source.outreach_enabled_at <= leadiq_events_dates.date then leadiq_events_source.team_id end), 0) as cumul_outreach_enabled_teams,
    coalesce(count(distinct case when leadiq_events_source.salesloft_enabled_at <= leadiq_events_dates.date then leadiq_events_source.team_id end), 0) as cumul_salesloft_enabled_teams,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.num_events end, 0))  as daily_num_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.num_events end, 0)) as rolling7_num_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.num_events end, 0)) as rolling30_num_events,
    sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.num_events end, 0)) as rolling90_num_events,
    sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.num_events end, 0))  as cumul_num_events,
    count(distinct case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.user_id end)  as daily_active_users,
    count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.user_id end)  as rolling7_active_users,
    count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.user_id end)  as rolling30_active_users,
    count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.user_id end)  as rolling90_active_users,
    count(distinct case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.team_id end)  as daily_active_teams,
    count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.team_id end)  as rolling7_active_teams,
    count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.team_id end)  as rolling30_active_teams,
    count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.team_id end)  as rolling90_active_teams,
    coalesce(1.0 * count(distinct case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.user_id end) / nullif(count(distinct case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.team_id end), 0), 0) as daily_active_users_per_team,
    coalesce(1.0 * count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.user_id end) / nullif(count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.team_id end), 0), 0) as rolling7_active_users_per_team,
    coalesce(1.0 * count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.user_id end) / nullif(count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.team_id end), 0), 0) as rolling30_active_users_per_team,
    coalesce(1.0 * count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.user_id end) / nullif(count(distinct case when leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.team_id end), 0), 0) as rolling90_active_users_per_team,
    coalesce(1.0 * count(distinct case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.user_id end) / nullif(count(distinct case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.team_id end), 0), 0) as cumul_active_users_per_team,
    coalesce(100.0 * sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.leadiq_captures end, 0)) / nullif(sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.lead_searches end, 0)), 0), 0) as daily_leadiq_capture_rate,
    coalesce(100.0 * sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.leadiq_captures end, 0)) / nullif(sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)), 0), 0) as rolling7_leadiq_capture_rate,
    coalesce(100.0 * sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.leadiq_captures end, 0)) / nullif(sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)), 0), 0) as rolling30_leadiq_capture_rate,
    coalesce(100.0 * sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.leadiq_captures end, 0)) / nullif(sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)), 0), 0) as rolling90_leadiq_capture_rate,
    coalesce(100.0 * sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.leadiq_captures end, 0)) / nullif(sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.lead_searches end, 0)), 0), 0) as cumul_leadiq_capture_rate,
    coalesce(100.0 * (sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.phones_unlocks end, 0)))/ nullif(sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.lead_searches end, 0)), 0), 0) as daily_phones_unlock_rate,
    coalesce(100.0 * (sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.phones_unlocks end, 0)))/ nullif(sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)), 0), 0) as rolling7_phones_unlock_rate,
    coalesce(100.0 * (sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.phones_unlocks end, 0)))/ nullif(sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)), 0), 0) as rolling30_phones_unlock_rate,
    coalesce(100.0 * (sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.phones_unlocks end, 0)))/ nullif(sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)), 0), 0) as rolling90_phones_unlock_rate,
    coalesce(100.0 * (sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.phones_unlocks end, 0)))/ nullif(sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.lead_searches end, 0)), 0), 0) as cumul_phones_unlock_rate,
    coalesce(100.0 * (sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.emails_unlocks end, 0)))/ nullif(sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 = leadiq_events_dates.date then leadiq_events_source.lead_searches end, 0)), 0), 0) as daily_email_unlock_rate,
    coalesce(100.0 * (sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.emails_unlocks end, 0)))/ nullif(sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -7,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)), 0), 0) as rolling7_email_unlock_rate,
    coalesce(100.0 * (sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.emails_unlocks end, 0)))/ nullif(sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -30,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)), 0), 0) as rolling30_email_unlock_rate,
    coalesce(100.0 * (sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.emails_unlocks end, 0)))/ nullif(sum(coalesce(case when leadiq_events_source.event_date < leadiq_events_dates.date and leadiq_events_source.event_date >= 

    dateadd(
        day,
        -90,
        leadiq_events_dates.date
        )

 then leadiq_events_source.lead_searches end, 0)), 0), 0) as rolling90_email_unlock_rate,
    coalesce(100.0 * (sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.emails_unlocks end, 0)))/ nullif(sum(coalesce(case when 
    date_trunc('day', leadiq_events_source.event_date)
 <= leadiq_events_dates.date then leadiq_events_source.lead_searches end, 0)), 0), 0) as cumul_email_unlock_rate,
    
    coalesce(leadiq_events_dates.date::varchar, '') || '-' || coalesce(leadiq_events_dates.is_paid::varchar, '')
 as trend_key

  from leadiq_events_dates
  
  left join leadiq_events_source on 1=1 
    and leadiq_events_source.is_paid = leadiq_events_dates.is_paid

  group by 1, 2
)
select * from leadiq_events_by_day
  