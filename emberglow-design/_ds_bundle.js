/* @ds-bundle: {"format":4,"namespace":"EmberglowDesignSystem_28f42d","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"EyebrowLabel","sourcePath":"components/core/EyebrowLabel.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"BottomSheet","sourcePath":"components/overlay/BottomSheet.jsx"},{"name":"ListItem","sourcePath":"components/quest/ListItem.jsx"},{"name":"ProgressRing","sourcePath":"components/quest/ProgressRing.jsx"},{"name":"QuestCard","sourcePath":"components/quest/QuestCard.jsx"},{"name":"XPBar","sourcePath":"components/quest/XPBar.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"0c600fb87b9a","components/core/Button.jsx":"1e6518fd27c5","components/core/EyebrowLabel.jsx":"ce6384d082d4","components/core/IconButton.jsx":"3900d3695218","components/core/Input.jsx":"303ff9b34179","components/core/Switch.jsx":"c5d2244c3faa","components/overlay/BottomSheet.jsx":"a68d09286ef8","components/quest/ListItem.jsx":"b469ee51a1e2","components/quest/ProgressRing.jsx":"e30ec292db10","components/quest/QuestCard.jsx":"7986cd2b171b","components/quest/XPBar.jsx":"98bce7bd49c2","ui_kits/app/achievements.jsx":"25bebc2e8c0b","ui_kits/app/coop.jsx":"754212912468","ui_kits/app/custom-quest.jsx":"dfbd546cdb86","ui_kits/app/events.jsx":"f5351d471776","ui_kits/app/guild.jsx":"cd7ae6197f87","ui_kits/app/quest-flow.jsx":"b6207e20590c","ui_kits/app/shared.jsx":"64de660b440a","ui_kits/app/social.jsx":"d56772630724","ui_kits/app/tabs.jsx":"8819d82ce4af"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.EmberglowDesignSystem_28f42d = window.EmberglowDesignSystem_28f42d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
const tones = {
  ember: {
    background: 'rgba(217,73,40,0.18)',
    color: 'var(--ember-cinnabar-80)',
    border: '1px solid rgba(217,73,40,0.35)'
  },
  warm: {
    background: 'rgba(247,164,75,0.15)',
    color: 'var(--text-accent)',
    border: '1px solid rgba(247,164,75,0.35)'
  },
  neutral: {
    background: 'var(--ember-bone-a06)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-hairline)'
  },
  success: {
    background: 'rgba(125,168,123,0.15)',
    color: '#9dc39b',
    border: '1px solid rgba(125,168,123,0.35)'
  }
};
function Badge({
  tone = 'neutral',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: '5px 12px',
      borderRadius: 'var(--radius-pill)',
      ...tones[tone],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const sizes = {
  sm: {
    padding: '8px 16px',
    fontSize: 14,
    minHeight: 36
  },
  md: {
    padding: '12px 22px',
    fontSize: 16,
    minHeight: 48
  },
  lg: {
    padding: '14px 26px',
    fontSize: 17,
    minHeight: 54
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  children,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: press ? 'var(--accent-primary-press)' : hover ? 'var(--accent-primary-hover)' : 'var(--accent-primary)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent',
      boxShadow: hover && !disabled ? 'var(--glow-ember)' : 'none'
    },
    secondary: {
      background: hover ? 'var(--ember-bone-a12)' : 'var(--ember-bone-a06)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-subtle)'
    },
    ghost: {
      background: hover ? 'var(--ember-bone-a06)' : 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent'
    },
    outline: {
      background: hover ? 'var(--ember-bone-a06)' : 'transparent',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: disabled ? undefined : onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    disabled: disabled,
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--weight-semibold)',
      borderRadius: 'var(--radius-pill)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      width: fullWidth ? '100%' : undefined,
      transform: press && !disabled ? 'scale(0.98)' : 'none',
      transition: 'background var(--duration-fast) var(--ease-out), box-shadow var(--duration-base) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...s,
      ...variants[variant],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/EyebrowLabel.jsx
try { (() => {
const eyebrowTones = {
  ember: 'var(--ember-cinnabar-80)',
  warm: 'var(--text-accent)',
  muted: 'var(--text-muted)'
};
function EyebrowLabel({
  tone = 'ember',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: eyebrowTones[tone] || eyebrowTones.ember,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { EyebrowLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/EyebrowLabel.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function IconButton({
  label,
  size = 44,
  active = false,
  disabled = false,
  children,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    "aria-label": label,
    onClick: disabled ? undefined : onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    disabled: disabled,
    style: {
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-pill)',
      border: '1px solid ' + (active ? 'rgba(247,164,75,0.5)' : 'var(--border-hairline)'),
      background: active ? 'rgba(247,164,75,0.12)' : hover ? 'var(--ember-bone-a06)' : 'transparent',
      color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'background var(--duration-fast) var(--ease-out)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  hint,
  multiline = false,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const field = {
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    color: 'var(--text-primary)',
    background: 'var(--surface-inset)',
    border: '1px solid ' + (focus ? 'rgba(247,164,75,0.55)' : 'var(--border-subtle)'),
    boxShadow: focus ? '0 0 0 3px rgba(247,164,75,0.15)' : 'none',
    borderRadius: 'var(--radius-md)',
    padding: '13px 16px',
    outline: 'none',
    transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
    resize: 'vertical'
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--text-secondary)',
      marginBottom: 6
    }
  }, label), multiline ? /*#__PURE__*/React.createElement("textarea", {
    rows: 3,
    placeholder: placeholder,
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: field
  }) : /*#__PURE__*/React.createElement("input", {
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: field
  }), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 12,
      color: 'var(--text-muted)',
      marginTop: 6
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    role: "switch",
    "aria-checked": checked,
    tabIndex: 0,
    onClick: () => !disabled && onChange && onChange(!checked),
    onKeyDown: e => {
      if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
        e.preventDefault();
        onChange && onChange(!checked);
      }
    },
    style: {
      width: 48,
      height: 28,
      borderRadius: 'var(--radius-pill)',
      position: 'relative',
      flexShrink: 0,
      background: checked ? 'var(--accent-primary)' : 'var(--ember-aegean-a35)',
      border: '1px solid ' + (checked ? 'transparent' : 'var(--border-subtle)'),
      boxShadow: checked ? 'var(--glow-ember)' : 'none',
      transition: 'background var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 23 : 3,
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: 'var(--ember-bone)',
      transition: 'left var(--duration-base) var(--ease-out)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// components/overlay/BottomSheet.jsx
try { (() => {
function BottomSheet({
  open = false,
  onClose,
  title,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      pointerEvents: open ? 'auto' : 'none'
    },
    "aria-hidden": !open
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--ember-black-a60)',
      backdropFilter: open ? 'blur(3px)' : 'none',
      opacity: open ? 1 : 0,
      transition: 'opacity var(--duration-base) var(--ease-out)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: '86%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
      border: '1px solid var(--border-hairline)',
      borderBottom: 'none',
      boxShadow: '0 -12px 48px rgba(0,18,27,0.7)',
      transform: open ? 'translateY(0)' : 'translateY(105%)',
      transition: 'transform var(--duration-slow) var(--ease-out)',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 0 2px',
      display: 'flex',
      justifyContent: 'center',
      flexShrink: 0
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 4,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--ember-bone-a12)'
    }
  })), title && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 22px 4px',
      textAlign: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      color: 'var(--text-primary)'
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 22px calc(24px + env(safe-area-inset-bottom, 0px))',
      overflowY: 'auto'
    }
  }, children)));
}
Object.assign(__ds_scope, { BottomSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/BottomSheet.jsx", error: String((e && e.message) || e) }); }

// components/quest/ListItem.jsx
try { (() => {
function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '13px 16px',
      borderRadius: 'var(--radius-md)',
      background: hover && onClick ? 'var(--ember-bone-a06)' : 'transparent',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background var(--duration-fast) var(--ease-out)',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, leading && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ember-bone-a06)',
      border: '1px solid var(--border-hairline)',
      color: 'var(--text-accent)'
    }
  }, leading), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 500,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, subtitle)), trailing && /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      color: 'var(--text-muted)',
      fontSize: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, trailing));
}
Object.assign(__ds_scope, { ListItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/quest/ListItem.jsx", error: String((e && e.message) || e) }); }

// components/quest/ProgressRing.jsx
try { (() => {
function ProgressRing({
  progress = 0.5,
  size = 240,
  strokeWidth = 5,
  children,
  style
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      transform: 'rotate(-90deg)',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "rgba(44,69,107,0.4)",
    strokeWidth: strokeWidth
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "var(--accent-primary)",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: c * (1 - clamped),
    style: {
      filter: 'drop-shadow(0 0 10px rgba(217,73,40,0.55))',
      transition: 'stroke-dashoffset var(--duration-slow) var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, children));
}
Object.assign(__ds_scope, { ProgressRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/quest/ProgressRing.jsx", error: String((e && e.message) || e) }); }

// components/quest/QuestCard.jsx
try { (() => {
function QuestCard({
  title,
  description,
  xp,
  duration,
  status,
  image,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const statusTone = status === 'In progress' ? 'ember' : status === 'Complete' ? 'success' : 'neutral';
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid ' + (hover ? 'rgba(247,164,75,0.35)' : 'var(--border-hairline)'),
      boxShadow: hover ? 'var(--shadow-card), var(--glow-warm)' : 'var(--shadow-card)',
      cursor: onClick ? 'pointer' : 'default',
      background: 'var(--surface-raised)',
      transition: 'border-color var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out)',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, image && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: `url(${image}) center / cover`,
      opacity: 0.55
    }
  }), image && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to top, rgba(0,18,27,0.92) 20%, rgba(0,18,27,0.35))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: '18px 18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minHeight: image ? 120 : undefined,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, status && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: statusTone
  }, status), xp != null && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "warm"
  }, "+", xp, " XP")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      color: 'var(--text-primary)',
      lineHeight: 1.15
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--text-secondary)'
    }
  }, description), duration && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, duration)));
}
Object.assign(__ds_scope, { QuestCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/quest/QuestCard.jsx", error: String((e && e.message) || e) }); }

// components/quest/XPBar.jsx
try { (() => {
function XPBar({
  level = 1,
  xp = 0,
  xpNext = 100,
  style
}) {
  const pct = Math.max(0, Math.min(1, xp / xpNext));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-secondary)'
    }
  }, "Level ", level), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-accent)',
      fontWeight: 600
    }
  }, xp, " / ", xpNext, " XP")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--ember-aegean-a35)',
      border: '1px solid var(--border-hairline)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${pct * 100}%`,
      borderRadius: 'var(--radius-pill)',
      background: 'linear-gradient(90deg, var(--ember-cinnabar), var(--ember-sandy))',
      boxShadow: '0 0 12px rgba(247,164,75,0.5)',
      transition: 'width var(--duration-slow) var(--ease-out)'
    }
  })));
}
Object.assign(__ds_scope, { XPBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/quest/XPBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/achievements.jsx
try { (() => {
// Achievements screen + Invite Friends bottom sheet
const {
  Badge: ABadge,
  Button: AButton,
  EyebrowLabel: AEyebrow,
  BottomSheet: ASheet
} = window.EmberglowDesignSystem_28f42d;

/* ————— Achievements ————— */
const ACHIEVEMENT_GROUPS = [{
  group: 'Daily streak',
  icon: 'flame',
  items: [{
    name: 'First Steps',
    desc: 'Complete quests 2 days in a row',
    progress: [1, 2]
  }, {
    name: 'Keeper of the Flame',
    desc: 'A 7-day streak',
    progress: [1, 7]
  }, {
    name: 'Eternal Fire',
    desc: 'A 30-day streak',
    progress: [1, 30]
  }]
}, {
  group: 'Quest completion',
  icon: 'map',
  items: [{
    name: 'Quest Beginner',
    desc: 'Complete 3 quests',
    done: true
  }, {
    name: 'Seasoned Adventurer',
    desc: 'Complete 25 quests',
    done: true
  }, {
    name: 'Legend of the Road',
    desc: 'Complete 100 quests',
    progress: [35, 100]
  }]
}, {
  group: 'Time reclaimed',
  icon: 'hourglass',
  items: [{
    name: 'An Hour Regained',
    desc: '60 minutes offline',
    done: true
  }, {
    name: 'A Day Returned',
    desc: '24 hours offline in total',
    progress: [139, 1440]
  }, {
    name: 'A Week of Wonders',
    desc: '7 days offline in total',
    progress: [139, 10080]
  }]
}];
function AchievementCard({
  a
}) {
  const done = !!a.done;
  const pct = a.progress ? Math.min(1, a.progress[0] / a.progress[1]) : 1;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: done ? 'rgba(247,164,75,0.10)' : 'var(--surface-raised)',
      border: '1px solid ' + (done ? 'rgba(247,164,75,0.45)' : 'var(--border-hairline)'),
      boxShadow: done ? 'var(--glow-warm)' : 'none',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      flexShrink: 0,
      background: done ? 'rgba(247,164,75,0.18)' : 'var(--ember-bone-a06)',
      border: '1px solid ' + (done ? 'rgba(247,164,75,0.4)' : 'var(--border-hairline)'),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: done ? 'var(--ember-sandy)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: done ? 'award' : 'lock',
    size: 19
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, a.name), done && /*#__PURE__*/React.createElement(ABadge, {
    tone: "warm"
  }, "Unlocked")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, a.desc), !done && a.progress && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 5,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--ember-aegean-a35)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${pct * 100}%`,
      minWidth: pct > 0 ? 4 : 0,
      borderRadius: 'var(--radius-pill)',
      background: 'linear-gradient(90deg, var(--ember-cinnabar), var(--ember-sandy))'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-muted)',
      marginTop: 4,
      fontVariantNumeric: 'tabular-nums'
    }
  }, a.progress[0].toLocaleString(), " / ", a.progress[1].toLocaleString()))));
}
function AchievementsScreen({
  onBack
}) {
  const total = ACHIEVEMENT_GROUPS.reduce((n, g) => n + g.items.length, 0);
  const done = ACHIEVEMENT_GROUPS.reduce((n, g) => n + g.items.filter(a => a.done).length, 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Achievements"
  }, /*#__PURE__*/React.createElement(SubHeader, {
    title: "Achievements",
    subtitle: `${done} of ${total} unlocked. The road remembers.`,
    onBack: onBack
  }), ACHIEVEMENT_GROUPS.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.group,
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: g.icon,
    size: 16,
    color: "var(--text-accent)"
  }), /*#__PURE__*/React.createElement(AEyebrow, {
    tone: "warm"
  }, g.group)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, g.items.map(a => /*#__PURE__*/React.createElement(AchievementCard, {
    key: a.name,
    a: a
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 20
    }
  }));
}

/* ————— Invite Friends sheet (contacts from device) ————— */
const CONTACTS = [{
  name: 'Anna Haro',
  email: 'anna-haro@mac.com'
}, {
  name: 'Daniel Higgins Jr.',
  email: 'd-higgins@mac.com'
}, {
  name: 'Hank M. Zakroff',
  email: 'hank-zakroff@mac.com'
}, {
  name: 'John Appleseed',
  email: 'John-Appleseed@mac.com'
}, {
  name: 'Kate Bell',
  email: 'kate-bell@mac.com'
}];
function InviteFriendsSheet({
  open,
  onClose
}) {
  const [query, setQuery] = React.useState('');
  const [picked, setPicked] = React.useState([]);
  const [sent, setSent] = React.useState(false);
  const list = CONTACTS.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  const toggle = email => setPicked(p => p.includes(email) ? p.filter(e => e !== email) : [...p, email]);
  const close = () => {
    setSent(false);
    setPicked([]);
    setQuery('');
    onClose();
  };
  return /*#__PURE__*/React.createElement(ASheet, {
    open: open,
    onClose: close,
    title: "Invite friends"
  }, sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '18px 0 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: '50%',
      margin: '0 auto 14px',
      background: 'rgba(247,164,75,0.12)',
      border: '1px solid rgba(247,164,75,0.4)',
      boxShadow: 'var(--glow-warm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 28,
    color: "var(--ember-sandy)"
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: 'var(--text-primary)',
      margin: '0 0 4px'
    }
  }, "Invitations sent"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--text-muted)',
      margin: '0 0 20px'
    }
  }, "The fire is warmer with company."), /*#__PURE__*/React.createElement(AButton, {
    variant: "secondary",
    fullWidth: true,
    onClick: close
  }, "Done")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--text-muted)',
      margin: '0 0 12px',
      textAlign: 'center'
    }
  }, "From your contacts. Quest together, keep each other honest."), /*#__PURE__*/React.createElement(SInputSearch, {
    query: query,
    setQuery: setQuery
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '12px 0',
      maxHeight: 280,
      overflowY: 'auto',
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)'
    }
  }, list.map((c, i) => {
    const sel = picked.includes(c.email);
    return /*#__PURE__*/React.createElement("div", {
      key: c.email,
      onClick: () => toggle(c.email),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        cursor: 'pointer',
        borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--text-primary)'
      }
    }, c.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--text-muted)'
      }
    }, c.email)), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        borderRadius: '50%',
        flexShrink: 0,
        border: '1.5px solid ' + (sel ? 'var(--ember-sandy)' : 'var(--border-strong)'),
        background: sel ? 'var(--ember-sandy)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#3a2410',
        transition: 'all var(--duration-fast) var(--ease-out)'
      }
    }, sel && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    })));
  }), list.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 18,
      fontSize: 14,
      color: 'var(--text-muted)',
      textAlign: 'center'
    }
  }, "No one by that name here.")), /*#__PURE__*/React.createElement(AButton, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    disabled: picked.length === 0,
    onClick: () => setSent(true)
  }, picked.length === 0 ? 'Select contacts' : `Invite ${picked.length} ${picked.length === 1 ? 'friend' : 'friends'}`), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 14
    }
  }, "Add by email instead"))));
}
function SInputSearch({
  query,
  setQuery
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 14,
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-muted)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 17
  })), /*#__PURE__*/React.createElement("input", {
    value: query,
    onChange: e => setQuery(e.target.value),
    placeholder: "Search contacts",
    style: {
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-body)',
      fontSize: 15.5,
      color: 'var(--text-primary)',
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px 12px 42px',
      outline: 'none'
    }
  }));
}
Object.assign(window, {
  AchievementsScreen,
  InviteFriendsSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/achievements.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/coop.jsx
try { (() => {
// Cooperative quests: hub, create, join (invitations), public events, schedule event
const {
  Button: KButton,
  Badge: KBadge,
  EyebrowLabel: KEyebrow,
  ListItem: KListItem
} = window.EmberglowDesignSystem_28f42d;
const KA = '../../assets';
const COOP_FRIENDS = [{
  name: 'Greg the Destroyer',
  cls: 'Knight',
  img: null
}, {
  name: 'jimmers',
  cls: 'Wizard',
  img: `${KA}/characters/wizard-profile.jpg`
}, {
  name: 'Mr weird',
  cls: 'Alchemist',
  img: `${KA}/characters/alchemist-profile.jpg`
}];
const GUILDS = [{
  name: "Runner's Highness",
  motto: 'Carry the torches',
  members: 2,
  icon: 'flag'
}, {
  name: 'workfriends',
  motto: null,
  members: 1,
  icon: 'beer'
}];
function Avatar({
  img,
  size = 38
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      flexShrink: 0,
      background: 'var(--ember-bone-a06)',
      border: '1px solid var(--border-hairline)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-secondary)'
    }
  }, img ? /*#__PURE__*/React.createElement("img", {
    src: img,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: size * 0.45
  }));
}

/* ————— Hub ————— */
function CoopHubScreen({
  hasFriends,
  onGo,
  onBack,
  onToggleEmpty
}) {
  const options = hasFriends ? [{
    id: 'create',
    icon: 'plus-circle',
    title: 'Create a quest',
    sub: 'Start a cooperative quest with friends or your guild'
  }, {
    id: 'join',
    icon: 'mail-open',
    title: 'Join a quest',
    sub: 'Answer quest invitations from friends'
  }, {
    id: 'events',
    icon: 'calendar-clock',
    title: 'Public events',
    sub: 'Scheduled quests anyone in the world can join'
  }] : [{
    id: 'events',
    icon: 'calendar-clock',
    title: 'Public events',
    sub: 'Scheduled quests anyone in the world can join'
  }, {
    id: 'addfriends',
    icon: 'user-plus',
    title: 'Add friends',
    sub: 'Gather companions to quest together'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Cooperative Quests",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(SubHeader, {
    title: "Cooperative Quests",
    subtitle: "One fire, many travelers. Everyone keeps their phone locked \u2014 or everyone fails together.",
    onBack: onBack
  }), !hasFriends && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "flame-kindling",
    size: 19,
    color: "var(--text-accent)",
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--text-secondary)'
    }
  }, "Your fire is still small. Add a friend or join a public event to quest with company.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      marginTop: 14
    }
  }, options.map(o => /*#__PURE__*/React.createElement("div", {
    key: o.id,
    onClick: () => onGo(o.id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '18px 18px',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      cursor: 'pointer',
      boxShadow: 'var(--shadow-raised)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: '50%',
      flexShrink: 0,
      background: 'rgba(247,164,75,0.10)',
      border: '1px solid rgba(247,164,75,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-accent)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: o.icon,
    size: 21
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 19,
      color: 'var(--text-primary)'
    }
  }, o.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      lineHeight: 1.45,
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, o.sub)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 18,
    color: "var(--text-muted)"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 24
    }
  }), /*#__PURE__*/React.createElement("div", {
    onClick: onToggleEmpty,
    style: {
      textAlign: 'center',
      fontSize: 12,
      color: 'var(--text-muted)',
      cursor: 'pointer',
      padding: '8px 0'
    }
  }, "Prototype: preview ", hasFriends ? 'zero-friends' : 'with-friends', " state"));
}

/* ————— Create cooperative quest ————— */
function CoopCreateScreen({
  onBack,
  onStart
}) {
  const [title, setTitle] = React.useState('');
  const [minutes, setMinutes] = React.useState(30);
  const [mode, setMode] = React.useState('friends');
  const [picked, setPicked] = React.useState([]);
  const [guild, setGuild] = React.useState(null);
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(now.getTime() + minutes * 60000);
  const pct = (minutes - 5) / (180 - 5) * 100;
  const xp = minutes * 3;
  const invited = mode === 'friends' ? picked.length : guild ? 1 : 0;
  const ready = title.trim().length > 0 && invited > 0;
  const toggle = n => setPicked(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]);
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Create Co-op Quest",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(SubHeader, {
    title: "Create a quest",
    subtitle: "If anyone unlocks early, everyone fails together.",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 18px 22px',
      marginTop: 12,
      boxShadow: 'var(--shadow-raised)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, "We want to"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "run at dawn",
    style: {
      flex: 1,
      minWidth: 130,
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      color: 'var(--ember-sandy)',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      borderBottom: '1px solid var(--border-strong)',
      padding: '0 2px 4px',
      caretColor: 'var(--ember-sandy)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      color: 'var(--text-primary)',
      marginTop: 14
    }
  }, "for ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ember-sandy)'
    }
  }, fmtDuration(minutes))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "5",
    max: "180",
    step: "5",
    value: minutes,
    onChange: e => setMinutes(parseInt(e.target.value, 10)),
    className: "ember-slider",
    style: {
      background: `linear-gradient(90deg, var(--ember-cinnabar) 0%, var(--ember-sandy) ${pct}%, rgba(44,69,107,0.45) ${pct}%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, "5 MIN"), /*#__PURE__*/React.createElement("span", null, "3 HOURS"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      marginTop: 18,
      padding: '14px 8px',
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(KEyebrow, {
    tone: "muted",
    style: {
      fontSize: 11,
      marginBottom: 4
    }
  }, "From"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      color: 'var(--text-primary)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, fmtClock(now))), /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18,
    color: "var(--text-accent)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(KEyebrow, {
    tone: "muted",
    style: {
      fontSize: 11,
      marginBottom: 4
    }
  }, "To"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      color: 'var(--ember-sandy)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, fmtClock(end))))), /*#__PURE__*/React.createElement(KEyebrow, {
    tone: "warm",
    style: {
      margin: '20px 0 10px'
    }
  }, "Who rides with you?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-pill)',
      padding: 3,
      marginBottom: 12
    }
  }, ['friends', 'guild'].map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    onClick: () => setMode(s),
    style: {
      flex: 1,
      padding: '9px 0',
      borderRadius: 'var(--radius-pill)',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: 14.5,
      fontWeight: 600,
      textTransform: 'capitalize',
      background: mode === s ? 'var(--accent-primary)' : 'transparent',
      color: mode === s ? 'var(--text-on-accent)' : 'var(--text-secondary)',
      transition: 'background var(--duration-fast) var(--ease-out)'
    }
  }, s))), mode === 'friends' ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, COOP_FRIENDS.map((f, i) => {
    const sel = picked.includes(f.name);
    return /*#__PURE__*/React.createElement("div", {
      key: f.name,
      onClick: () => toggle(f.name),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        cursor: 'pointer',
        borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none',
        background: sel ? 'rgba(247,164,75,0.07)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      img: f.img
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--text-primary)'
      }
    }, f.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--text-muted)'
      }
    }, f.cls)), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        borderRadius: '50%',
        flexShrink: 0,
        border: '1.5px solid ' + (sel ? 'var(--ember-sandy)' : 'var(--border-strong)'),
        background: sel ? 'var(--ember-sandy)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#3a2410',
        transition: 'all var(--duration-fast) var(--ease-out)'
      }
    }, sel && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    })));
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, GUILDS.map((g, i) => {
    const sel = guild === g.name;
    return /*#__PURE__*/React.createElement("div", {
      key: g.name,
      onClick: () => setGuild(sel ? null : g.name),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        cursor: 'pointer',
        borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none',
        background: sel ? 'rgba(247,164,75,0.07)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 38,
        borderRadius: '50%',
        flexShrink: 0,
        background: 'rgba(247,164,75,0.10)',
        border: '1px solid rgba(247,164,75,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-accent)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: g.icon,
      size: 17
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--text-primary)'
      }
    }, g.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--text-muted)'
      }
    }, g.motto ? `${g.motto} · ` : '', g.members, " ", g.members === 1 ? 'member' : 'members')), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        borderRadius: '50%',
        flexShrink: 0,
        border: '1.5px solid ' + (sel ? 'var(--ember-sandy)' : 'var(--border-strong)'),
        background: sel ? 'var(--ember-sandy)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#3a2410'
      }
    }, sel && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 20
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      margin: '16px 0 12px'
    }
  }, /*#__PURE__*/React.createElement(KBadge, {
    tone: "warm"
  }, "+", xp, " XP each"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)'
    }
  }, invited > 0 ? `${invited} invited` : 'no one invited yet')), /*#__PURE__*/React.createElement(KButton, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    disabled: !ready,
    onClick: () => onStart({
      kind: 'Co-op quest',
      title: title.trim().charAt(0).toUpperCase() + title.trim().slice(1),
      minutes,
      xp,
      line: 'One fire, many travelers. Keep every phone dark.'
    })
  }, ready ? 'Send invitations & begin' : title.trim() ? 'Invite at least one companion' : 'Name your quest to begin'));
}

/* ————— Join a quest (invitations) ————— */
function CoopJoinScreen({
  onBack,
  onGoEvents,
  onStart
}) {
  const [invites, setInvites] = React.useState([{
    id: 1,
    from: 'jimmers',
    img: `${KA}/characters/wizard-profile.jpg`,
    title: '5 am run club',
    minutes: 30,
    xp: 90,
    when: 'Starts when everyone accepts'
  }]);
  const decline = id => setInvites(v => v.filter(i => i.id !== id));
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Join a Quest",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(SubHeader, {
    title: "Join a quest",
    subtitle: "Invitations from your companions.",
    onBack: onBack
  }), invites.length > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      marginTop: 14
    }
  }, invites.map(inv => /*#__PURE__*/React.createElement("div", {
    key: inv.id,
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 16px 14px',
      boxShadow: 'var(--shadow-raised)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    img: inv.img,
    size: 44
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, inv.from, " invites you"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 20,
      color: 'var(--text-primary)',
      marginTop: 1
    }
  }, inv.title)), /*#__PURE__*/React.createElement(KBadge, {
    tone: "warm"
  }, "+", inv.xp, " XP")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)',
      margin: '10px 0 12px'
    }
  }, inv.minutes, " minutes \xB7 ", inv.when), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(KButton, {
    variant: "primary",
    fullWidth: true,
    onClick: () => onStart({
      kind: 'Co-op quest',
      title: inv.title,
      minutes: 2,
      xp: inv.xp,
      line: 'One fire, many travelers. Keep every phone dark.'
    })
  }, "Accept"), /*#__PURE__*/React.createElement(KButton, {
    variant: "outline",
    fullWidth: true,
    onClick: () => decline(inv.id)
  }, "Decline"))))) : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 12,
      padding: '40px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 76,
      height: 76,
      borderRadius: '50%',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mail-open",
    size: 30,
    color: "var(--ember-aegean-60)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      color: 'var(--text-primary)'
    }
  }, "No invitations yet"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14.5,
      lineHeight: 1.5,
      color: 'var(--text-muted)',
      maxWidth: '28ch'
    }
  }, "The road is quiet. Join a public event and meet fellow travelers."), /*#__PURE__*/React.createElement(KButton, {
    variant: "secondary",
    onClick: onGoEvents,
    style: {
      marginTop: 8
    }
  }, "Browse public events")));
}
Object.assign(window, {
  CoopHubScreen,
  CoopCreateScreen,
  CoopJoinScreen,
  CoopAvatar: Avatar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/coop.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/custom-quest.jsx
try { (() => {
// Custom Quest creation screen
const {
  Button: CButton,
  Badge: CBadge,
  EyebrowLabel: CEyebrow
} = window.EmberglowDesignSystem_28f42d;
function fmtClock(d) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}
function fmtDuration(min) {
  if (min < 60) return `${min} minutes`;
  const h = Math.floor(min / 60),
    m = min % 60;
  return m === 0 ? `${h} hour${h > 1 ? 's' : ''}` : `${h} h ${m} min`;
}
function CustomQuestScreen({
  onBack,
  onStart
}) {
  const [title, setTitle] = React.useState('');
  const [minutes, setMinutes] = React.useState(30);
  const [category, setCategory] = React.useState('fitness');
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(now.getTime() + minutes * 60000);
  const xp = minutes * 3;
  const pct = (minutes - 5) / (180 - 5) * 100;
  const ready = title.trim().length > 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Custom Quest",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(SubHeader, {
    title: "Custom Quest",
    subtitle: "An adventure of your own design.",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 18px 22px',
      marginTop: 12,
      boxShadow: 'var(--shadow-raised)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, "I want to"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "go for a run",
    style: {
      flex: 1,
      minWidth: 140,
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      color: 'var(--ember-sandy)',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      borderBottom: '1px solid var(--border-strong)',
      padding: '0 2px 4px',
      caretColor: 'var(--ember-sandy)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      color: 'var(--text-primary)',
      marginTop: 14
    }
  }, "for ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ember-sandy)'
    }
  }, fmtDuration(minutes))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "5",
    max: "180",
    step: "5",
    value: minutes,
    onChange: e => setMinutes(parseInt(e.target.value, 10)),
    className: "ember-slider",
    style: {
      background: `linear-gradient(90deg, var(--ember-cinnabar) 0%, var(--ember-sandy) ${pct}%, rgba(44,69,107,0.45) ${pct}%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, "5 MIN"), /*#__PURE__*/React.createElement("span", null, "3 HOURS"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      marginTop: 18,
      padding: '14px 8px',
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(CEyebrow, {
    tone: "muted",
    style: {
      fontSize: 11,
      marginBottom: 4
    }
  }, "From"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      color: 'var(--text-primary)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, fmtClock(now))), /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18,
    color: "var(--text-accent)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(CEyebrow, {
    tone: "muted",
    style: {
      fontSize: 11,
      marginBottom: 4
    }
  }, "To"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      color: 'var(--ember-sandy)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, fmtClock(end))))), /*#__PURE__*/React.createElement(CEyebrow, {
    tone: "warm",
    style: {
      margin: '20px 0 10px'
    }
  }, "What kind of quest?"), /*#__PURE__*/React.createElement(CategoryPicker, {
    value: category,
    onChange: setCategory
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 20
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(CBadge, {
    tone: "warm"
  }, "+", xp, " XP"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)'
    }
  }, "for staying offline")), /*#__PURE__*/React.createElement(CButton, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    disabled: !ready,
    onClick: () => onStart({
      kind: 'Custom quest',
      title: title.trim() ? title.trim().charAt(0).toUpperCase() + title.trim().slice(1) : 'Custom quest',
      minutes,
      xp,
      line: 'A quest of your own design. The world can wait.'
    })
  }, ready ? 'Start quest' : 'Name your quest to begin'));
}
Object.assign(window, {
  CustomQuestScreen,
  fmtClock,
  fmtDuration
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/custom-quest.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/events.jsx
try { (() => {
// Public events: discover / my events + schedule-an-event form
const {
  Button: EButton,
  Badge: EBadge,
  EyebrowLabel: EEyebrow
} = window.EmberglowDesignSystem_28f42d;
const SEED_EVENTS = [{
  id: 1,
  title: 'Sunset trail walk',
  category: 'Outdoors',
  minutes: 45,
  xp: 135,
  when: 'Today · 7:30 PM',
  host: 'Dusk Evening',
  joined: 12
}, {
  id: 2,
  title: 'Deep work sprint',
  category: 'Work',
  minutes: 90,
  xp: 270,
  when: 'Tomorrow · 9:00 AM',
  host: 'Opal Gem',
  joined: 34
}, {
  id: 3,
  title: 'Morning pages',
  category: 'Creative',
  minutes: 30,
  xp: 90,
  when: 'Sat · 8:00 AM',
  host: 'Phoenix Flame',
  joined: 8
}];
function EventCard({
  ev,
  mine,
  onJoin
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid ' + (ev.registered || mine ? 'rgba(247,164,75,0.4)' : 'var(--border-hairline)'),
      borderRadius: 'var(--radius-lg)',
      padding: '15px 16px',
      boxShadow: 'var(--shadow-raised)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 19,
      color: 'var(--text-primary)'
    }
  }, ev.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)',
      marginTop: 3
    }
  }, ev.when, " \xB7 ", ev.minutes, " min \xB7 hosted by ", ev.host)), /*#__PURE__*/React.createElement(EBadge, {
    tone: "warm"
  }, "+", ev.xp, " XP")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12.5,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 14,
    color: "var(--text-accent)"
  }), " ", ev.joined, " registered"), mine ? /*#__PURE__*/React.createElement(EBadge, {
    tone: "ember"
  }, ev.hosting ? 'Hosting' : 'Registered') : ev.registered ? /*#__PURE__*/React.createElement(EBadge, {
    tone: "success"
  }, "Registered") : /*#__PURE__*/React.createElement(EButton, {
    variant: "secondary",
    size: "sm",
    onClick: onJoin
  }, "Register")));
}
function PublicEventsScreen({
  onBack,
  onCreate,
  myEvents
}) {
  const [tab, setTab] = React.useState('discover');
  const [events, setEvents] = React.useState(SEED_EVENTS);
  const register = id => setEvents(es => es.map(e => e.id === id ? {
    ...e,
    registered: true,
    joined: e.joined + 1
  } : e));
  const mine = [...myEvents, ...events.filter(e => e.registered)];
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Public Events",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(SubHeader, {
    title: "Public events",
    subtitle: "Scheduled quests, open to every traveler.",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      margin: '12px 0 14px'
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    tone: "ember",
    selected: tab === 'discover',
    onClick: () => setTab('discover')
  }, "Discover"), /*#__PURE__*/React.createElement(Chip, {
    tone: "ember",
    selected: tab === 'mine',
    onClick: () => setTab('mine')
  }, "My events")), tab === 'discover' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, events.map(ev => /*#__PURE__*/React.createElement(EventCard, {
    key: ev.id,
    ev: ev,
    onJoin: () => register(ev.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 20
    }
  }), /*#__PURE__*/React.createElement(EButton, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onCreate,
    style: {
      marginTop: 16
    }
  }, "Schedule an event")) : mine.length > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, mine.map(ev => /*#__PURE__*/React.createElement(EventCard, {
    key: ev.id,
    ev: ev,
    mine: true
  }))) : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 12,
      padding: '40px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 76,
      height: 76,
      borderRadius: '50%',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ticket",
    size: 30,
    color: "var(--ember-aegean-60)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      color: 'var(--text-primary)'
    }
  }, "Nothing on your calendar"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14.5,
      lineHeight: 1.5,
      color: 'var(--text-muted)',
      maxWidth: '28ch'
    }
  }, "Register for a community quest, or host your own."), /*#__PURE__*/React.createElement(EButton, {
    variant: "secondary",
    onClick: () => setTab('discover'),
    style: {
      marginTop: 8
    }
  }, "Discover events")));
}

/* ————— Schedule an event ————— */
const MS_DAY = 86400000;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDay(d) {
  const today = new Date();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, new Date(today.getTime() + MS_DAY))) return 'Tomorrow';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/* Compact month calendar — selectable from today to +3 months */
function CalendarPicker({
  value,
  onChange
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setMonth(max.getMonth() + 3);
  const [view, setView] = React.useState(() => new Date((value || today).getFullYear(), (value || today).getMonth(), 1));
  const canPrev = view > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = new Date(view.getFullYear(), view.getMonth() + 1, 1) <= new Date(max.getFullYear(), max.getMonth(), 1);
  const firstDow = (view.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({
    length: daysInMonth
  }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1))];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => canPrev && setView(new Date(view.getFullYear(), view.getMonth() - 1, 1)),
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: canPrev ? 'pointer' : 'default',
      color: canPrev ? 'var(--text-secondary)' : 'var(--ember-bone-a12)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 17,
      color: 'var(--text-primary)'
    }
  }, MONTH_NAMES[view.getMonth()], " ", view.getFullYear()), /*#__PURE__*/React.createElement("div", {
    onClick: () => canNext && setView(new Date(view.getFullYear(), view.getMonth() + 1, 1)),
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: canNext ? 'pointer' : 'default',
      color: canNext ? 'var(--text-secondary)' : 'var(--ember-bone-a12)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 2,
      textAlign: 'center'
    }
  }, ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      padding: '4px 0'
    }
  }, d)), cells.map((d, i) => {
    if (!d) return /*#__PURE__*/React.createElement("div", {
      key: 'e' + i
    });
    const disabled = d < today || d > max;
    const sel = sameDay(d, value);
    const isToday = sameDay(d, today);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => !disabled && onChange(d),
      style: {
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13.5,
        fontWeight: sel ? 700 : 500,
        fontVariantNumeric: 'tabular-nums',
        background: sel ? 'var(--accent-primary)' : 'transparent',
        boxShadow: sel ? 'var(--glow-ember)' : 'none',
        border: isToday && !sel ? '1px solid rgba(247,164,75,0.45)' : '1px solid transparent',
        color: disabled ? 'var(--ember-bone-a12)' : sel ? 'var(--text-on-accent)' : 'var(--text-secondary)',
        transition: 'background var(--duration-fast) var(--ease-out)'
      }
    }, d.getDate());
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-muted)',
      textAlign: 'center',
      marginTop: 8
    }
  }, "Events can be scheduled up to 3 months ahead"));
}
function ScheduleEventScreen({
  onBack,
  onCreated
}) {
  const [title, setTitle] = React.useState('');
  const [minutes, setMinutes] = React.useState(30);
  const [category, setCategory] = React.useState('fitness');
  const [startHour, setStartHour] = React.useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [date, setDate] = React.useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + MS_DAY);
  const pct = (minutes - 5) / (180 - 5) * 100;
  const xp = minutes * 3;
  const ready = title.trim().length > 0;
  const end = new Date(startHour.getTime() + minutes * 60000);
  const shiftHour = dir => setStartHour(d => new Date(d.getTime() + dir * 30 * 60000));
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Schedule Event",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(SubHeader, {
    title: "Schedule an event",
    subtitle: "A quest with a start time, open to everyone.",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 18px 22px',
      marginTop: 12,
      boxShadow: 'var(--shadow-raised)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, "We will"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    placeholder: "walk at sunset",
    style: {
      flex: 1,
      minWidth: 140,
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      color: 'var(--ember-sandy)',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      borderBottom: '1px solid var(--border-strong)',
      padding: '0 2px 4px',
      caretColor: 'var(--ember-sandy)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 24,
      color: 'var(--text-primary)',
      marginTop: 14
    }
  }, "for ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ember-sandy)'
    }
  }, fmtDuration(minutes))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "5",
    max: "180",
    step: "5",
    value: minutes,
    onChange: e => setMinutes(parseInt(e.target.value, 10)),
    className: "ember-slider",
    style: {
      background: `linear-gradient(90deg, var(--ember-cinnabar) 0%, var(--ember-sandy) ${pct}%, rgba(44,69,107,0.45) ${pct}%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, "5 MIN"), /*#__PURE__*/React.createElement("span", null, "3 HOURS")))), /*#__PURE__*/React.createElement(EEyebrow, {
    tone: "warm",
    style: {
      margin: '20px 0 10px'
    }
  }, "Starts at"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 14,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    tone: "ember",
    selected: !pickerOpen && sameDay(date, today),
    onClick: () => {
      setDate(today);
      setPickerOpen(false);
    }
  }, "Today"), /*#__PURE__*/React.createElement(Chip, {
    tone: "ember",
    selected: !pickerOpen && sameDay(date, tomorrow),
    onClick: () => {
      setDate(tomorrow);
      setPickerOpen(false);
    }
  }, "Tomorrow"), /*#__PURE__*/React.createElement(Chip, {
    tone: "ember",
    selected: pickerOpen || !sameDay(date, today) && !sameDay(date, tomorrow),
    onClick: () => setPickerOpen(!pickerOpen)
  }, !sameDay(date, today) && !sameDay(date, tomorrow) ? fmtDay(date) : 'Pick a date')), pickerOpen && /*#__PURE__*/React.createElement(CalendarPicker, {
    value: date,
    onChange: d => {
      setDate(d);
      setPickerOpen(false);
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      marginTop: pickerOpen ? 14 : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => shiftHour(-1),
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "minus",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      minWidth: 130
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--text-accent)',
      marginBottom: 2
    }
  }, fmtDay(date)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 30,
      color: 'var(--ember-sandy)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, fmtClock(startHour)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, "ends ", fmtClock(end))), /*#__PURE__*/React.createElement("div", {
    onClick: () => shiftHour(1),
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 18
  })))), /*#__PURE__*/React.createElement(EEyebrow, {
    tone: "warm",
    style: {
      margin: '20px 0 10px'
    }
  }, "What kind of quest?"), /*#__PURE__*/React.createElement(CategoryPicker, {
    value: category,
    onChange: setCategory
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 16
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      margin: '10px 0 12px'
    }
  }, /*#__PURE__*/React.createElement(EBadge, {
    tone: "warm"
  }, "+", xp, " XP"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)'
    }
  }, "for everyone who finishes")), /*#__PURE__*/React.createElement(EButton, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    disabled: !ready,
    onClick: () => onCreated({
      id: 'mine-' + Date.now(),
      title: title.trim().charAt(0).toUpperCase() + title.trim().slice(1),
      category,
      minutes,
      xp,
      when: fmtDay(date) + ' · ' + fmtClock(startHour),
      host: 'Tommy',
      joined: 1,
      hosting: true
    })
  }, ready ? 'Create event' : 'Name your event to continue'));
}
Object.assign(window, {
  PublicEventsScreen,
  ScheduleEventScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/events.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/guild.jsx
try { (() => {
// Create Guild screen
const {
  Button: GButton,
  EyebrowLabel: GEyebrow
} = window.EmberglowDesignSystem_28f42d;
const GUILD_ICONS = ['axe', 'hammer', 'flame', 'beer', 'shield', 'feather', 'gem', 'crown', 'trees', 'swords'];
const GUILD_FRIENDS = [{
  name: 'Greg the Destroyer',
  cls: 'Knight',
  img: null
}, {
  name: 'jimmers',
  cls: 'Wizard',
  img: '../../assets/characters/wizard-profile.jpg'
}, {
  name: 'Mr weird',
  cls: 'Alchemist',
  img: '../../assets/characters/alchemist-profile.jpg'
}];
function CreateGuildScreen({
  onBack,
  onCreated
}) {
  const [name, setName] = React.useState('');
  const [tagline, setTagline] = React.useState('');
  const [icon, setIcon] = React.useState(null);
  const [picked, setPicked] = React.useState([]);
  const togglePick = n => setPicked(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]);
  const ready = name.trim().length > 0 && icon;
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Create Guild",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(SubHeader, {
    title: "Create a guild",
    subtitle: "A banner for your companions to gather under.",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 18px 22px',
      marginTop: 12,
      boxShadow: 'var(--shadow-raised)'
    }
  }, /*#__PURE__*/React.createElement(GEyebrow, {
    tone: "muted",
    style: {
      fontSize: 11,
      marginBottom: 8
    }
  }, "Guild name"), /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "The Dawn Riders",
    style: {
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-display)',
      fontSize: 26,
      color: 'var(--ember-sandy)',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      borderBottom: '1px solid var(--border-strong)',
      padding: '0 2px 6px',
      caretColor: 'var(--ember-sandy)'
    }
  }), /*#__PURE__*/React.createElement(GEyebrow, {
    tone: "muted",
    style: {
      fontSize: 11,
      margin: '20px 0 8px'
    }
  }, "Tagline \xB7 optional"), /*#__PURE__*/React.createElement("input", {
    value: tagline,
    onChange: e => setTagline(e.target.value),
    placeholder: "A short motto for your guild",
    style: {
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--text-primary)',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0 2px 6px',
      caretColor: 'var(--ember-sandy)'
    }
  })), /*#__PURE__*/React.createElement(GEyebrow, {
    tone: "warm",
    style: {
      margin: '20px 0 10px'
    }
  }, "Choose a banner"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 10
    }
  }, GUILD_ICONS.map(ic => {
    const sel = icon === ic;
    return /*#__PURE__*/React.createElement("div", {
      key: ic,
      onClick: () => setIcon(ic),
      style: {
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        background: sel ? 'rgba(217,73,40,0.14)' : 'var(--surface-raised)',
        border: '1px solid ' + (sel ? 'rgba(217,73,40,0.55)' : 'var(--border-hairline)'),
        boxShadow: sel ? 'var(--glow-ember)' : 'none',
        color: sel ? 'var(--ember-cinnabar-80)' : 'var(--text-secondary)',
        transition: 'all var(--duration-base) var(--ease-out)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 24
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      margin: '20px 0 10px'
    }
  }, /*#__PURE__*/React.createElement(GEyebrow, {
    tone: "warm"
  }, "Invite founding members"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "Optional")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, GUILD_FRIENDS.map((f, i) => {
    const sel = picked.includes(f.name);
    return /*#__PURE__*/React.createElement("div", {
      key: f.name,
      onClick: () => togglePick(f.name),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        cursor: 'pointer',
        borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none',
        background: sel ? 'rgba(247,164,75,0.07)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement(CoopAvatar, {
      img: f.img
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--text-primary)'
      }
    }, f.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--text-muted)'
      }
    }, f.cls)), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        borderRadius: '50%',
        flexShrink: 0,
        border: '1.5px solid ' + (sel ? 'var(--ember-sandy)' : 'var(--border-strong)'),
        background: sel ? 'var(--ember-sandy)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#3a2410',
        transition: 'all var(--duration-fast) var(--ease-out)'
      }
    }, sel && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13
    })));
  })), (name.trim() || icon) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 20,
      padding: '12px 14px',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: '50%',
      flexShrink: 0,
      background: 'rgba(247,164,75,0.10)',
      border: '1px solid rgba(247,164,75,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-accent)'
    }
  }, icon ? /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 19
  }) : /*#__PURE__*/React.createElement(Icon, {
    name: "flag",
    size: 19
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15.5,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, name.trim() || 'Your guild'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, tagline.trim() ? `${tagline.trim()} · ` : '', picked.length > 0 ? `1 member · ${picked.length} invited` : '1 member')), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "Preview")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 20
    }
  }), /*#__PURE__*/React.createElement(GButton, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    disabled: !ready,
    onClick: () => onCreated({
      name: name.trim(),
      motto: tagline.trim() || null,
      members: 1,
      invited: picked.length,
      icon
    }),
    style: {
      marginTop: 16
    }
  }, !ready ? !name.trim() ? 'Name your guild to continue' : 'Choose a banner icon' : picked.length > 0 ? `Raise the banner · invite ${picked.length}` : 'Raise the banner'));
}
Object.assign(window, {
  CreateGuildScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/guild.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/quest-flow.jsx
try { (() => {
// Quest flow: StartQuest (pending) → Timer → Complete / Failed
const {
  Button: QButton,
  Badge: QBadge,
  EyebrowLabel: QEyebrow,
  ProgressRing: QRing
} = window.EmberglowDesignSystem_28f42d;
const QA = '../../assets';

/* ————— Start Quest (pending) ————— */
function StartQuestScreen({
  quest,
  onBegin,
  onCancel
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      overflow: 'hidden'
    },
    "data-screen-label": "Start Quest"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: `url(${QA}/backgrounds/onboarding-bg.jpg) center 30% / cover`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: '0 0 auto 0',
      height: '35%',
      background: 'var(--scrim-top)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 'auto 0 0 0',
      height: '55%',
      background: 'var(--scrim-bottom)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '58px 24px 36px',
      boxSizing: 'border-box',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(QEyebrow, null, quest.kind || 'Story quest'), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 34,
      lineHeight: 1.12,
      margin: '10px 0 0',
      color: 'var(--ember-bone)'
    }
  }, quest.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-accent)',
      marginTop: 10
    }
  }, quest.minutes, " min \xB7 ", quest.xp, " XP"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-hairline)',
      boxShadow: 'var(--shadow-card)',
      background: 'var(--surface-card)',
      backdropFilter: 'blur(10px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 190,
      background: `url(${QA}/backgrounds/card-background-alt.jpg) center 8% / cover`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px 18px'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      lineHeight: 1.5,
      color: 'var(--text-secondary)',
      margin: '0 0 10px'
    }
  }, "Your hero stands ready. The story continues the moment you step away."), /*#__PURE__*/React.createElement(QBadge, {
    tone: "warm"
  }, "+", quest.xp, " XP on return"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      color: 'var(--text-secondary)',
      fontSize: 15,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 17
  }), " Lock your phone to begin"), /*#__PURE__*/React.createElement(QButton, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onBegin
  }, "Begin quest"), /*#__PURE__*/React.createElement(QButton, {
    variant: "ghost",
    fullWidth: true,
    onClick: onCancel,
    style: {
      marginTop: 6
    }
  }, "Cancel quest")));
}

/* ————— Active Quest (timer) ————— */
function TimerScreen({
  quest,
  onAbandon,
  onComplete
}) {
  const total = quest.minutes * 60;
  const [remaining, setRemaining] = React.useState(Math.round(total * 0.83));
  React.useEffect(() => {
    const t = setInterval(() => setRemaining(r => {
      const next = Math.max(0, r - 1);
      if (next === 0) {
        clearInterval(t);
        setTimeout(onComplete, 900);
      }
      return next;
    }), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      overflow: 'hidden'
    },
    "data-screen-label": "Active Quest Timer"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: `url(${QA}/backgrounds/card-background-alt.jpg) center 18% / cover`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,18,27,0.55)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: '0 0 auto 0',
      height: '38%',
      background: 'var(--scrim-top)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 'auto 0 0 0',
      height: '42%',
      background: 'var(--scrim-bottom)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '64px 26px 40px',
      boxSizing: 'border-box',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(QEyebrow, null, "Quest in progress"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 38,
      lineHeight: 1.1,
      margin: '12px 0 10px',
      color: 'var(--ember-bone)'
    }
  }, quest.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      lineHeight: 1.5,
      color: 'var(--text-secondary)',
      margin: 0,
      maxWidth: '28ch'
    }
  }, quest.line || 'The forest darkens. You gather what you can before night falls.'), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(QRing, {
    progress: remaining / total,
    size: 248
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 56,
      color: 'var(--ember-bone)',
      letterSpacing: '0.02em',
      fontVariantNumeric: 'tabular-nums'
    }
  }, fmt(remaining)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, "Of ", quest.minutes, ":00"))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      color: 'var(--text-secondary)',
      margin: '0 0 14px'
    }
  }, "Keep your phone locked to earn ", quest.xp, " XP"), /*#__PURE__*/React.createElement(QButton, {
    variant: "outline",
    fullWidth: true,
    onClick: onAbandon
  }, "Abandon quest")));
}

/* ————— Quest Failed (Guide voice: gentle) ————— */
function QuestFailedScreen({
  quest,
  onRetry,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      background: 'var(--surface-app)',
      display: 'flex',
      flexDirection: 'column',
      padding: '58px 26px 36px',
      boxSizing: 'border-box',
      textAlign: 'center'
    },
    "data-screen-label": "Quest Failed"
  }, /*#__PURE__*/React.createElement(QEyebrow, null, quest.kind || 'Story quest'), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 36,
      lineHeight: 1.12,
      margin: '12px 0 8px',
      color: 'var(--text-primary)'
    }
  }, "The quest slipped away"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 18,
      color: 'var(--text-muted)',
      margin: 0
    }
  }, quest.title), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 88,
      height: 88,
      borderRadius: '50%',
      margin: '0 auto',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "flame-kindling",
    size: 36,
    color: "var(--ember-aegean-60)"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      lineHeight: 1.55,
      color: 'var(--text-primary)',
      margin: '0 auto 8px',
      maxWidth: '28ch'
    }
  }, "That happens. Try again when you're ready."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      lineHeight: 1.5,
      color: 'var(--text-muted)',
      margin: '0 auto',
      maxWidth: '30ch'
    }
  }, "The fire is still lit. No XP was lost \u2014 the story simply waits."))), /*#__PURE__*/React.createElement(QButton, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onRetry
  }, "Try again"), /*#__PURE__*/React.createElement(QButton, {
    variant: "ghost",
    fullWidth: true,
    onClick: onBack,
    style: {
      marginTop: 6
    }
  }, "Back to camp"));
}

/* ————— Quest Complete / Quest Details ————— */
const STORY_TEXT = "We tread carefully through the ruins, the weight of old knowledge pressing down with every step. The stone library looms before us, its dome cracked, its entrance flanked by skeletal columns. Inside, shelves lean at unnatural angles, their books rotted, secrets smothered under layers of time. Rowan lights a torch, and the dark gives a little ground.";
const AUDIO_LEN = 121;
function QuestCompleteScreen({
  quest,
  fromJournal = false,
  onContinue,
  onReflect
}) {
  const isStory = (quest.kind || '').toLowerCase().indexOf('story') !== -1;
  const [playing, setPlaying] = React.useState(false);
  const [pos, setPos] = React.useState(0);
  React.useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPos(p => {
      if (p + 1 >= AUDIO_LEN) {
        setPlaying(false);
        return AUDIO_LEN;
      }
      return p + 1;
    }), 1000);
    return () => clearInterval(t);
  }, [playing]);
  const fmtT = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      background: 'var(--surface-app)',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflowY: 'auto'
    },
    "data-screen-label": "Quest Complete"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 300,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'url(../../assets/backgrounds/card-background-alt.jpg) center 10% / cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: '0 0 auto 0',
      height: '40%',
      background: 'var(--scrim-top)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 'auto 0 0 0',
      height: '75%',
      background: 'linear-gradient(to top, var(--ember-rich-black) 4%, rgba(0,18,27,0.55) 55%, rgba(0,18,27,0))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    onClick: onContinue,
    style: {
      position: 'absolute',
      top: 16,
      left: 12,
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: 'rgba(0,18,27,0.5)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--ember-bone)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 22,
      right: 22,
      bottom: 16
    }
  }, /*#__PURE__*/React.createElement(QEyebrow, {
    tone: "warm"
  }, quest.kind || 'Story quest', fromJournal ? '' : ' · complete'), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 32,
      lineHeight: 1.1,
      margin: '8px 0 0',
      color: 'var(--ember-bone)'
    }
  }, quest.title))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 22px 30px',
      display: 'flex',
      flexDirection: 'column',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(QBadge, {
    tone: "warm"
  }, "+", quest.xp, " XP"), /*#__PURE__*/React.createElement(QBadge, {
    tone: "neutral"
  }, quest.minutes, " min offline"), quest.date && /*#__PURE__*/React.createElement(QBadge, {
    tone: "neutral"
  }, quest.date), !fromJournal && /*#__PURE__*/React.createElement(QBadge, {
    tone: "success"
  }, "Complete")), isStory ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-raised)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px 16px'
    }
  }, /*#__PURE__*/React.createElement(QEyebrow, {
    tone: "muted",
    style: {
      fontSize: 11,
      marginBottom: 10
    }
  }, "The story so far"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15.5,
      lineHeight: 1.65,
      color: 'var(--text-secondary)',
      margin: 0,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 34,
      lineHeight: 1,
      color: 'var(--ember-sandy)',
      float: 'left',
      marginRight: 8,
      marginTop: 4
    }
  }, (quest.story || STORY_TEXT).charAt(0)), (quest.story || STORY_TEXT).slice(1))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px 16px',
      background: 'var(--surface-inset)',
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setPlaying(!playing),
    style: {
      width: 48,
      height: 48,
      flexShrink: 0,
      borderRadius: '50%',
      background: 'var(--accent-primary)',
      boxShadow: 'var(--glow-ember)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--text-on-accent)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: playing ? 'pause' : 'play',
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11.5,
      color: 'var(--text-muted)',
      marginBottom: 6,
      fontVariantNumeric: 'tabular-nums'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Listen to this chapter"), /*#__PURE__*/React.createElement("span", null, fmtT(pos), " / ", fmtT(AUDIO_LEN))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 5,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--ember-aegean-a35)',
      cursor: 'pointer'
    },
    onClick: e => {
      const r = e.currentTarget.getBoundingClientRect();
      setPos(Math.round((e.clientX - r.left) / r.width * AUDIO_LEN));
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${pos / AUDIO_LEN * 100}%`,
      borderRadius: 'var(--radius-pill)',
      background: 'linear-gradient(90deg, var(--ember-cinnabar), var(--ember-sandy))',
      transition: 'width 300ms linear'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    onClick: () => {
      setPos(0);
      setPlaying(false);
    },
    style: {
      width: 40,
      height: 40,
      flexShrink: 0,
      borderRadius: '50%',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "rotate-ccw",
    size: 16
  }))))) : /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      boxShadow: 'var(--shadow-raised)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15.5,
      lineHeight: 1.6,
      color: 'var(--text-secondary)',
      margin: 0
    }
  }, "You kept the fire and the world waited. Time reclaimed, spent on what matters.")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 20
    }
  }), /*#__PURE__*/React.createElement(QButton, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onReflect,
    style: {
      marginTop: 20
    }
  }, "Add reflection"), !fromJournal && /*#__PURE__*/React.createElement(QButton, {
    variant: "secondary",
    fullWidth: true,
    onClick: onContinue,
    style: {
      marginTop: 6
    }
  }, "Continue")));
}
Object.assign(window, {
  StartQuestScreen,
  TimerScreen,
  QuestFailedScreen,
  QuestCompleteScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/quest-flow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/shared.jsx
try { (() => {
// Shared chrome: Icon (lucide), BottomNav, TabHeader
const DS = window.EmberglowDesignSystem_28f42d;
function Icon({
  name,
  size = 22,
  color,
  style
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      lucide.createIcons({
        nameAttr: 'data-lucide'
      });
    }
  }, [name]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    className: "lucide-slot",
    style: {
      display: 'inline-flex',
      width: size,
      height: size,
      color,
      flexShrink: 0,
      ...style
    }
  });
}

/* Bottom navigation — layout and items fixed: Journal, Map, Play (center orb), Profile, Settings */
function BottomNav({
  active,
  onNavigate
}) {
  const left = [{
    id: 'journal',
    icon: 'book',
    label: 'Journal'
  }, {
    id: 'map',
    icon: 'map',
    label: 'Map'
  }];
  const right = [{
    id: 'profile',
    icon: 'user',
    label: 'Profile'
  }, {
    id: 'settings',
    icon: 'settings',
    label: 'Settings'
  }];
  const Tab = ({
    t
  }) => /*#__PURE__*/React.createElement("div", {
    onClick: () => onNavigate(t.id),
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      minWidth: 58,
      minHeight: 44,
      justifyContent: 'center',
      cursor: 'pointer',
      color: t.id === active ? 'var(--ember-bone)' : 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.icon,
    size: 22
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: '0.02em'
    }
  }, t.label));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 20,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      padding: '10px 6px 22px',
      background: 'rgba(0,18,27,0.88)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border-hairline)'
    }
  }, left.map(t => /*#__PURE__*/React.createElement(Tab, {
    key: t.id,
    t: t
  })), /*#__PURE__*/React.createElement("div", {
    onClick: () => onNavigate('play'),
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      minWidth: 58,
      cursor: 'pointer',
      marginTop: -34
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 58,
      height: 58,
      borderRadius: '50%',
      background: active === 'play' ? 'var(--accent-primary-hover)' : 'var(--accent-primary)',
      boxShadow: 'var(--glow-ember), 0 6px 18px rgba(0,18,27,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-on-accent)',
      border: '2px solid rgba(232,220,199,0.18)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "compass",
    size: 26
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      fontWeight: 600,
      color: active === 'play' ? 'var(--ember-bone)' : 'var(--text-muted)'
    }
  }, "Play")), right.map(t => /*#__PURE__*/React.createElement(Tab, {
    key: t.id,
    t: t
  })));
}

/* Standard tab header: Erstoria title + one quiet line */
function TabHeader({
  title,
  subtitle
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 0 6px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 34,
      margin: 0,
      color: 'var(--text-primary)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 15,
      lineHeight: 1.5,
      color: 'var(--text-muted)'
    }
  }, subtitle));
}

/* Filter chip */
function Chip({
  selected,
  tone = 'neutral',
  children,
  onClick
}) {
  const sel = tone === 'ember' ? {
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    border: '1px solid transparent'
  } : {
    background: 'rgba(247,164,75,0.15)',
    color: 'var(--text-accent)',
    border: '1px solid rgba(247,164,75,0.4)'
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13.5,
      fontWeight: 600,
      padding: '7px 14px',
      borderRadius: 'var(--radius-pill)',
      cursor: 'pointer',
      transition: 'background var(--duration-fast) var(--ease-out)',
      ...(selected ? sel : {
        background: 'var(--ember-bone-a06)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-hairline)'
      })
    }
  }, children);
}

/* Quest categories — shared by Custom Quest and Schedule Event forms */
const CATEGORIES = [{
  id: 'fitness',
  label: 'Fitness',
  icon: 'heart-pulse'
}, {
  id: 'work',
  label: 'Work',
  icon: 'briefcase'
}, {
  id: 'social',
  label: 'Social',
  icon: 'users'
}, {
  id: 'self-care',
  label: 'Self-care',
  icon: 'sparkles'
}, {
  id: 'learning',
  label: 'Learning',
  icon: 'book-open'
}, {
  id: 'creative',
  label: 'Creative',
  icon: 'feather'
}, {
  id: 'household',
  label: 'Household',
  icon: 'home'
}, {
  id: 'outdoors',
  label: 'Outdoors',
  icon: 'trees'
}, {
  id: 'other',
  label: 'Other',
  icon: 'compass'
}];

/* Horizontally scrollable category rail */
function CategoryPicker({
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "cat-scroll",
    style: {
      display: 'flex',
      gap: 10,
      overflowX: 'auto',
      alignSelf: 'stretch',
      minWidth: 0,
      flexShrink: 0,
      margin: '0 -20px',
      padding: '4px 20px 10px'
    }
  }, CATEGORIES.map(c => {
    const sel = value === c.id;
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      onClick: () => onChange(c.id),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
        minWidth: 92,
        padding: '16px 12px',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        background: sel ? 'rgba(217,73,40,0.14)' : 'var(--surface-raised)',
        border: '1px solid ' + (sel ? 'rgba(217,73,40,0.55)' : 'var(--border-hairline)'),
        boxShadow: sel ? 'var(--glow-ember)' : 'none',
        transition: 'all var(--duration-base) var(--ease-out)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: c.icon,
      size: 22,
      color: sel ? 'var(--ember-cinnabar-80)' : 'var(--text-secondary)'
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: sel ? 'var(--text-primary)' : 'var(--text-secondary)'
      }
    }, c.label));
  }));
}
Object.assign(window, {
  Icon,
  BottomNav,
  TabHeader,
  Chip,
  CATEGORIES,
  CategoryPicker
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/shared.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/social.jsx
try { (() => {
// Sub-screens: Skill Tree, Leaderboard, Achievements + Invite Friends sheet
const {
  Button: SButton,
  Badge: SBadge,
  EyebrowLabel: SEyebrow,
  ListItem: SListItem,
  Input: SInput,
  BottomSheet: SSheet
} = window.EmberglowDesignSystem_28f42d;
const SA = '../../assets';

/* Back header for sub-screens */
function SubHeader({
  title,
  subtitle,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 0 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onBack,
    style: {
      width: 40,
      height: 40,
      marginLeft: -8,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 22
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      fontSize: 30,
      margin: 0,
      color: 'var(--text-primary)'
    }
  }, title)), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 14.5,
      lineHeight: 1.5,
      color: 'var(--text-muted)'
    }
  }, subtitle));
}

/* ————— Skill Tree ————— */
const PERK_TIERS = [{
  tier: 'Tier I',
  note: 'Available now',
  perks: [{
    name: "Warrior's Might",
    effect: '+10% XP from fitness quests',
    icon: 'sword'
  }, {
    name: 'Quick Break',
    effect: '+10% XP for quests 15–30 min',
    icon: 'hourglass'
  }, {
    name: 'Morning Ritual',
    effect: '+15% XP before 9 AM',
    icon: 'sunrise'
  }, {
    name: 'Kindling',
    effect: 'Streak survives one missed day',
    icon: 'flame-kindling'
  }]
}, {
  tier: 'Tier II',
  note: 'Unlock 3 perks in Tier I',
  locked: true,
  perks: [{
    name: 'Deep Focus',
    effect: '+20% XP for quests over 45 min',
    icon: 'moon-star'
  }, {
    name: 'Storyteller',
    effect: 'Reflections grant +10 XP',
    icon: 'feather'
  }, {
    name: 'Torchbearer',
    effect: 'Co-op quests grant +15% XP for all',
    icon: 'users'
  }, {
    name: 'Night Watch',
    effect: '+15% XP after sunset',
    icon: 'moon'
  }]
}, {
  tier: 'Tier III',
  note: 'Unlock 3 perks in Tier II',
  locked: true,
  perks: [{
    name: 'Second Wind',
    effect: 'One retry keeps quest XP intact',
    icon: 'wind'
  }, {
    name: 'Pathfinder',
    effect: 'Reveal one story branch early',
    icon: 'signpost'
  }, {
    name: 'Emberheart',
    effect: '+25% XP on 7-day streaks',
    icon: 'heart-pulse'
  }, {
    name: 'Oathkeeper',
    effect: 'Custom quests count as story XP',
    icon: 'scroll'
  }]
}];
function PerkCard({
  perk,
  state,
  onUnlock
}) {
  // state: 'unlocked' | 'available' | 'locked'
  const unlocked = state === 'unlocked';
  const locked = state === 'locked';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: unlocked ? 'rgba(247,164,75,0.10)' : 'var(--surface-raised)',
      border: '1px solid ' + (unlocked ? 'rgba(247,164,75,0.45)' : 'var(--border-hairline)'),
      boxShadow: unlocked ? 'var(--glow-warm)' : 'none',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 14px 12px',
      opacity: locked ? 0.45 : 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      transition: 'all var(--duration-base) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: '50%',
      background: unlocked ? 'rgba(247,164,75,0.18)' : 'var(--ember-bone-a06)',
      border: '1px solid ' + (unlocked ? 'rgba(247,164,75,0.4)' : 'var(--border-hairline)'),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: unlocked ? 'var(--ember-sandy)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: locked ? 'lock' : perk.icon,
    size: 18
  })), unlocked && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    color: "var(--ember-sandy)"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text-primary)',
      lineHeight: 1.2
    }
  }, perk.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      lineHeight: 1.45,
      color: 'var(--text-muted)',
      marginTop: 3
    }
  }, perk.effect)), state === 'available' && /*#__PURE__*/React.createElement(SButton, {
    variant: "secondary",
    size: "sm",
    fullWidth: true,
    onClick: onUnlock,
    style: {
      marginTop: 'auto'
    }
  }, "Unlock \xB7 1 pt"));
}
function SkillTreeScreen({
  onBack
}) {
  const [unlocked, setUnlocked] = React.useState([]);
  const [announce, setAnnounce] = React.useState(() => !localStorage.getItem('emberglow-kit-skilltree-seen'));
  const dismiss = () => {
    localStorage.setItem('emberglow-kit-skilltree-seen', '1');
    setAnnounce(false);
  };
  const points = 3 - unlocked.length;
  const total = PERK_TIERS.reduce((n, t) => n + t.perks.length, 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Skill Tree"
  }, /*#__PURE__*/React.createElement(SubHeader, {
    title: "Skill Tree",
    subtitle: "Choose the path your hero grows along.",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      margin: '10px 0 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(SEyebrow, {
    tone: "warm"
  }, "Knight \xB7 Level 7"), /*#__PURE__*/React.createElement(SBadge, {
    tone: points > 0 ? 'warm' : 'neutral'
  }, points, " ", points === 1 ? 'point' : 'points')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      marginBottom: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap'
    }
  }, unlocked.length, " of ", total, " unlocked"), /*#__PURE__*/React.createElement("span", {
    onClick: () => setUnlocked([]),
    style: {
      color: 'var(--ember-cinnabar-80)',
      cursor: 'pointer'
    }
  }, "Reset")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--ember-aegean-a35)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${unlocked.length / total * 100}%`,
      borderRadius: 'var(--radius-pill)',
      background: 'linear-gradient(90deg, var(--ember-cinnabar), var(--ember-sandy))',
      transition: 'width var(--duration-slow) var(--ease-out)'
    }
  }))), PERK_TIERS.map((tier, ti) => {
    const tierUnlockedCount = tier.perks.filter(p => unlocked.includes(p.name)).length;
    const prevTier = PERK_TIERS[ti - 1];
    const tierOpen = ti === 0 || prevTier && prevTier.perks.filter(p => unlocked.includes(p.name)).length >= 3;
    return /*#__PURE__*/React.createElement("div", {
      key: tier.tier,
      style: {
        position: 'relative',
        paddingLeft: 22,
        marginTop: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 6,
        top: 26,
        bottom: ti === PERK_TIERS.length - 1 ? 'auto' : -20,
        height: ti === PERK_TIERS.length - 1 ? 'calc(100% - 26px)' : 'auto',
        width: 1,
        background: tierOpen ? 'rgba(247,164,75,0.35)' : 'var(--border-subtle)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 1,
        top: 12,
        width: 11,
        height: 11,
        borderRadius: '50%',
        background: tierOpen ? 'var(--ember-sandy)' : 'var(--ember-aegean)',
        boxShadow: tierOpen ? '0 0 10px rgba(247,164,75,0.6)' : 'none'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 19,
        color: tierOpen ? 'var(--text-primary)' : 'var(--text-muted)'
      }
    }, tier.tier), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, tierOpen ? `${tierUnlockedCount} of ${tier.perks.length}` : tier.note)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10
      }
    }, tier.perks.map(p => {
      const state = unlocked.includes(p.name) ? 'unlocked' : tierOpen && points > 0 ? 'available' : 'locked';
      return /*#__PURE__*/React.createElement(PerkCard, {
        key: p.name,
        perk: p,
        state: state,
        onUnlock: () => setUnlocked([...unlocked, p.name])
      });
    })));
  }), /*#__PURE__*/React.createElement(SSheet, {
    open: announce,
    onClose: dismiss,
    title: "Skill trees have arrived"
  }, /*#__PURE__*/React.createElement(SEyebrow, {
    tone: "warm",
    style: {
      textAlign: 'center',
      marginBottom: 10
    }
  }, "New"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      lineHeight: 1.55,
      color: 'var(--text-secondary)',
      margin: '0 auto 18px',
      textAlign: 'center',
      maxWidth: '34ch'
    }
  }, "You've grown strong enough to choose a path. Spend points on perks that boost your XP and shape your story."), /*#__PURE__*/React.createElement(SButton, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: dismiss
  }, "Choose your first perk"), /*#__PURE__*/React.createElement(SButton, {
    variant: "ghost",
    fullWidth: true,
    onClick: dismiss,
    style: {
      marginTop: 6
    }
  }, "Maybe later")));
}

/* ————— Leaderboard ————— */
const BOARDS = {
  friends: [{
    name: 'Greg the Destroyer',
    cls: 'Knight',
    img: null,
    quests: 47,
    minutes: 812,
    streak: 9
  }, {
    name: 'Tommy',
    cls: 'Knight',
    you: true,
    img: null,
    quests: 36,
    minutes: 139,
    streak: 0
  }, {
    name: 'jimmers',
    cls: 'Wizard',
    img: `${SA}/characters/wizard-profile.jpg`,
    quests: 20,
    minutes: 340,
    streak: 4
  }, {
    name: 'Mr weird',
    cls: 'Alchemist',
    img: `${SA}/characters/alchemist-profile.jpg`,
    quests: 12,
    minutes: 95,
    streak: 2
  }],
  global: [{
    name: 'Dusk Evening',
    cls: 'Ranger',
    img: `${SA}/characters/alchemist-profile.jpg`,
    quests: 214,
    minutes: 5120,
    streak: 61
  }, {
    name: 'Opal Gem',
    cls: 'Knight',
    img: null,
    quests: 198,
    minutes: 4308,
    streak: 44
  }, {
    name: 'Phoenix Flame',
    cls: 'Wizard',
    img: `${SA}/characters/wizard-profile.jpg`,
    quests: 187,
    minutes: 3990,
    streak: 38
  }, {
    name: 'Greg the Destroyer',
    cls: 'Knight',
    img: null,
    quests: 47,
    minutes: 812,
    streak: 9
  }, {
    name: 'Tommy',
    cls: 'Knight',
    you: true,
    img: null,
    quests: 36,
    minutes: 139,
    streak: 0
  }]
};
const METRICS = [{
  id: 'quests',
  label: 'Quests',
  icon: 'check-circle',
  unit: 'quests'
}, {
  id: 'minutes',
  label: 'Minutes',
  icon: 'clock',
  unit: 'min offline'
}, {
  id: 'streak',
  label: 'Streaks',
  icon: 'flame',
  unit: 'day streak'
}];
function LeaderboardScreen({
  onBack
}) {
  const [scope, setScope] = React.useState('friends');
  const [metric, setMetric] = React.useState('quests');
  const m = METRICS.find(x => x.id === metric);
  const rows = [...BOARDS[scope]].sort((a, b) => b[metric] - a[metric]);
  const top = rows[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Leaderboard"
  }, /*#__PURE__*/React.createElement(SubHeader, {
    title: "Leaderboard",
    subtitle: "The fire draws many travelers.",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-pill)',
      padding: 3,
      margin: '10px 0 12px'
    }
  }, ['friends', 'global'].map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    onClick: () => setScope(s),
    style: {
      flex: 1,
      padding: '9px 0',
      borderRadius: 'var(--radius-pill)',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: 14.5,
      fontWeight: 600,
      textTransform: 'capitalize',
      background: scope === s ? 'var(--accent-primary)' : 'transparent',
      color: scope === s ? 'var(--text-on-accent)' : 'var(--text-secondary)',
      transition: 'background var(--duration-fast) var(--ease-out)'
    }
  }, s))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 14
    }
  }, METRICS.map(x => /*#__PURE__*/React.createElement(Chip, {
    key: x.id,
    tone: "ember",
    selected: metric === x.id,
    onClick: () => setMetric(x.id)
  }, x.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--surface-raised)',
      border: '1px solid rgba(247,164,75,0.3)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 16px 18px',
      textAlign: 'center',
      boxShadow: 'var(--shadow-card)'
    }
  }, /*#__PURE__*/React.createElement(SEyebrow, {
    tone: "warm"
  }, "First flame"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: '50%',
      margin: '12px auto 10px',
      overflow: 'hidden',
      border: '2px solid var(--ember-sandy)',
      boxShadow: 'var(--glow-warm)',
      background: 'var(--ember-bone-a06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-accent)'
    }
  }, top.img ? /*#__PURE__*/React.createElement("img", {
    src: top.img,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 30
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 21,
      color: 'var(--text-primary)'
    }
  }, top.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, top.cls), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 34,
      color: 'var(--ember-sandy)',
      marginTop: 8
    }
  }, top[metric].toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, m.unit)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-hairline)',
      overflow: 'hidden',
      margin: '12px 0 20px'
    }
  }, rows.slice(1).map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none',
      background: r.you ? 'rgba(247,164,75,0.08)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      fontFamily: 'var(--font-display)',
      fontSize: 17,
      color: r.you ? 'var(--ember-sandy)' : 'var(--text-muted)'
    }
  }, i + 2), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: '50%',
      overflow: 'hidden',
      background: 'var(--ember-bone-a06)',
      border: '1px solid var(--border-hairline)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-secondary)',
      flexShrink: 0
    }
  }, r.img ? /*#__PURE__*/React.createElement("img", {
    src: r.img,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: r.you ? 700 : 500,
      color: 'var(--text-primary)'
    }
  }, r.name), r.you && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-accent)',
      marginLeft: 6
    }
  }, "You")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, r[metric].toLocaleString())))));
}
Object.assign(window, {
  SubHeader,
  SkillTreeScreen,
  LeaderboardScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/social.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/tabs.jsx
try { (() => {
// Tab screens: Journal, Profile, Play, Map (placeholder), Settings
const {
  Button,
  Badge,
  EyebrowLabel,
  XPBar,
  ListItem,
  Switch
} = window.EmberglowDesignSystem_28f42d;
const A = '../../assets';

/* ————— Journal ————— */
const JOURNAL_ENTRIES = [{
  title: "The Watcher's Gate",
  type: 'Story',
  status: 'Completed',
  xp: 120,
  date: 'Jul 9',
  minutes: 25
}, {
  title: 'go play',
  type: 'Co-op',
  status: 'Completed',
  xp: 90,
  date: 'Jul 9',
  minutes: 30
}, {
  title: 'run',
  type: 'Co-op',
  status: 'Completed',
  xp: 15,
  date: 'Jul 7',
  minutes: 5
}, {
  title: '5 am run club',
  type: 'Co-op',
  status: 'Completed',
  xp: 126,
  date: 'Jul 7',
  minutes: 30
}, {
  title: 'run',
  type: 'Co-op',
  status: 'Completed',
  xp: 15,
  date: 'Jul 7',
  minutes: 5
}, {
  title: "Stone Library & King's Method",
  type: 'Story',
  status: 'Failed',
  date: 'Jul 5',
  minutes: 1
}, {
  title: "Stone Library & King's Method",
  type: 'Story',
  status: 'Failed',
  date: 'Jul 5',
  minutes: 2
}];
function JournalScreen({
  onNavigate,
  onOpenEntry = () => {}
}) {
  const [type, setType] = React.useState('All');
  const [status, setStatus] = React.useState('All');
  const entries = JOURNAL_ENTRIES.filter(e => (type === 'All' || e.type === type) && (status === 'All' || e.status === status));
  const typeIcon = {
    Story: 'scroll',
    'Co-op': 'users',
    Custom: 'feather'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Journal"
  }, /*#__PURE__*/React.createElement(TabHeader, {
    title: "Journal",
    subtitle: "Every quest leaves a mark."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      margin: '12px 0 6px'
    }
  }, ['All', 'Story', 'Custom', 'Co-op'].map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t,
    tone: "ember",
    selected: type === t,
    onClick: () => setType(t)
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 16
    }
  }, ['All', 'Completed', 'Failed'].map(s => /*#__PURE__*/React.createElement(Chip, {
    key: s,
    selected: status === s,
    onClick: () => setStatus(s)
  }, s === 'All' ? 'All status' : s))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-hairline)',
      overflow: 'hidden'
    }
  }, entries.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: typeIcon[e.type] || 'scroll',
      size: 19,
      color: e.status === 'Failed' ? 'var(--ember-cinnabar-80)' : 'var(--text-accent)'
    }),
    title: e.title,
    subtitle: `${e.date} · ${e.minutes} min · ${e.type}`,
    onClick: () => onOpenEntry(e),
    trailing: e.status === 'Failed' ? /*#__PURE__*/React.createElement(Badge, {
      tone: "ember"
    }, "Failed") : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-accent)',
        fontWeight: 600
      }
    }, "+", e.xp, " XP")
  }))), entries.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '28px 20px',
      textAlign: 'center',
      fontSize: 14.5,
      color: 'var(--text-muted)'
    }
  }, "No quests here yet. The road is still open.")));
}

/* ————— Profile ————— */
function ProfileScreen({
  onOpen = () => {},
  onInvite = () => {},
  extraGuilds = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Profile"
  }, /*#__PURE__*/React.createElement(TabHeader, {
    title: "Profile"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-hairline)',
      boxShadow: 'var(--shadow-card)',
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 300,
      background: `url(${A}/backgrounds/card-background-alt.jpg) center 12% / cover`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 'auto 0 0 0',
      height: '65%',
      background: 'var(--scrim-bottom)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 28,
      color: 'var(--text-primary)'
    }
  }, "Tommy"), /*#__PURE__*/React.createElement(Icon, {
    name: "pencil",
    size: 15,
    color: "var(--text-muted)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-accent)',
      marginTop: 4
    }
  }, "Level 6 \xB7 Knight"), /*#__PURE__*/React.createElement(XPBar, {
    level: 6,
    xp: 741,
    xpNext: 759,
    style: {
      marginTop: 12
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 10,
      marginTop: 12
    }
  }, [['35', 'Quests'], ['139', 'Minutes saved'], ['0', 'Day streak']].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 8px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 26,
      color: 'var(--ember-bone)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-hairline)',
      marginTop: 12,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 19
    }),
    title: "Skills & Perks",
    subtitle: "Unlock your first perk",
    trailing: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 17
    }),
    onClick: () => onOpen('skills')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "trending-up",
      size: 19
    }),
    title: "Leaderboard",
    subtitle: "See how others are doing",
    trailing: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 17
    }),
    onClick: () => onOpen('leaderboard')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "award",
      size: 19
    }),
    title: "Achievements",
    subtitle: "Track your progress",
    trailing: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 17
    }),
    onClick: () => onOpen('achievements')
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      margin: '22px 0 8px'
    }
  }, /*#__PURE__*/React.createElement(EyebrowLabel, {
    tone: "warm"
  }, "Guilds \xB7 ", 2 + extraGuilds.length, " of 3"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => onOpen('createguild'),
    disabled: 2 + extraGuilds.length >= 3
  }, "+ Create")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-hairline)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "flag",
      size: 19
    }),
    title: "Runner's Highness",
    subtitle: "Carry the torches \xB7 2 members",
    trailing: /*#__PURE__*/React.createElement(Badge, {
      tone: "neutral"
    }, "Owner"),
    onClick: () => {}
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "beer",
      size: 19
    }),
    title: "workfriends",
    subtitle: "1 member",
    trailing: /*#__PURE__*/React.createElement(Badge, {
      tone: "neutral"
    }, "Owner"),
    onClick: () => {}
  })), extraGuilds.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.name,
    style: {
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: g.icon,
      size: 19
    }),
    title: g.name,
    subtitle: `${g.motto ? g.motto + ' · ' : ''}${g.members} member${g.members === 1 ? '' : 's'}`,
    trailing: /*#__PURE__*/React.createElement(Badge, {
      tone: "neutral"
    }, "Owner"),
    onClick: () => {}
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 14
    }
  }, "Join with a code")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      margin: '22px 0 8px'
    }
  }, /*#__PURE__*/React.createElement(EyebrowLabel, {
    tone: "warm"
  }, "Friends \xB7 3"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: onInvite
  }, "+ Invite")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-hairline)',
      overflow: 'hidden',
      marginBottom: 20
    }
  }, [['jimmers', 'Wizard', `${A}/characters/wizard-profile.jpg`], ['Mr weird', 'Alchemist', `${A}/characters/alchemist-profile.jpg`], ['Greg the Destroyer', 'Knight', null]].map(([name, cls, img], i) => /*#__PURE__*/React.createElement("div", {
    key: name,
    style: {
      borderTop: i > 0 ? '1px solid var(--border-hairline)' : 'none'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: img ? /*#__PURE__*/React.createElement("img", {
      src: img,
      alt: "",
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "user",
      size: 19
    }),
    title: name,
    subtitle: cls,
    trailing: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5
      }
    }, "Remove")
  })))));
}

/* ————— Play ————— */
const ADVENTURES = [{
  kind: 'Story quest',
  title: "Stone Library & King's Method",
  meta: '2 min · 90 XP',
  body: 'After escaping into the forest, Rowan and I confronted uncomfortable truths about Vaedros\u2019 fall.',
  image: `${A}/backgrounds/card-background-alt.jpg`,
  progress: 0.48,
  cta: 'Enter the library'
}, {
  kind: 'Free play',
  title: 'Start Custom Quest',
  meta: '5 min · 15 XP',
  body: 'An adventure of your own design. Name it, set the time, put the phone down.',
  image: `${A}/backgrounds/onboarding-bg.jpg`,
  cta: 'Create custom quest'
}, {
  kind: 'Co-op',
  title: 'Quest With Friends',
  meta: 'Everyone keeps their phone locked',
  body: 'If anyone unlocks early, everyone fails together. Carry the torches.',
  image: null,
  cta: 'Gather your party'
}];
function PlayScreen({
  onStartQuest
}) {
  const [idx, setIdx] = React.useState(0);
  const av = ADVENTURES[idx];
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Play",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(TabHeader, {
    title: "Choose your adventure",
    subtitle: "Continue the story, craft your own quest, or ride with friends."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-hairline)',
      boxShadow: 'var(--shadow-card)',
      marginTop: 12,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 380,
      background: av.image ? `url(${av.image}) center 25% / cover` : 'var(--surface-raised)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to top, rgba(0,18,27,0.95) 8%, rgba(0,18,27,0.45) 45%, rgba(0,18,27,0.15))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 16
    }
  }, /*#__PURE__*/React.createElement(EyebrowLabel, null, av.kind), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 27,
      lineHeight: 1.12,
      color: 'var(--text-primary)',
      margin: '8px 0 4px'
    }
  }, av.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--text-accent)',
      marginBottom: 8
    }
  }, av.meta), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      lineHeight: 1.5,
      color: 'var(--text-secondary)',
      margin: 0
    }
  }, av.body), av.progress != null && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      marginBottom: 5
    }
  }, /*#__PURE__*/React.createElement("span", null, "Story progress"), /*#__PURE__*/React.createElement("span", null, Math.round(av.progress * 100), "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 'var(--radius-pill)',
      background: 'rgba(232,220,199,0.18)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${av.progress * 100}%`,
      borderRadius: 'var(--radius-pill)',
      background: 'linear-gradient(90deg, var(--ember-cinnabar), var(--ember-sandy))'
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      margin: '14px 0'
    }
  }, ADVENTURES.map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: () => setIdx(i),
    style: {
      width: i === idx ? 22 : 8,
      height: 8,
      borderRadius: 'var(--radius-pill)',
      cursor: 'pointer',
      background: i === idx ? 'var(--ember-sandy)' : 'var(--ember-bone-a12)',
      transition: 'all var(--duration-base) var(--ease-out)'
    }
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: () => onStartQuest(av),
    style: {
      flexShrink: 0
    }
  }, av.cta));
}

/* ————— Map (placeholder — no source reference provided) ————— */
function MapScreen() {
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Map",
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(TabHeader, {
    title: "Map"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 10,
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--radius-lg)',
      margin: '12px 0 20px',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map",
    size: 30,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      color: 'var(--text-muted)',
      maxWidth: '26ch',
      lineHeight: 1.5
    }
  }, "Left blank on purpose \u2014 no Map reference was provided for this kit.")));
}

/* ————— Settings ————— */
function SettingsScreen() {
  const [notif, setNotif] = React.useState(true);
  const [daily, setDaily] = React.useState(false);
  const [streak, setStreak] = React.useState(true);
  return /*#__PURE__*/React.createElement("div", {
    className: "tab-scroll",
    "data-screen-label": "Settings"
  }, /*#__PURE__*/React.createElement(TabHeader, {
    title: "Settings"
  }), /*#__PURE__*/React.createElement(EyebrowLabel, {
    tone: "muted",
    style: {
      margin: '14px 0 8px'
    }
  }, "Account"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-hairline)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "user",
      size: 19
    }),
    title: "thomas@shellberg.com",
    subtitle: "Signed in",
    trailing: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5
      }
    }, "Log out")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "crown",
      size: 19
    }),
    title: "emberglow Premium",
    subtitle: "Manage subscription",
    trailing: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 17
    }),
    onClick: () => {}
  }))), /*#__PURE__*/React.createElement(EyebrowLabel, {
    tone: "muted",
    style: {
      margin: '20px 0 8px'
    }
  }, "Preferences"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-hairline)',
      overflow: 'hidden',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "globe",
      size: 19
    }),
    title: "Timezone",
    subtitle: "Berlin",
    trailing: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 17
    }),
    onClick: () => {}
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "bell",
      size: 19
    }),
    title: "Notifications",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: notif,
      onChange: setNotif
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "clock",
      size: 19
    }),
    title: "Daily reminder",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: daily,
      onChange: setDaily
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(ListItem, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "flame",
      size: 19
    }),
    title: "Streak warning",
    subtitle: "Reminder at 8:00 PM",
    trailing: /*#__PURE__*/React.createElement(Switch, {
      checked: streak,
      onChange: setStreak
    })
  }))));
}
Object.assign(window, {
  JournalScreen,
  ProfileScreen,
  PlayScreen,
  MapScreen,
  SettingsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/tabs.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.EyebrowLabel = __ds_scope.EyebrowLabel;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.BottomSheet = __ds_scope.BottomSheet;

__ds_ns.ListItem = __ds_scope.ListItem;

__ds_ns.ProgressRing = __ds_scope.ProgressRing;

__ds_ns.QuestCard = __ds_scope.QuestCard;

__ds_ns.XPBar = __ds_scope.XPBar;

})();
