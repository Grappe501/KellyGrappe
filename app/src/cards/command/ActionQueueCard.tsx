import React from "react"

import { Card, CardHeader, CardContent } from "../../../shared/components/Card"

type ActionQueueProps = {

  followUpsOverdue?:number
  followUpsUrgent?:number
  newVolunteers?:number
  eventStaffingGaps?:number

}

export default function ActionQueueCard({

  followUpsOverdue = 0,
  followUpsUrgent = 0,
  newVolunteers = 0,
  eventStaffingGaps = 0

}:ActionQueueProps){

  return(

    <Card>

      <CardHeader
        title="Action Queue"
        subtitle="Operational priorities"
      />

      <CardContent>

        <div className="space-y-3">

          <ActionItem
            label="Urgent Follow-Ups"
            value={followUpsUrgent}
          />

          <ActionItem
            label="Overdue Follow-Ups"
            value={followUpsOverdue}
          />

          <ActionItem
            label="New Volunteers"
            value={newVolunteers}
          />

          <ActionItem
            label="Event Staffing Gaps"
            value={eventStaffingGaps}
          />

        </div>

      </CardContent>

    </Card>

  )

}

function ActionItem({

  label,
  value

}:{label:string,value:number}){

  return(

    <div className="flex items-center justify-between p-3 border rounded bg-white">

      <div className="text-sm text-slate-700">
        {label}
      </div>

      <div className="text-sm font-bold text-slate-900">
        {value}
      </div>

    </div>

  )

}