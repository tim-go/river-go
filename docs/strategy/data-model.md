# Data Model

## Summary

This document defines the initial product-level data model for River Go. It is not yet a database schema, but it should guide future implementation.

The model centres on river sections, with gauges, access points, features, hazards, photos, condition reports, and community confirmations attached to them.

## Core Entities

## River

Represents a named watercourse.

Fields:

- id
- name
- alternate_names
- country
- region
- geometry
- description
- source_refs
- created_at
- updated_at

Relationships:

- has many river sections
- has many gauges

## River Section

Represents a paddleable stretch between a put-in and take-out.

Fields:

- id
- river_id
- name
- slug
- summary
- start_location
- end_location
- route_geometry
- distance_km
- estimated_time_min
- difficulty
- whitewater_grade
- canoe_suitability
- craft_suitability
- access_summary
- level_summary
- created_at
- updated_at
- last_community_update_at

Relationships:

- belongs to river
- has many access points
- has many features
- has many hazards
- has many photos
- has many condition reports
- has many runnable ranges
- links to one or more gauges

## Gauge

Represents a river-level or flow measurement location.

Fields:

- id
- provider
- provider_station_id
- name
- location
- river_id
- unit
- measure_type
- latest_value
- latest_observed_at
- trend
- status
- source_url
- created_at
- updated_at

Measure types:

- level
- flow
- forecast_level
- forecast_flow

Relationships:

- may belong to river
- may link to many river sections
- has many gauge readings

## Gauge Reading

Represents one observed or forecast gauge value.

Fields:

- id
- gauge_id
- observed_at
- value
- unit
- measure_type
- quality_code
- source_payload_ref
- created_at

## Section Gauge Link

Connects a gauge to a river section and explains how relevant it is.

Fields:

- id
- river_section_id
- gauge_id
- relevance
- notes
- distance_from_section_km
- created_at
- updated_at

Relevance values:

- primary
- secondary
- upstream
- downstream
- proxy
- unknown

## Access Point

Represents a practical location for entering, exiting, portaging, parking, or reaching the water.

Fields:

- id
- river_section_id
- type
- name
- location
- description
- access_status
- access_context
- parking_notes
- public_transport_notes
- licence_notes
- source_refs
- created_by_user_id
- created_at
- updated_at
- last_confirmed_at

Types:

- put_in
- take_out
- put_in_take_out
- portage_start
- portage_end
- parking
- public_transport
- campsite
- facility
- lock_landing
- emergency_exit

## Feature

Represents a non-hazard river feature or useful place.

Fields:

- id
- river_section_id
- type
- name
- location
- description
- created_by_user_id
- created_at
- updated_at
- last_confirmed_at

## Hazard

Represents a safety-relevant feature or issue.

Fields:

- id
- river_section_id
- type
- severity
- status
- location
- title
- description
- date_observed
- last_confirmed_at
- resolved_at
- reported_by_user_id
- confidence_score
- level_dependency
- moderation_status
- created_at
- updated_at

Status values:

- active
- resolved
- seasonal
- unknown
- needs_confirmation

Severity values:

- info
- caution
- significant
- serious
- extreme

## Photo

Represents a user-uploaded image.

Fields:

- id
- uploaded_by_user_id
- image_url
- thumbnail_url
- category
- caption
- location
- date_taken
- moderation_status
- created_at
- updated_at

Relationships:

- may attach to river section
- may attach to access point
- may attach to feature
- may attach to hazard
- may attach to condition report

## Condition Report

Represents a time-sensitive user update.

Fields:

- id
- river_section_id
- report_type
- note
- date_observed
- level_impression
- craft_type
- created_by_user_id
- moderation_status
- stale_status
- created_at
- updated_at

Report types:

- paddled_recently
- level_report
- hazard_update
- access_update
- parking_update
- portage_update
- water_quality
- event_or_closure
- general_note

## Runnable Range

Represents community guidance for interpreting a gauge value on a specific section.

Fields:

- id
- river_section_id
- gauge_id
- craft_type
- ability_level
- unit
- too_low_max
- low_min
- good_min
- good_max
- high_min
- not_recommended_min
- notes
- confidence_score
- created_by_user_id
- reviewed_at
- created_at
- updated_at

Runnable ranges should be treated as guidance, not safety certification.

## User

Represents a member account.

Fields:

- id
- display_name
- email
- role
- home_region
- club_affiliations
- reputation_score
- created_at
- updated_at

Roles:

- member
- trusted_contributor
- club_contributor
- moderator
- admin

## Confirmation

Represents a user confirming that an existing contribution is still accurate.

Fields:

- id
- target_type
- target_id
- confirmed_by_user_id
- confirmed_at
- note
- created_at

Targets may include:

- hazard
- access point
- feature
- runnable range
- condition report

## Flag

Represents a user dispute or moderation flag.

Fields:

- id
- target_type
- target_id
- flagged_by_user_id
- reason
- note
- status
- reviewed_by_user_id
- reviewed_at
- created_at
- updated_at

Reasons:

- inaccurate_location
- duplicate
- stale
- unsafe_advice
- access_dispute
- legal_concern
- offensive
- privacy_concern
- spam
- needs_evidence

## Watch

Represents a user watching a river section.

Fields:

- id
- user_id
- river_section_id
- notify_new_hazards
- notify_condition_reports
- notify_level_thresholds
- created_at
- updated_at

## Level Alert

Represents a user-defined gauge threshold alert.

Fields:

- id
- user_id
- river_section_id
- gauge_id
- threshold_type
- threshold_value
- unit
- enabled
- created_at
- updated_at

Threshold types:

- rises_above
- falls_below
- enters_good_range
- leaves_good_range

## Moderation Status

Suggested common values:

- visible
- pending_review
- hidden
- rejected
- merged

## Open Questions

- Should anonymous users be allowed to submit anything, or only registered members?
- How should club affiliation be verified?
- Should access notes have stricter moderation than photos and general features?
- How should contested access be represented without making legal claims?
- How much historical gauge data should be stored locally versus fetched on demand?
- Should runnable ranges be crowd-sourced directly or curated from repeated condition reports?

