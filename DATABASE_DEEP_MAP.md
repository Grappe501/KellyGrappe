# Database Deep Map

## ballot_initiatives
- accessible: True
- row_count: 4
- columns:
  - id
  - name
  - created_at
- signals:
  - email: False
  - phone: False
  - name: True
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 1

## calendar_events
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## campaign_contacts
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## candidates
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## civic_engagement_index
- accessible: True
- row_count: 228550
- columns:
  - id
  - voter_id
  - initiative_signatures
  - activism_score
  - created_at
  - updated_at
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: True
  - score: 1

## civic_interests
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## civic_profiles
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## contact_messages
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## contacts
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## contest_partisan_index
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## contests
- accessible: True
- row_count: 2008
- columns:
  - id
  - election_id
  - external_id
  - office
  - district
  - created_at
  - contest_name
  - total_votes
- signals:
  - email: False
  - phone: False
  - name: True
  - districting: True
  - messaging: False
  - identity_link: False
  - score: 2

## county_turnout
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## discord_members
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## donations
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## elections
- accessible: True
- row_count: 13
- columns:
  - id
  - year
  - election_type
  - election_date
  - created_at
  - external_id
  - name
  - election_scope
  - metadata
- signals:
  - email: False
  - phone: False
  - name: True
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 1

## entities
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## entity_reviews
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## event_requests
- accessible: True
- row_count: 7
- columns:
  - id
  - contact_name
  - contact_email
  - contact_phone
  - organization
  - event_title
  - event_type
  - event_description
  - start_time
  - end_time
  - timezone
  - venue_name
  - address_line1
  - address_line2
  - city
  - state
  - zip
  - requested_role
  - expected_attendance
  - media_expected
  - status
  - calendar_event_id
  - hold_event_id
  - travel_block_ids
  - ai_priority_score
  - ai_notes
  - ip_hash
  - visitor_id
  - user_agent
  - created_at
  - updated_at
- signals:
  - email: True
  - phone: True
  - name: True
  - districting: False
  - messaging: True
  - identity_link: False
  - score: 4

## events
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## followups
- accessible: True
- row_count: 22
- columns:
  - id
  - source
  - module_id
  - status
  - title
  - notes
  - contact_name
  - contact_email
  - contact_phone
  - visitor_id
  - ip_hash
  - user_agent
  - payload
  - calendar_event_id
  - calendar_event_link
  - archived
  - completed_at
  - created_at
  - updated_at
  - contact_eligible
  - entry_initials
  - permission_to_contact
  - contact_id
- signals:
  - email: True
  - phone: True
  - name: True
  - districting: False
  - messaging: True
  - identity_link: True
  - score: 5

## geographic_targets
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## ingestion_entities
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## ingestion_files
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## ingestion_jobs
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## ingestion_reviews
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## initiative_signatures
- accessible: True
- row_count: 303448
- columns:
  - id
  - initiative_id
  - voter_id
  - created_at
  - county
  - first_name
  - last_name
  - dob
- signals:
  - email: False
  - phone: False
  - name: True
  - districting: True
  - messaging: False
  - identity_link: True
  - score: 3

## message_campaigns
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## message_deliveries
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## message_queue
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## organizations
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## organizer_assignments
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## organizer_progress
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## organizer_tree
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## profiles
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## runoff_fracture_index
- accessible: True
- row_count: 75
- columns:
  - id
  - county
  - precinct
  - norris_votes
  - hammer_votes
  - harrison_votes
  - total_votes
  - norris_share
  - hammer_share
  - harrison_share
  - harrison_overperformance
  - fracture_risk_score
  - libertarian_leakage_score
  - calm_middle_opportunity_score
  - model_version
  - created_at
  - updated_at
  - total_precincts
  - precincts_reporting
  - precincts_partially_reporting
  - reporting_completeness_score
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: True
  - messaging: False
  - identity_link: False
  - score: 1

## social_handles
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## squarespace_form_submissions
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## supporters
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## training_certifications
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## training_enrollments
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## training_events
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## training_progress
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## uploaded_files
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## uploads
- accessible: False
- row_count: None
- error: {'message': 'JSON could not be generated', 'code': 404, 'hint': 'Refer to full message for details', 'details': "b''"}

## users
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## volunteers
- accessible: True
- row_count: 0
- columns:
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: False
  - score: 0

## voter_party_model
- accessible: True
- row_count: 228550
- columns:
  - id
  - voter_id
  - initiative_signatures
  - activism_score
  - dem_support_score
  - rep_support_score
  - persuasion_score
  - model_version
  - created_at
  - updated_at
- signals:
  - email: False
  - phone: False
  - name: False
  - districting: False
  - messaging: False
  - identity_link: True
  - score: 1

## voters
- accessible: True
- row_count: 1805038
- columns:
  - voter_id
  - county
  - first_name
  - last_name
  - precinct_code
  - congressional_district
  - state_house_district
  - state_senate_district
  - date_last_voted
  - raw_attributes
- signals:
  - email: False
  - phone: False
  - name: True
  - districting: True
  - messaging: False
  - identity_link: True
  - score: 3

