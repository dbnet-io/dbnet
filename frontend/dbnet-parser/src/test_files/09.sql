

with subscriptions as (
    select
        *
        , json_extract_path_text(replace(meta_data, '\'', '\"'), 'transferred_to_sub_id', TRUE) as transferred_to_subscription_id
    from "prod"."chargebee"."subscriptions"
)

, transferors as (
    select *
    from subscriptions
    where transferred_to_subscription_id is not NULL
)

, transferred_to as (
    select subscriptions.*
    from subscriptions
    inner join transferors on subscriptions.id = transferors.transferred_to_subscription_id
)

, combined as (
    select
        subscriptions.*
        , COALESCE((transferred_to.customer_id = subscriptions.customer_id) and (datediff('day', transferred_to.started_at, subscriptions.cancelled_at) >= 0), false) as valid_transfer -- valid if transferred within the same customer_id AND the new subscription was started either on the same dat or before the day the old subscription was cancelled
        , CASE WHEN valid_transfer then GREATEST(transferred_to.created_at, transferred_to.started_at) end as billing_transferred_at
        , CASE WHEN valid_transfer then transferred_to.started_at end as usage_transferred_at
    from subscriptions
    left join transferred_to on subscriptions.transferred_to_subscription_id = transferred_to.id
)

, stg_chargebee__subscriptions as (
    select
        -- ids
        combined.id as subscription_id
        , combined.customer_id
        , combined.plan_id
        , CASE WHEN valid_transfer then combined.transferred_to_subscription_id else NULL end as transferred_to_subscription_id
        , combined.status
        , DECODE(combined.status,
            'cancelled', 0,
            'active', 1,
            'non_renewing', 1,
            NULL
            ) as status_code
        , combined.billing_period::INTEGER
        , combined.billing_period_unit
        , (combined.plan_amount::float / 100)::DECIMAL(18,2) as plan_amount
        , (combined.mrr::float / 100)::DECIMAL(18,2) as mrr
        , combined.currency_code
        , combined.plan_quantity
        , combined.po_number
        , combined.total_dues
        , combined.due_invoices_count
        , combined.remaining_billing_cycles
        , combined.cancel_reason
        , combined.valid_transfer
        , COALESCE(DECODE(LOWER(combined.auto_collection), 'off', 0, 'on', 1)::INTEGER::BOOLEAN, false) as has_auto_collection_enabled
        , combined.has_scheduled_changes::BOOLEAN
        , combined.deleted::BOOLEAN as is_deleted
        , combined.updated_at::TIMESTAMP
        , combined.current_term_start::TIMESTAMP
        , combined.current_term_end::TIMESTAMP
        , combined.next_billing_at::TIMESTAMP
        , combined.due_since::TIMESTAMP as invoice_was_due_at
        , combined.created_at::TIMESTAMP
        , combined.start_date::TIMESTAMP as starts_at
        , combined.started_at::TIMESTAMP
        , combined.activated_at::TIMESTAMP
        , combined.billing_transferred_at::TIMESTAMP
        , combined.usage_transferred_at::TIMESTAMP
        , combined.cancelled_at::TIMESTAMP

    from combined
    where
        combined.started_at is not null
        and is_deleted is FALSE
        and (customer_id+'|'+subscription_id <> '16BZ8RRsIw1Se2yo3'+'|'+'6opQ4RsNCJtFOY1') -- exclude Chargebee sub transfer from "Default for Tony Liao" to "Airgraft"
)

select * from stg_chargebee__subscriptions