# M7 refinement — Direct Cards and Items

## The agreed model (Option A)
Only two authored visual node kinds exist: **Cards** (groups/layout grids) and **Items** (atomic text, image, rich-text, link and similar payloads). Cards can directly contain Cards and Items; Items cannot own other layout nodes. No graphical `Block` type or anonymous positioning wrapper is needed.

The DOM follows that tree. Each element holds its own grid area and editor selection ID:
- `<div class="card card-page"> ...` — the Page is the master grid
- `<nav class="card card-nav">`, `<main class="card card-main">`, `<footer class="card card-footer">` — semantic Cards, direct Page children
- `<section class="card card-section card-hero">...` — direct authored section
- `<div class="item item-text">`, `<figure class="item item-image">`, `<a class="item item-button">` — atomic payloads
- `<a class="card card-record card-project-record">...</a>` — each linkable query result is a fully fledged Card

The classes `.card` and `.item` are primary, while semantic classes, variant names and payload styling are secondary. Incidental content nodes such as `img` inside a `figure` are payload internals, not graphic-tree nodes.

## Source-driven Cards
A Card with `source: {collection,template,layout,filter,sort,count}` is an ordinary Card whose immediate child Cards are generated from record data. The specified reusable component holds one record Card template. The renderer instantiates that Card for each record and assigns explicit grid cells. The project-record Card contains image, category and title Items **directly**. Journal records use the same mechanism with a three-column Card. Editing the record Card template updates all matching records; every project tile now groups its entire content.

A Card with `reference:"component-id"` instantiates a reusable component in another ordinary Card. Previous JSON `query` and `component` directives are upgraded on Studio import for backwards compatibility.

## Overflow and scrolling
An Item uses `overflow:"clip"` by default, so content beyond its cell is hidden. Optional `overflow:"scroll"` exposes inner scrolling with invisible scrollbar, and `overscroll-behavior:auto` lets the wheel chain to the document at its limits. No universal `overflow:auto` wrappers and no `overscroll-behavior:contain`: the Page must scroll normally when hovering content.

## Preserved visual principles
Every Card fills the assigned cell. Card rows/columns are equal subdivisions with explicit child areas. `1u = 1cqw` relative to Page width; grid tracks never rearrange at breakpoints. All Cards use `site.design.pad` and `.gap` at 1×,2× or 4×. Optional aspect-ratio height lock, grayscale palette and 20%-opacity outlines remain.

## Review gate
The feature branch is for review, not a live change. Confirm tests, screenshot comparisons at 1600 and narrow 440, browser DOM nesting and wheel/page scroll before merge. Demo projects/posts remain noindex.
