Modal sheet sliding up from the bottom — for announcements (new features), invites, and pickers.

```jsx
<BottomSheet open={open} onClose={() => setOpen(false)} title="New: Skill Trees">
  <p>Unlock perks that grow with your journey.</p>
  <Button variant="primary" fullWidth>Explore the skill tree</Button>
  <Button variant="ghost" fullWidth>Maybe later</Button>
</BottomSheet>
```

Position it inside a `position: relative` container (e.g. a phone frame). Scrim click and grabber both close. Content scrolls past 86% height.
