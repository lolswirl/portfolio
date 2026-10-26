+++
title = "swirl theme"
description = "a dark purple editor theme with neon green, pink and yellow syntax, for vs code and zed."
weight = 11
date = 2026-10-24

[taxonomies]
tags = ["json", "vscode", "zed"]

[extra]
blurb = "dark purple editor theme for vs code and zed"
read_time = true
# drop a screenshot in this folder and uncomment (path is section-relative):
# local_image = "swirl-theme/screenshot.png"
tags = ["json", "vscode", "zed"]
github = "https://github.com/lolswirl/swirl-theme"
+++

## intro

a color theme for the two editors i use, vs code and zed. it's a dark purple background with neon green keywords, pink functions and types, and yellow strings.

it started as the banner theme from [rainglow](https://github.com/rainglow/vscode) by dayle rees, with a pile of fixes layered on top.

## what it does

- **readable comments:** comments are a neutral grey instead of blending into the background
- **neutral selections:** selections are translucent white overlays, so green keywords stay legible when highlighted
- **a dark status bar** instead of a bright one
- **a real terminal palette:** blue is actually blue, with a normal and bright version of each ansi color
- **rainbow brackets:** brackets cycle through six colors by nesting depth, using vs code's bracket pair colorization and zed's `colorize_brackets`

## how it works

there's no code, only two theme files: `vscode/themes/swirl-color-theme.json` and `zed/swirl.json`. the vs code one is packaged by a small `package.json`, and installing either is copying the file into the editor's folder.

vs code themes color text by textmate scope. one rule in the theme paints everything that isn't inside a call's arguments green, which is what gives plain text and punctuation its color:

```json
{
  "name": "Swirl: everything outside call arguments",
  "scope": "!meta.function-call.arguments",
  "settings": {
    "foreground": "#70eb51"
  }
}
```

zed maps colors to tree-sitter captures instead of scopes, so the two ports can't match exactly. zed can't color a string's quotes separately from its body, and that scope rule can only be approximated by coloring punctuation. the readme lists these differences, and the full palette with a swatch for each color.

## stack

**built with:** json  
**editors:** vs code, zed
