# Scenarios (test fixture)

### SCN-TEST-STRICT-01 — Simple strict fire

**Category:** Test
**Axes:** 1

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'go-dark' }
  - type: turn-skipped
    where: { playerId: $ACTOR }
shape: strict
```

**Known product call:** none

---

### SCN-TEST-CONTAINS-01 — Contains with extras allowed

**Category:** Test
**Axes:** 1

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor' }
  - type: favor-given
    where: { giverId: $TARGET, requesterId: $ACTOR }
shape: contains
```

**Known product call:** none

---

### SCN-TEST-NEGATIVE-01 — Negative / dispatch error

**Category:** Test
**Axes:** 2

**Fire signature:**
```yaml
events: []
shape: negative
inference: |
  Proactive single intercepted should be rejected pre-strip.
```

**Known product call:** none

---

### SCN-TEST-TIER2-01 — Tier-2 projection assertion (axis 11)

**Category:** Test
**Axes:** 11

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'named-steal', targetId: $TARGET }
shape: strict
projection-assertions:
  - viewer: TARGET
    field: nopeWindow.namedSteal.namedCardType
    expect: $PRESENT
```

**Known product call:** none

---

### SCN-TEST-TIER3-01 — Tier-3 connection events (axis 13)

**Category:** Test
**Axes:** 13

**Fire signature:**
```yaml
events:
  - type: card-played
    where: { playerId: $ACTOR, cardType: 'call-in-a-favor' }
  - type: favor-requested
    where: { requesterId: $ACTOR, targetId: $TARGET }
shape: contains
connection-events:
  - seat: $TARGET
    transition: disconnect
    at: 2
  - seat: $TARGET
    transition: reconnect
    at: 4
```

**Known product call:** none

---
