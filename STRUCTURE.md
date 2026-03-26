# vault-context Structure

```
vault-context/
├── CLAUDE.md                      # System configuration
├── CLAUDE-LEARNINGS.md            # Legacy cross-session learnings
├── STATE.md                       # System state (orientation file)
├── SYSTEM_STATUS.md               # Infrastructure inventory
├── STRUCTURE.md                   # This file
│
├── harness/                       # Mayor v2 harness orchestrator
│   ├── run.sh                     # Main orchestrator script
│   ├── learnings.md               # Cross-run accumulated knowledge
│   ├── config/
│   │   ├── planner-prompt.md      # Planner agent system prompt
│   │   ├── generator-prompt.md    # Generator agent system prompt
│   │   ├── evaluator-prompt.md    # Evaluator agent system prompt
│   │   ├── eval-criteria.md       # Grading rubric
│   │   └── benchmark-task.md      # Self-improvement benchmark task
│   ├── runs/                      # Run output directories
│   │   └── RUN-YYYYMMDD-HHMMSS/  # One directory per run
│   ├── magi/                      # MAGI council decision transcripts
│   │   └── MAGI-{timestamp}/
│   └── tools/                     # Standalone tools
│       ├── research.js            # Web research (Playwright + Claude)
│       ├── url-resolver.js        # URL content extraction
│       ├── tweet-processor.js     # Tweet capture processing
│       ├── tweet-researcher.js    # Tweet research brief generation
│       └── tweet-synthesizer.js   # Tweet library synthesis
│
├── inbox/tweets/                  # Tweet capture staging area
├── library/
│   ├── tweets/                    # Researched tweet briefs
│   └── synthesis/                 # Periodic tweet synthesis reports
│
├── research/                      # Research outputs
├── reference/                     # Reference documents
├── projects/nts/                  # Network Topology Scanner tracking
├── benchmark/                     # Legacy benchmark scripts
├── diagrams/                      # System diagrams
│
└── archive/v1/                    # Archived Mayor v1 system
    ├── plans/                     # 24 completed plans
    ├── work-orders/               # 75 work orders
    ├── results/                   # 88 result files
    ├── retros/                    # Swarm retrospectives
    ├── transcripts/               # Swarm transcripts
    └── *.md                       # Old system docs
```

## External Directories

```
~/mayor-daemon/                    # Daemon process
├── daemon.js                      # Entry point
├── router.js                      # NL intent classifier
├── run-manager.js                 # Task queue + run.sh spawning
├── magi.js                        # MAGI council engine
├── self-improve.js                # Self-improvement loop
└── metrics.js                     # Run metrics collection

~/mayor-dashboard/                 # Dashboard web app (port 3847)
├── server.js                      # HTTP + WebSocket server
└── public/index.html              # Single-file frontend

~/foreman-bot/                     # Legacy Discord bot (tweet pipeline source)
├── bot.js                         # Monolithic bot
├── tweet-*.js, url-resolver.js    # Tweet pipeline
├── reminder-engine.js             # Meds reminders
└── scheduler.js                   # Task scheduler
```
