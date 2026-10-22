The 1080 × 1350 slide frame: themed background (light | dark | green) with paper grain, an optional surfacing fin, a corner fin that stays off (`fin` defaults to `false`), and the 80 px content box starting at y 168.

```jsx
<Slide theme="dark" bigFin="big" label="1">
  <Kicker wave={1}>Introducing</Kicker>
  <Headline size="cover">Meet devShark.</Headline>
</Slide>
```

- `bigFin`: big (cover), small, huge (green slide), tucked (closing) — use each at most once per carousel and only where no panel fills to the bottom.
- The closing slide puts `<Logo />` first; no slide uses the corner fin.
- Children are laid out as a column; use `marginTop: 'auto'` on a footer to pin it to the bottom margin.
