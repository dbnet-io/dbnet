

with team_users as (
  select
    _sdc_source_key__id as team_id,
    count(memberid) as users_cnt
  from "prod"."leadiqplay"."team__members"
  group by 1
)
, teams as (
    select
        team._id as team_id,
        team.heimdallteamid as heimdall_team_id,
        heimdall_teams.customer_id,
        team.teamname as team_name,
        team.createddate::timestamp as created_at,
        team.updateddate::timestamp as updated_at,
        team.resetdate::timestamp as reset_date,
        team.resetintervalinmonths as reset_interval_in_months,
        coalesce(team.admincount, 0) as admin_count,
        coalesce(team.disabled, false) as disabled,
        team.maxcredits as credit_limit,
        team.maxpremiumcredits as premium_credit_limit,
        team_users.users_cnt as num_of_users,
        team.maxteamsize as max_team_size,
        team.credits as credits_used_this_period,
        coalesce(team.usedpremiumcredits, 0) as premium_credits_used_overall,
        customers.email as cust_email,
        lower(split_part(customers.email, '@', 2)) as domain,
        team.premiumcredits as premium_credits_used_this_period
    from "prod"."leadiqplay"."team"
    left join team_users
      on team_users.team_id = team._id
    left join "prod"."leadiqplay"."heimdall_teams"
      on team.heimdallteamid = heimdall_teams.id
    left join "prod"."chargebee"."customers"
      on customers.id = heimdall_teams.customer_id
    where _sdc_deleted_at is null
)
, missing_arr_teams as (
    select
      arr_teams.customer_id as team_id,
      arr_teams.heimdall_id as heimdall_team_id,
      arr_teams.customer_id as customer_id,
      arr_teams.company as team_name,
      customers.created_at::timestamp as created_at,
      customers.updated_at as updated_at,
      null::timestamp as reset_date,
      0 as reset_interval_in_months,
      0 as admin_count,
      false as disabled,
      0 as credit_limit,
      0 as premium_credit_limit,
      0 as num_of_users,
      0 as max_team_size,
      0 as credits_used_this_period,
      0 as premium_credits_used_overall,
      customers.email as cust_email,
      lower(split_part(customers.email, '@', 2)) as domain,
      0 as premium_credits_used_this_period
    from "prod"."dbt_utils"."customers_with_arr_but_no_team" arr_teams
    left join "prod"."chargebee"."customers"
      on customers.id = arr_teams.customer_id
)
select * from teams union all
select * from missing_arr_teams