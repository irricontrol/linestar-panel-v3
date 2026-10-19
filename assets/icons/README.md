# SVG Icons

Drop the correct `.svg` files here (exported from Figma, the design system, etc).

Suggested name for each one — makes it easier to swap in `js/icons.js` later:

- `home.svg` — Home menu
- `drop.svg` / `drop-outline.svg` / `drop-off.svg` — irrigation (wet / Irrig. menu / dry)
- `bell.svg` — alarms
- `gear.svg` — config
- `lock.svg` — physical panel
- `signal.svg` — 4G signal (top bar)
- `chevron-down.svg` — field dropdown arrow
- `calendar.svg` — date field
- `backspace.svg` — numeric keypad
- `play.svg` — Start Pivot
- `stop-square.svg` — Stop Pivot
- `rotate-right.svg` / `rotate-left.svg` — Direction switch (forward/reverse)
- `logo.svg` — logo at the top of the sidebar

Once you drop the files in here, it's just a matter of swapping each function in
`js/icons.js` to load the real SVG instead of the hand-drawn one.
