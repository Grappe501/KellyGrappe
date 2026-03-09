/* app/src/modules/dashboard/WarRoomDashboardPage.tsx
   War Room Command Console
*/

import React, { useEffect, useState } from "react"

import Container from "@components/Container"

import CommandSearchCard from "./components/CommandSearchCard"
import VoteGoalCard from "./components/VoteGoalCard"
import ContactsCard from "./components/ContactsCard"
import FollowUpsCard from "./components/FollowUpsCard"
import PowerOf5Card from "./components/PowerOf5Card"
import FollowUpBreakdownCard from "./components/FollowUpBreakdownCard"
import MessagingCenterCard from "./components/MessagingCenterCard"
import CommandSummaryCard from "./components/CommandSummaryCard"

import { listContacts } from "@services/contacts.service"
import { listLiveFollowUps } from "@services/followups.service"

import type { LiveFollowUp } from "@db/contactsDb.types"

/* ---------------- CONFIG ---------------- */

const DEFAULT_VOTE_GOAL = 45000
const REFRESH_INTERVAL = 10000

/* ---------------- TYPES ---------------- */

type DashboardMetrics = {

  contacts:number

  followups:{
    new:number
    inProgress:number
    completed:number
    archived:number
  }

  voteCoverage:number

}

/* ---------------- METRIC LOADER ---------------- */

async function loadMetrics():Promise<DashboardMetrics>{

  const contacts = await listContacts().catch(()=>[])

  const followups =
    (await listLiveFollowUps().catch(()=>[])) as LiveFollowUp[]

  const newFU =
    followups.filter(f=>f.followUpStatus==="NEW").length

  const inProgressFU =
    followups.filter(f=>f.followUpStatus==="IN_PROGRESS").length

  const completedFU =
    followups.filter(f=>f.followUpStatus==="COMPLETED").length

  const archivedFU =
    followups.filter(f=>f.archived===true).length

  const coverage =
    Math.round(
      (contacts.length/DEFAULT_VOTE_GOAL)*100
    )

  return{

    contacts:contacts.length,

    followups:{
      new:newFU,
      inProgress:inProgressFU,
      completed:completedFU,
      archived:archivedFU
    },

    voteCoverage:coverage

  }

}

/* ---------------- PAGE ---------------- */

export default function WarRoomDashboardPage(){

  const [metrics,setMetrics] =
    useState<DashboardMetrics|null>(null)

  const [lastRefresh,setLastRefresh] =
    useState<number>(Date.now())

  async function refresh(){

    const m = await loadMetrics()

    setMetrics(m)

    setLastRefresh(Date.now())

  }

  useEffect(()=>{

    refresh()

    const interval =
      setInterval(refresh,REFRESH_INTERVAL)

    return()=>clearInterval(interval)

  },[])

  if(!metrics){

    return(
      <Container>
        <div className="p-6 text-sm text-slate-600">
          Loading War Room...
        </div>
      </Container>
    )

  }

  return(

    <Container>

      <div className="space-y-8 p-6">

        {/* HEADER */}

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-3xl font-bold text-slate-900">
              Campaign War Room
            </h1>

            <p className="text-sm text-slate-500">
              Updated {new Date(lastRefresh).toLocaleTimeString()}
            </p>

          </div>

          <button
            onClick={refresh}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded"
          >
            Refresh
          </button>

        </div>

        {/* COMMAND SEARCH */}

        <CommandSearchCard />

        {/* METRICS ROW */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

          <VoteGoalCard
            coverage={metrics.voteCoverage}
          />

          <ContactsCard
            contacts={metrics.contacts}
          />

          <FollowUpsCard
            newCount={metrics.followups.new}
            inProgress={metrics.followups.inProgress}
          />

          <PowerOf5Card />

        </div>

        {/* OPERATIONS ROW */}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          <FollowUpBreakdownCard
            data={metrics.followups}
          />

          <CommandSummaryCard
            metrics={metrics}
          />

        </div>

        {/* MESSAGING */}

        <MessagingCenterCard />

      </div>

    </Container>

  )

}