export const HEROES = [
  {
    role:'The Nightwatch',
    flavor:'A beat cop by day, a vigilante by night — and increasingly unsure which uniform is the real one.',
    setup:{
      toll:'You’ve walked Ferrous Avenue on patrol for six years and never once caught the collectors in the act. What do you suspect that tells you about who’s protecting them — and why haven’t you said it out loud?',
      casting:'Your captain wants the new vigilante’s methods “looked into,” which everyone understands to mean looked away from. What have you found already that you haven’t reported?',
      renovation:'You’ve been called out to three “disturbances” at buildings the Whitlock Initiative later condemned, and each time the complaint vanished from the log by morning. What did you actually see at the last one?',
      lastcall:'You’ve had exactly one drink at the Anchor in your life, on your first night on the force, and an older cop told you never to go back armed. What did they say happens if you break that rule now?'
    },
    sides:[
      {cond:'If you used more force than the moment called for…', tone:'Fury'},
      {cond:'If you looked away from something a fellow officer did…', tone:'Guilt'}
    ]
  },
  {
    role:'Powerline',
    flavor:'A utility lineman who built her own suit out of surplus gear after the accident — mostly to make sure nobody else’s mistake costs what hers did.',
    setup:{
      toll:'The mascot enforcers on Ferrous Avenue draw power straight off the grid you used to service, illegally, and you’re the only one who’d know how. What did you already notice about their rig that you haven’t told anyone?',
      casting:'The new vigilante shorted out three blocks of streetlights covering their last exit, using a trick only someone with utility training should know. Where do you think they learned it?',
      renovation:'You were on the crew that quietly re-routed power to the first building the Whitlock Initiative condemned, the week before it happened. What did your supervisor tell you not to ask about?',
      lastcall:'The Anchor’s wiring is older than the truce that runs it, and you’re the only person who’s ever been allowed to touch it. What did you find last time you were under that bar?'
    },
    sides:[
      {cond:'If you protected someone past the point they needed protecting…', tone:'Fury'},
      {cond:'If your own past mistake nearly repeated itself…', tone:'Guilt'}
    ]
  },
  {
    role:'Kid Chorus',
    flavor:'Seventeen, with a scream that can drop a window from three blocks — and a temper that scares her more than it scares anyone else.',
    setup:{
      toll:'You screamed loud enough to crack a Ferrous Avenue storefront window trying to scare off a collector, and it didn’t work — it just made them notice you. What did the fox-mask say to you before it walked away?',
      casting:'People keep comparing your scream to the new vigilante’s methods, like you’re the same kind of dangerous. What do you know about them that makes you angriest?',
      renovation:'You grew up two doors down from the Blue Note before it got condemned, and you were the last person to see the family who lived above it. What did they tell you, right before they disappeared?',
      lastcall:'You’re the only Hero in Millhaven young enough that the Anchor’s bartender still won’t serve you — but they always know exactly when you’re standing outside. What did they tell you through the door, last time?'
    },
    sides:[
      {cond:'If you used your voice on someone who wasn’t actually a threat…', tone:'Fury'},
      {cond:'If you were afraid of what you might do next…', tone:'Dread'}
    ]
  },
  {
    role:'The Concierge',
    flavor:'The doorman at the Ferris Street rowhouses for thirty years, with strength nobody’s ever explained and a building he’d die before he’d lose.',
    setup:{
      toll:'Half of Ferrous Avenue’s shopkeepers ask your advice before they pay the collectors, and you always tell them the same thing. What do you tell them, and do you actually believe it?',
      casting:'The new vigilante broke someone’s arm two doors from your building, someone you’ve known thirty years. What did you do about it that you haven’t told anyone?',
      renovation:'The Ferris rowhouses are next on Councilwoman Voss’s list, and you personally carried three of your tenants’ belongings out the night they were condemned. What did you see in that building that convinced you it wasn’t really about code violations?',
      lastcall:'You were the last Ferris Street doorman the Anchor’s bartender ever personally deputized to keep the peace, decades ago. What favor do you still owe them that you’re finally being asked to pay?'
    },
    sides:[
      {cond:'If you failed to protect someone in your building…', tone:'Guilt'},
      {cond:'If you were afraid this was the night you finally lost the building…', tone:'Dread'}
    ]
  },
  {
    role:'Widow’s Peak',
    flavor:'Buried her husband eight months ago after a death the police closed too fast — and hasn’t put down the mask since.',
    setup:{
      toll:'Your husband owned a shop on Ferrous Avenue that burned down the same week he died, and the collectors have never once bothered you since. What do you think that means, and why haven’t you asked anyone directly?',
      casting:'The new vigilante’s methods are closer to what you actually want to do most nights than you’re willing to admit to your friends. What did you almost do, the last time you followed them?',
      renovation:'Your husband’s law firm represented three families who lost their homes to the Whitlock Initiative, the month before he died. What file of his have you never let anyone else read?',
      lastcall:'Your husband was owed money by the Anchor’s bartender when he died, a debt nobody’s ever mentioned since. What did the bartender tell you, the one time you asked about it?'
    },
    sides:[
      {cond:'If your search for answers cost someone else something they needed…', tone:'Fury'},
      {cond:'If you were afraid you were becoming someone your husband wouldn’t recognize…', tone:'Dread'}
    ]
  },
  {
    role:'The Understudy',
    flavor:'A struggling actor who built a hero out of stage tricks and sheer nerve — and lives in quiet terror of the night everyone realizes it’s a performance.',
    setup:{
      toll:'You once auditioned for a job entertaining kids’ parties at Wonderland Pier, before it closed, and you recognize the mascot suits the collectors wear from backstage. Who else auditioned that day that you’ve since seen somewhere they shouldn’t be?',
      casting:'Critics keep saying the new vigilante has “real presence” compared to you, and it’s the only review that’s ever actually gotten under your skin. What did you do, the night you decided to prove them wrong?',
      renovation:'You did a reading at the Blue Note the week before it was condemned, for an audience that included Councilwoman Voss herself. What did she say to you afterward that you haven’t repeated to anyone?',
      lastcall:'You do the Anchor’s open-mic night in your civilian identity, and the bartender always requests the same bit. What do they say right after you finish it, every time?'
    },
    sides:[
      {cond:'If you overcompensated with bravado instead of a plan…', tone:'Fury'},
      {cond:'If someone almost saw through the act…', tone:'Dread'}
    ]
  },
  {
    role:'Backline',
    flavor:'An off-duty paramedic who started carrying a second bag after the ambulance stopped being fast enough — the one with gear no licensing board would approve.',
    setup:{
      toll:'You’ve treated four collectors’ victims off the books this month alone, and every single one begged you not to file a report. What did the last one tell you about who they’re really afraid of?',
      casting:'You’ve patched up more of the new vigilante’s victims than anyone else in Millhaven, and you’ve started keeping a private file on the injuries. What pattern have you noticed that nobody else has?',
      renovation:'You were the first responder called to the Blue Note the night it was condemned, for a call that got canceled before you arrived. What did dispatch tell you afterward about who canceled it?',
      lastcall:'The Anchor’s bartender is the only person in Millhaven who’s ever talked you out of quitting, on a night you don’t like to think about. What did they say to you that night?'
    },
    sides:[
      {cond:'If you couldn’t save someone you reached in time…', tone:'Guilt'},
      {cond:'If you were afraid of what you were becoming numb to…', tone:'Dread'}
    ]
  },
  {
    role:'The Ref',
    flavor:'A boxing referee who spent twenty years learning exactly how much a person can take before you have to stop the fight — and started stopping fights the sport doesn’t sanction.',
    setup:{
      toll:'You used to referee exhibition bouts at Wonderland Pier before it closed, and you’d recognize that walk under any mascot costume. Whose walk did you recognize, and why haven’t you said anything?',
      casting:'You’ve watched enough fights to know exactly when someone’s enjoying the damage, and the new vigilante enjoys it more than anyone you’ve ever refereed. What’s the worst thing you’ve personally seen them do?',
      renovation:'You trained fighters out of a gym in the Blue Note basement for fifteen years before Councilwoman Voss’s initiative shut it down. What did you find in that basement, packing up, that you never told anyone about?',
      lastcall:'You’ve called more fights inside the Anchor than anyone alive, back when the bartender still allowed them. What’s the one fight you were ordered to let happen, that you still regret calling fair?'
    },
    sides:[
      {cond:'If you let a fight go further than it should have…', tone:'Fury'},
      {cond:'If you covered for someone who broke the only rules that matter…', tone:'Guilt'}
    ]
  },
  {
    role:'Palisade',
    flavor:'A legal-aid attorney who can hold a glowing barrier across one doorway at a time — useful in a siege, less useful when everyone needs saving at once.',
    setup:{
      toll:'Three Ferrous Avenue shopkeepers came to your clinic about the “insurance” racket, then withdrew their statements on the same afternoon. What identical phrase did each of them use when they asked for their papers back?',
      casting:'The new vigilante has started leaving suspects bound outside your office, as if your approval is part of the performance. What did the last one whisper before the police took them away?',
      renovation:'You found the one defect that could stop the Whitlock Initiative in court, and Councilwoman Voss found a way to make the hearing disappear. What was the defect — and what did she offer you afterward?',
      lastcall:'The Anchor’s neutrality began as a settlement you found in a dead attorney’s files, signed by people who should never have shared a table. Whose signature did you recognize that makes the agreement dangerous now?'
    },
    sides:[
      {cond:'If you treated someone as the enemy before they had a chance to speak…', tone:'Fury'},
      {cond:'If someone was hurt because your protection could only face one direction…', tone:'Guilt'}
    ]
  },
  {
    role:'Secondhand',
    flavor:'A watch repairer who can borrow five seconds from her own near future — long enough to stop a bullet, never long enough to avoid paying the time back.',
    setup:{
      toll:'Every Ferrous Avenue collection happens at the exact same second past midnight, according to four clocks that should not agree. What mark inside one of those clocks tells you who synchronized them?',
      casting:'Footage of the new vigilante skips five seconds whenever they strike, exactly like security video does around you. What happened when you tried to catch them inside the missing time?',
      renovation:'A pocket watch recovered from the Blue Note is running backward toward the hour the building vanished. Who brought it to your shop, and why did they refuse to take it back?',
      lastcall:'No clock inside the Anchor has moved in thirty years, but tonight every one of them started ticking. What debt did the bartender say would come due when they reached midnight?'
    },
    sides:[
      {cond:'If time you borrowed left someone else waiting when they needed you…', tone:'Guilt'},
      {cond:'If you lost a moment and woke somewhere you could not explain…', tone:'Dread'}
    ]
  },
  {
    role:'Rook',
    flavor:'A bicycle courier who can catch and redirect momentum with a touch — turning bad falls and fast escapes into somebody else’s problem.',
    setup:{
      toll:'You deliver to every shop on Ferrous Avenue, including sealed envelopes nobody admits sending. Where does the collection route really end, and what did you see unloaded there?',
      casting:'The new vigilante copied your signature move for the cameras and nearly killed someone doing it. What tiny mistake proves they learned it by watching you in civilian clothes?',
      renovation:'Your regular shortcut through Whitlock now ends at a spotless brick wall that was not there yesterday. What is still embedded in the mortar on the other side?',
      lastcall:'Couriers know the Anchor as the one address where a package may be delivered without a name. What did you carry there tonight that was moving inside the bag?'
    },
    sides:[
      {cond:'If you sent danger back harder than it came at you…', tone:'Fury'},
      {cond:'If you realized someone had mapped the route between your mask and your front door…', tone:'Dread'}
    ]
  },
  {
    role:'Switchboard',
    flavor:'Millhaven’s overnight emergency dispatcher, cursed to hear certain calls ninety seconds before the phone actually rings.',
    setup:{
      toll:'You heard Mrs. Odom’s call before her bakery burned, but when the phone finally rang somebody else answered from her line. What did that voice tell you not to dispatch?',
      casting:'Calls about the new vigilante reach you before the violence starts, always from the same unlisted number. What did you hear in the background that connects the caller to someone you trust?',
      renovation:'The night the Blue Note vanished, six people called from apartments that city records say were already empty. Which caller knew your real name, and what did they beg you to remember?',
      lastcall:'The Anchor has no listed phone, yet it has called your board once every year on the same night. Tonight it called early. What did the bartender say before the line cut out?'
    },
    sides:[
      {cond:'If you sent someone into danger because there was no time to explain…', tone:'Fury'},
      {cond:'If you heard a call coming and still could not get help there in time…', tone:'Guilt'}
    ]
  }
];
