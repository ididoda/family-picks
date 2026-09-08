type TeamInfo = { city: string; name: string }

const teams: Record<string, TeamInfo> = {
  ARI: { city: 'Arizona',        name: 'Cardinals' },
  ATL: { city: 'Atlanta',        name: 'Falcons'   },
  BAL: { city: 'Baltimore',      name: 'Ravens'    },
  BUF: { city: 'Buffalo',        name: 'Bills'     },
  CAR: { city: 'Carolina',       name: 'Panthers'  },
  CHI: { city: 'Chicago',        name: 'Bears'     },
  CIN: { city: 'Cincinnati',     name: 'Bengals'   },
  CLE: { city: 'Cleveland',      name: 'Browns'    },
  DAL: { city: 'Dallas',         name: 'Cowboys'   },
  DEN: { city: 'Denver',         name: 'Broncos'   },
  DET: { city: 'Detroit',        name: 'Lions'     },
  GB:  { city: 'Green Bay',      name: 'Packers'   },
  HOU: { city: 'Houston',        name: 'Texans'    },
  IND: { city: 'Indianapolis',   name: 'Colts'     },
  JAC: { city: 'Jacksonville',   name: 'Jaguars'   },
  KC:  { city: 'Kansas City',    name: 'Chiefs'    },
  LAC: { city: 'Los Angeles',    name: 'Chargers'  },
  LAR: { city: 'Los Angeles',    name: 'Rams'      },
  LV:  { city: 'Las Vegas',      name: 'Raiders'   },
  MIA: { city: 'Miami',          name: 'Dolphins'  },
  MIN: { city: 'Minnesota',      name: 'Vikings'   },
  NE:  { city: 'New England',    name: 'Patriots'  },
  NO:  { city: 'New Orleans',    name: 'Saints'    },
  NYG: { city: 'NY',             name: 'Giants'    },
  NYJ: { city: 'NY',             name: 'Jets'      },
  PHI: { city: 'Philadelphia',   name: 'Eagles'    },
  PIT: { city: 'Pittsburgh',     name: 'Steelers'  },
  SF:  { city: 'San Francisco',  name: '49ers'     },
  SEA: { city: 'Seattle',        name: 'Seahawks'  },
  TB:  { city: 'Tampa Bay',      name: 'Buccaneers'},
  TEN: { city: 'Tennessee',      name: 'Titans'    },
  WAS: { city: 'Washington',     name: 'Commanders'},
}

export function getTeam(abbr: string): TeamInfo {
  return teams[abbr] ?? { city: abbr, name: '' }
}
