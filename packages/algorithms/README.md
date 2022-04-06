# Greenproof Algorithms

## SpreadMatcher

Accepts entities A (e.g. consumptions), entities B (e.g. generations), and priority preferences.
While in code we use generic `entities` name (e.g. `entities: [entitiesA, entitiesB]`),
you can think about consumers and generators. Volume is matched, and reduced from both matching entities,
until one of the entity group is completely satisfied (or no other match [due to priorities] is possible).
Whatever is left in entities groups is named *leftover*.

Each consumer (by `id`) can have it's own generator priorities (by `id`).
Also, consumers themselves are prioritized as well.
Priorities are divided into *groups* of equal priority.

If there is no volume available in the first priority group, the second group is taken.

**If generator (or consumer) is not included in the priority group, it won't be matched at all.**

If multiple consumers compete over one generator (and they all belong to the same priority) the volume is split evenly.
If one consumer has multiple generators of equal priority the volume is split evenly.

If even spread is impossible, 1 volume is distributed to each competing entity, and rest of the entities is not satisfied.