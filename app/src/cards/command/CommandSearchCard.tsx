import React, { useState } from "react"

import { Card, CardHeader, CardContent } from "../../../shared/components/Card"
import { Input, Button } from "../../../shared/components/FormControls"

import { searchContacts } from "../../../shared/utils/db/services/contacts.service"

type ContactResult = {
  id:string
  fullName?:string
  phone?:string
  email?:string
}

export default function CommandSearchCard(){

  const [query,setQuery] = useState("")
  const [results,setResults] = useState<ContactResult[]>([])
  const [searching,setSearching] = useState(false)

  async function runSearch(q:string){

    const trimmed = q.trim()

    if(!trimmed){
      setResults([])
      return
    }

    try{

      setSearching(true)

      const res =
        await searchContacts(trimmed,{limit:8})

      setResults(res)

    }catch(err){

      console.error("Search error",err)

    }finally{

      setSearching(false)

    }

  }

  function handleChange(v:string){

    setQuery(v)

    runSearch(v)

  }

  return(

    <Card>

      <CardHeader
        title="Command Search"
        subtitle="Find any contact instantly"
      />

      <CardContent>

        <div className="space-y-4">

          <Input
            placeholder="Search name, phone, email..."
            value={query}
            onChange={(e)=>handleChange(e.target.value)}
          />

          {searching && (
            <div className="text-xs text-slate-500">
              Searching...
            </div>
          )}

          {results.length > 0 && (

            <div className="border rounded divide-y">

              {results.map(contact=>(

                <div
                  key={contact.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50"
                >

                  <div>

                    <div className="font-semibold text-sm">
                      {contact.fullName || "Unnamed Contact"}
                    </div>

                    <div className="text-xs text-slate-500">

                      {contact.phone}

                      {contact.email && (
                        <span>
                          {" • "}
                          {contact.email}
                        </span>
                      )}

                    </div>

                  </div>

                  <Button
                    onClick={()=>{

                      console.log(
                        "Open contact",
                        contact.id
                      )

                    }}
                  >
                    Open
                  </Button>

                </div>

              ))}

            </div>

          )}

        </div>

      </CardContent>

    </Card>

  )

}