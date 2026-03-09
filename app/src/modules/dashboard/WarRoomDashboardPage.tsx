import Container from "@components/Container"

import { warRoomTemplate } from "../../dashboards/templates/warRoom.template"
import { loadCard } from "@cards/cardloader"

export default function WarRoomDashboardPage() {

  return (

    <Container>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">

        {warRoomTemplate.cards.map((card, i) => (

          <div key={i}>
            {loadCard(card)}
          </div>

        ))}

      </div>

    </Container>

  )

}