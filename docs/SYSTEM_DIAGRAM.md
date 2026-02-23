# System Diagram (Phase 1)

```
[ User ]
   |
   v
[ PWA (Landing -> Module Page) ]
   |
   v
POST /.netlify/functions/api/submit
   |
   v
[ Universal Submit Function ]
   |-- Validate (schema)
   |-- Log submission (stub)
   |-- Send email (stub)
   |-- Create calendar event (stub)
   v
[ Success Screen ]
```
