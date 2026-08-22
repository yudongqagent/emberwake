import type { GalaxyDef } from "../types";

export const SWANREACH_COMBINE: GalaxyDef = {
  id: "swanreachCombine",
  name: "Swanreach Combine",
  unlockFlag: "campaign.act1.complete",
  systems: [
    {
      id: "meridianExchange",
      galaxyId: "swanreachCombine",
      name: "Meridian Exchange",
      x: 300,
      y: 300,
      controllingFaction: "swanreach",
      pois: [
        {
          id: "meridianExchangeHub",
          kind: "station",
          name: "Meridian Exchange",
          x: 500,
          y: 300,
          radius: 75,
          data: {},
        },
        {
          id: "meridianConvoyField",
          kind: "asteroidField",
          name: "Meridian Trade Convoy",
          x: 250,
          y: 440,
          radius: 55,
          data: { yieldType: "sourcePoints", remaining: 6 },
        },
      ],
    },
    {
      id: "driftmarket",
      galaxyId: "swanreachCombine",
      name: "Driftmarket",
      x: 650,
      y: 420,
      controllingFaction: "swanreach",
      pois: [
        {
          id: "driftmarketConcourse",
          kind: "station",
          name: "Driftmarket Concourse",
          x: 500,
          y: 320,
          radius: 75,
          data: {},
        },
        {
          id: "firstContactSwarmPoi",
          kind: "patrol",
          name: "Unidentified Bio-Contacts",
          x: 780,
          y: 200,
          radius: 90,
          requiresFlag: "act2.ridgeAndReach.cleared",
          hiddenAfterFlag: "act2.firstContact.cleared",
          data: { encounterId: "firstContactSwarm", victoryFlag: "act2.firstContact.combatDone" },
        },
      ],
    },
  ],
  lanes: [{ from: "meridianExchange", to: "driftmarket" }],
};
