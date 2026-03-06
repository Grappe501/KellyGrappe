Overlay purpose
---------------
This overlay adds the next Contact Intelligence layer:
- Contact import now accepts rows with email OR phone even if the name is missing.
- Contact intelligence directory with AI sorting, district filters, and precinct heat preview.
- Contact profile with voter intelligence, follow-up creation, and richer enrichment fields.
- Voter File Lab page to stage a statewide voter CSV sample and preview turnout/persuasion logic.
- Schema-safe contacts-bulk-upsert function.
- Supabase SQL file for contact + statewide voter architecture.
- Scaffolding functions for precinct demographics and precinct leaders API integration.

Important
---------
1. Run the included PowerShell installer from this overlay folder.
2. Use netlify dev when testing serverless functions locally.
3. Apply the SQL in supabase/contact_intelligence_schema.sql before expecting cloud upserts to fully land.
