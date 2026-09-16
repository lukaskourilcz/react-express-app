# Import fixtures

`lichess-puzzles.sample.csv` is a **synthetic** file in the shape of the Lichess
puzzle database. Every row was constructed here and verified against
`shared/chess-position.ts`; none of it is Lichess data, the `FIXT…` ids are not
real puzzle ids and the `lichess.org/fixture…` links are not real games. It
exists so the import contract can be tested without a 6-million-row download,
and it is never served to a learner.

The first three rows are importable, one per topic the mapping resolves to.
The rest are there to be rejected, one reason each: a repeated id, a first move
that is not legal in its own FEN, a row under the quality floor, a row whose
themes map to no topic, a rating outside the authored bands, and a truncated
line.

The real database lives at <https://database.lichess.org/> under CC0. See
`scripts/import-lichess-puzzles.ts` for how to point the importer at it.
