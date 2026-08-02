export const VILLAINS = [
  {
    id:'sophist', caseId:'toll', name:'The Sophist', faction:'Underground Threats',
    role:'A crime boss who treats gang warfare as a laboratory for moral philosophy.',
    threat:'He orchestrates real-world trolley problems: who gets the medicine, which shop burns, and which rival must die so the block can keep breathing.',
    power:'Epistemic manipulation: a touch can override a person’s absolute perception of truth.',
    flaw:'His own grip on reality is gone. He keeps paranoid physical ledgers to remind himself who he is, terrified he is a victim of his own lies.'
  },
  {
    id:'hemlock', caseId:'afterhours', name:'Hemlock', faction:'Underground Threats',
    role:'The supplier of a localized airborne chemical that severs pain and fear receptors.',
    threat:'Her smiling berserkers turn ordinary thugs into unstoppable weapons and make every emergency on Millhaven’s streets harder to stop.',
    power:'A biological bioreactor aura that produces the pain-and-fear severing compound.',
    flaw:'The pain transfers to her. Every broken bone her people sustain becomes phantom agony and neurological terror inside her own body.'
  },
  {
    id:'forge', caseId:'casting', name:'The Forge', faction:'Underground Threats',
    role:'A brutal weapons dealer arming low-level gangs from abandoned foundries.',
    threat:'He floods Millhaven with military-grade tech, turning copycat vigilantism and neighborhood grudges into a private arms race.',
    power:'Internal pyrokinesis: he superheats his body enough to melt incoming bullets.',
    flaw:'The engine fire never goes out. Hyper-metabolism starves him, slowly melts his organs, and drives him into fever-mad violence.'
  },
  {
    id:'alderman', caseId:'renovation', name:'The Alderman', faction:'In-Plain-Sight Untouchables',
    role:'A beloved Millhaven City Councilman who fixes potholes, funds schools, and owns the city’s sense of gratitude.',
    threat:'His projects make exploitation feel like calm, redevelopment feel like hope, and police expansion feel like the only answer to aggression he engineered.',
    power:'Empathic architecture: buildings, parks, and rooms he designs subconsciously manipulate the emotions of anyone inside.',
    flaw:'Outside his constructed spaces he cannot experience genuine emotion. In a forest or an old unrenovated house, he collapses into catatonic depression.'
  },
  {
    id:'broadcaster', caseId:'deadair', name:'The Broadcaster', faction:'In-Plain-Sight Untouchables',
    role:'The host of Millhaven’s most listened-to true-crime and local-news podcast.',
    threat:'She exposes corruption, redirects public rage, and edits people out of the city’s memory by making the right lie feel like common knowledge.',
    power:'Truth-weaving: when enough people simultaneously believe a broadcast lie, reality retroactively alters to make it objective truth.',
    flaw:'The universe resists every edit. Gravity failures, time loops, and impossible shadows gather around her studio until the block threatens to tear itself apart.'
  },
  {
    id:'ferryman', caseId:'lastroute', name:'The Ferryman', faction:'Wildcards',
    role:'An underground coyote who moves fugitive Heroes, escaping villains, and terrified witnesses out of Millhaven.',
    threat:'They sell impossible exits through the missing part of the 9B route, taking a memory as payment from every passenger who wants to disappear.',
    power:'Shadow tunneling: they fold space between two dark alleys.',
    flaw:'The tunnels eat memories as a toll. The Ferryman barely remembers who they are and now operates on muscle memory and greed.'
  },
  {
    id:'alchemist', caseId:'openhouse', name:'The Alchemist', faction:'Wildcards',
    role:'A rogue street pharmacist brewing temporary, superpower-granting narcotics for gangs.',
    threat:'Every weekend becomes a new unpredictable meta-brawl as the neighborhood hunts the source of the next impossible high.',
    power:'Internal synthesis: they can perfectly synthesize any chemical compound inside their own bloodstream.',
    flaw:'They sweat pure, highly addictive narcotics and are an eternally targeted commodity for junkies, Heroes, and mob bosses.'
  },
  {
    id:'omen', caseId:'lastcall', name:'Omen', faction:'Wildcards',
    role:'A fatalistic vigilante who murders people for crimes they are destined to commit within the next twenty-four hours.',
    threat:'They force the Heroes to protect people who are about to do something horrific, making prevention look like complicity and mercy look like negligence.',
    power:'Absolute precognition: eye contact reveals exactly one hour of another person’s future.',
    flaw:'They cannot change their own future. Knowing exactly how every fight ends has reduced them to an emotionless machine following a script.'
  }
];

export const villainForCase = caseId => VILLAINS.find(villain => villain.caseId === caseId) || null;
