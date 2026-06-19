// CSS roadmap questions (120): 15 levels × 8, easiest → hardest. Authored as a
// single 8-per-level list and built directly. See lib/roadmap.ts for titles.

import type { Seed } from './roadmap-build';

export const cssSeeds: Seed[] = [
  // ── Level 1 — CSS Basics ───────────────────────────────────────────────
  { q: 'What does CSS stand for?', opts: ['Cascading Style Sheets', 'Creative Style System', 'Computer Styled Sections', 'Colorful Style Sheets'], a: 0, e: 'CSS is Cascading Style Sheets — the language for styling HTML.', tags: ['CSS', 'Basics'] },
  { q: 'What is CSS used for?', opts: ['Structuring content', 'Styling and laying out content', 'Adding logic', 'Storing data'], a: 1, e: 'CSS controls how HTML looks: colors, spacing, layout, fonts.', tags: ['CSS', 'Basics'] },
  { q: 'A CSS rule consists of:', opts: ['A tag and text', 'A selector and a declaration block', 'A function', 'A variable'], a: 1, e: 'A rule is a selector plus { property: value; } declarations.', tags: ['CSS', 'Basics'] },
  { q: 'How is a single declaration written?', opts: ['value: property', 'property: value;', '{property}', 'property = value'], a: 1, e: 'Each declaration is property: value; inside the block.', tags: ['CSS', 'Basics'] },
  { q: 'How do you link an external stylesheet?', opts: ['<style src="...">', '<link rel="stylesheet" href="...">', '<css href="...">', '<script src="...">'], a: 1, e: '<link rel="stylesheet" href="..."> attaches an external CSS file.', tags: ['CSS', 'Basics'] },
  { q: 'Inline styles are written using which attribute?', opts: ['class', 'style', 'css', 'id'], a: 1, e: 'The style attribute holds inline CSS, e.g. style="color: red".', tags: ['CSS', 'Basics'] },
  { q: 'How are CSS comments written?', opts: ['// ...', '/* ... */', '<!-- ... -->', '# ...'], a: 1, e: 'CSS comments use /* ... */.', tags: ['CSS', 'Basics'] },
  { q: 'What does "cascading" refer to?', opts: ['Animations', 'How conflicting rules are resolved (by origin, specificity, order)', 'File size', 'Inheritance only'], a: 1, e: 'The cascade decides which rule wins when several apply to the same element.', tags: ['CSS', 'Basics'] },

  // ── Level 2 — Selectors ────────────────────────────────────────────────
  { q: 'What does `.box` select?', opts: ['The <box> tag', 'Elements with id "box"', 'Elements with class "box"', 'Only the first box'], a: 2, e: 'A leading dot is a class selector: .box matches class="box".', tags: ['CSS', 'Selectors'] },
  { q: 'What does `#header` select?', opts: ['Class header', 'The element with id "header"', 'All headers', 'The <header> tag'], a: 1, e: 'A leading # is an id selector.', tags: ['CSS', 'Selectors'] },
  { q: 'What does the type selector `p` select?', opts: ['One paragraph', 'All <p> elements', 'Elements with class p', 'The parent'], a: 1, e: 'A bare element name selects every element of that type.', tags: ['CSS', 'Selectors'] },
  { q: 'What does `*` select?', opts: ['Nothing', 'All elements (the universal selector)', 'Only important ones', 'The root only'], a: 1, e: 'The universal selector * matches every element.', tags: ['CSS', 'Selectors'] },
  { q: 'To select by class, you prefix the name with:', opts: ['#', '.', '*', '@'], a: 1, e: 'Classes use a dot: .name.', tags: ['CSS', 'Selectors'] },
  { q: 'To select by id, you prefix the name with:', opts: ['.', '#', '*', ':'], a: 1, e: 'Ids use a hash: #name.', tags: ['CSS', 'Selectors'] },
  { q: 'What does `a[target]` select?', opts: ['All links', 'Links that have a target attribute', 'The target element', 'No links'], a: 1, e: 'An attribute selector matches elements that have (or match) the attribute.', tags: ['CSS', 'Selectors'] },
  { q: 'What does the comma in `h1, h2` mean?', opts: ['h2 inside h1', 'Select both h1 and h2 (grouping)', 'h1 then an h2 child', 'Neither'], a: 1, e: 'Commas group selectors so the rule applies to each.', tags: ['CSS', 'Selectors'] },

  // ── Level 3 — Combinators & Specificity ────────────────────────────────
  { q: 'What does `div p` (a space) select?', opts: ['p next to div', 'All <p> descendants of a <div>', 'div inside p', 'p with class div'], a: 1, e: 'A space is the descendant combinator: any <p> inside a <div>, at any depth.', tags: ['CSS', 'Specificity'] },
  { q: 'What does `div > p` select?', opts: ['All descendants', 'Only direct child <p> of <div>', 'Siblings', 'Nothing'], a: 1, e: '> is the child combinator: only immediate children.', tags: ['CSS', 'Specificity'] },
  { q: 'What does `h1 + p` select?', opts: ['All p after h1', 'The <p> immediately after an <h1>', 'p inside h1', 'h1 inside p'], a: 1, e: '+ is the adjacent-sibling combinator.', tags: ['CSS', 'Specificity'] },
  { q: 'Which selector is the most specific?', opts: ['A type selector', 'A class selector', 'An id selector', 'The universal selector'], a: 2, e: 'Ids beat classes, which beat type selectors, which beat *.', tags: ['CSS', 'Specificity'] },
  { q: 'Specificity from lowest to highest is:', opts: ['id < class < type', 'type < class < id < inline', 'class < type < id', 'all equal'], a: 1, e: 'Type < class/attr/pseudo-class < id < inline styles.', tags: ['CSS', 'Specificity'] },
  { q: 'What does `!important` do?', opts: ['Lowers priority', 'Forces the declaration to win over normal specificity', 'Is ignored', 'Is a comment'], a: 1, e: '!important overrides the cascade — use it sparingly as it’s hard to undo.', tags: ['CSS', 'Specificity'] },
  { q: 'How do `ul li` and `ul > li` differ?', opts: ['They’re identical', 'Descendant (any depth) vs direct child', 'Child vs sibling', 'Class vs id'], a: 1, e: 'ul li matches nested <li> too; ul > li matches only direct children.', tags: ['CSS', 'Specificity'] },
  { q: 'When two rules have equal specificity, which wins?', opts: ['The first one', 'The one declared later (source order)', 'A random one', 'The shorter one'], a: 1, e: 'With equal specificity, later rules override earlier ones.', tags: ['CSS', 'Specificity'] },

  // ── Level 4 — Colors & Units ───────────────────────────────────────────
  { q: 'What color is `#ff0000`?', opts: ['Green', 'Red', 'Blue', 'Black'], a: 1, e: '#ff0000 is full red, no green or blue.', tags: ['CSS', 'Units'] },
  { q: 'What color is `rgb(0, 0, 0)`?', opts: ['White', 'Black', 'Red', 'Transparent'], a: 1, e: 'All channels at 0 is black.', tags: ['CSS', 'Units'] },
  { q: 'What kind of unit is `px`?', opts: ['Relative to font', 'An absolute pixel unit', 'A percentage', 'Viewport-based'], a: 1, e: 'px is an absolute length (CSS pixels).', tags: ['CSS', 'Units'] },
  { q: '`em` is relative to:', opts: ['The viewport', 'The element’s (inherited) font-size', 'The root only', 'Pixels'], a: 1, e: '1em equals the current font-size of the element.', tags: ['CSS', 'Units'] },
  { q: '`rem` is relative to:', opts: ['The parent', 'The root element’s font-size', 'The viewport width', 'The element itself'], a: 1, e: 'rem is relative to the root (<html>) font-size, so it’s consistent.', tags: ['CSS', 'Units'] },
  { q: 'What does a `width: 50%` mean?', opts: ['50px', 'Half the viewport', '50% of the containing block’s width', '50% opacity'], a: 2, e: 'Percentage widths are relative to the containing block.', tags: ['CSS', 'Units'] },
  { q: 'What is `rgba(0, 0, 0, 0.5)`?', opts: ['Gray', 'Black at 50% opacity (alpha)', 'Transparent', 'Invalid'], a: 1, e: 'The 4th value is alpha; 0.5 is half-transparent black.', tags: ['CSS', 'Units'] },
  { q: 'What is the `vw` unit?', opts: ['Viewport height', '1% of the viewport width', 'Pixels', 'Parent width'], a: 1, e: '1vw equals 1% of the viewport’s width.', tags: ['CSS', 'Units'] },

  // ── Level 5 — Box Model ────────────────────────────────────────────────
  { q: 'What are the layers of the CSS box model?', opts: ['Margin and content only', 'Content, padding, border, margin', 'Content and border', 'Padding only'], a: 1, e: 'From inside out: content → padding → border → margin.', tags: ['CSS', 'Box Model'] },
  { q: 'What is `padding`?', opts: ['Space outside the border', 'Space inside the border, around the content', 'The border width', 'The content itself'], a: 1, e: 'Padding is the gap between the content and the border.', tags: ['CSS', 'Box Model'] },
  { q: 'What is `margin`?', opts: ['Inside space', 'Space outside the border, between elements', 'The content', 'The border'], a: 1, e: 'Margin is the space outside the border separating elements.', tags: ['CSS', 'Box Model'] },
  { q: 'Where does the `border` sit?', opts: ['Inside the content', 'Between the padding and the margin', 'Outside the margin', 'It replaces padding'], a: 1, e: 'The border wraps the padding and sits inside the margin.', tags: ['CSS', 'Box Model'] },
  { q: 'What does `box-sizing: border-box` make `width` include?', opts: ['Only content', 'Content + padding + border', 'Margin too', 'Nothing'], a: 1, e: 'With border-box, width includes padding and border, which is easier to reason about.', tags: ['CSS', 'Box Model'] },
  { q: 'What does `margin: 0 auto` do to a block with a set width?', opts: ['Removes it', 'Centers it horizontally', 'Aligns it left', 'Adds padding'], a: 1, e: 'auto left/right margins split the leftover space, centering the block.', tags: ['CSS', 'Box Model'] },
  { q: 'Vertical margins between stacked blocks can:', opts: ['Always add up', 'Collapse (merge into the larger one)', 'Only be negative', 'Never touch'], a: 1, e: 'Adjacent vertical margins collapse to the larger of the two.', tags: ['CSS', 'Box Model'] },
  { q: 'By default (`content-box`), `width` sets:', opts: ['The total box width', 'The content width only', 'Width + border', 'Width + margin'], a: 1, e: 'In the default content-box, padding and border add on top of width.', tags: ['CSS', 'Box Model'] },

  // ── Level 6 — Text & Fonts ─────────────────────────────────────────────
  { q: 'What does `font-size` set?', opts: ['Line height', 'The size of the text', 'The weight', 'The font family'], a: 1, e: 'font-size controls how large the text is.', tags: ['CSS', 'Text'] },
  { q: 'What does `font-weight: bold` do?', opts: ['Italicizes', 'Makes the text bold', 'Underlines', 'Shrinks it'], a: 1, e: 'It increases the weight (thickness) of the glyphs.', tags: ['CSS', 'Text'] },
  { q: 'What does `text-align: center` do?', opts: ['Centers the box', 'Centers inline content within its box', 'Justifies text', 'Indents text'], a: 1, e: 'text-align aligns inline content (like text) horizontally inside the element.', tags: ['CSS', 'Text'] },
  { q: 'What does `font-family` set?', opts: ['The size', 'The typeface, with fallbacks', 'The color', 'The spacing'], a: 1, e: 'font-family lists fonts in priority order, ending with a generic family.', tags: ['CSS', 'Text'] },
  { q: 'What does `line-height` control?', opts: ['Letter spacing', 'The height of each line of text (leading)', 'The font size', 'Margins'], a: 1, e: 'line-height sets the vertical space each line occupies.', tags: ['CSS', 'Text'] },
  { q: 'What does `text-decoration: underline` do?', opts: ['Bolds the text', 'Underlines the text', 'Removes styling', 'Colors it'], a: 1, e: 'It draws a line under the text.', tags: ['CSS', 'Text'] },
  { q: 'What does `text-transform: uppercase` do?', opts: ['Lowercases text', 'Renders the text in capitals', 'Capitalizes the first letter', 'Does nothing'], a: 1, e: 'It displays the text as uppercase without changing the source.', tags: ['CSS', 'Text'] },
  { q: 'How do you remove the underline from links?', opts: ['text-decoration: hidden', 'text-decoration: none', 'underline: off', 'border: none'], a: 1, e: 'text-decoration: none removes the default link underline.', tags: ['CSS', 'Text'] },

  // ── Level 7 — Backgrounds & Borders ────────────────────────────────────
  { q: 'What does `background-color: blue` style?', opts: ['The text', 'The element’s background', 'The border', 'The margin'], a: 1, e: 'It fills the element’s background area with blue.', tags: ['CSS', 'Backgrounds'] },
  { q: 'What does `border-radius: 50%` do to a square element?', opts: ['Rounds the corners slightly', 'Makes it a circle', 'Does nothing', 'Makes a triangle'], a: 1, e: 'On an equal-sided box, 50% radius produces a circle.', tags: ['CSS', 'Backgrounds'] },
  { q: 'What does `background-image: url(...)` set?', opts: ['A border image', 'A background image', 'A foreground image', 'An icon font'], a: 1, e: 'It places an image behind the element’s content.', tags: ['CSS', 'Backgrounds'] },
  { q: 'What does `box-shadow` add?', opts: ['A border', 'A drop shadow around the box', 'A gradient', 'An outline only'], a: 1, e: 'box-shadow paints a shadow offset from the element.', tags: ['CSS', 'Backgrounds'] },
  { q: 'What does `border: 1px solid black` set?', opts: ['Only the color', 'The width, style, and color of the border', 'Only the style', 'The padding'], a: 1, e: 'The shorthand sets border-width, border-style, and border-color.', tags: ['CSS', 'Backgrounds'] },
  { q: 'What does `background-size: cover` do?', opts: ['Stretches the image exactly', 'Scales it to cover the box, cropping if needed', 'Tiles it', 'Contains it without cropping'], a: 1, e: 'cover fills the whole box, possibly cropping the image.', tags: ['CSS', 'Backgrounds'] },
  { q: 'What does `opacity: 0.5` do?', opts: ['Hides the element', 'Makes the whole element 50% transparent', 'Blurs it', 'Recolors it'], a: 1, e: 'opacity sets the element’s overall transparency (including its content).', tags: ['CSS', 'Backgrounds'] },
  { q: 'What does `background: linear-gradient(...)` create?', opts: ['A solid color', 'A gradient background', 'A border', 'A shadow'], a: 1, e: 'linear-gradient produces a smooth color transition as a background image.', tags: ['CSS', 'Backgrounds'] },

  // ── Level 8 — Display & Visibility ─────────────────────────────────────
  { q: 'What does `display: none` do?', opts: ['Hides it but keeps its space', 'Removes it from the layout entirely (not rendered)', 'Makes it transparent', 'Disables it'], a: 1, e: 'display: none removes the element from the render tree and reclaims its space.', tags: ['CSS', 'Display'] },
  { q: 'What does `visibility: hidden` do?', opts: ['Removes it from layout', 'Hides it but keeps its space reserved', 'Deletes it', 'Grays it out'], a: 1, e: 'The element is invisible but still occupies its space.', tags: ['CSS', 'Display'] },
  { q: 'What is the default display of a `<div>`?', opts: ['inline', 'block', 'flex', 'none'], a: 1, e: '<div> is block-level by default.', tags: ['CSS', 'Display'] },
  { q: 'What is the default display of a `<span>`?', opts: ['block', 'inline', 'grid', 'none'], a: 1, e: '<span> is inline by default.', tags: ['CSS', 'Display'] },
  { q: 'What does `display: inline-block` do?', opts: ['Acts purely inline', 'Flows inline but accepts width/height', 'Is block-only', 'Hides the element'], a: 1, e: 'inline-block sits in the text flow yet respects width, height, and vertical padding.', tags: ['CSS', 'Display'] },
  { q: 'Block elements by default:', opts: ['Sit side by side', 'Take the full available width and stack vertically', 'Are hidden', 'Ignore width'], a: 1, e: 'Block boxes start on a new line and fill their container’s width.', tags: ['CSS', 'Display'] },
  { q: 'Inline elements mostly:', opts: ['Respect all sizing', 'Ignore width/height and vertical margins', 'Are block-level', 'Are flex items'], a: 1, e: 'Inline boxes ignore explicit width/height and top/bottom margins.', tags: ['CSS', 'Display'] },
  { q: 'How do `display: none` and `visibility: hidden` differ?', opts: ['They’re identical', 'none removes the space; hidden keeps it', 'Both keep the space', 'Both remove the space'], a: 1, e: 'display: none collapses the element; visibility: hidden leaves a gap.', tags: ['CSS', 'Display'] },

  // ── Level 9 — Positioning ──────────────────────────────────────────────
  { q: 'What is the default `position` value?', opts: ['relative', 'static', 'absolute', 'fixed'], a: 1, e: 'Elements are position: static by default (normal flow).', tags: ['CSS', 'Positioning'] },
  { q: 'What does `position: relative` do?', opts: ['Removes it from flow', 'Offsets it from its normal spot while keeping its space', 'Pins it to the viewport', 'Centers it'], a: 1, e: 'relative shifts the element via top/left but leaves its original space.', tags: ['CSS', 'Positioning'] },
  { q: 'What does `position: absolute` position relative to?', opts: ['Itself', 'The nearest positioned ancestor', 'The viewport always', 'Nothing (static)'], a: 1, e: 'absolute elements are placed relative to their nearest non-static ancestor.', tags: ['CSS', 'Positioning'] },
  { q: 'What does `position: fixed` do?', opts: ['Scrolls normally', 'Stays fixed relative to the viewport while scrolling', 'Is relative to the parent', 'Is the same as absolute'], a: 1, e: 'fixed pins the element to the viewport, so it stays put on scroll.', tags: ['CSS', 'Positioning'] },
  { q: 'What does `position: sticky` do?', opts: ['Is always fixed', 'Acts relative until a scroll threshold, then sticks', 'Is always static', 'Hides the element'], a: 1, e: 'sticky toggles between relative and fixed based on scroll position.', tags: ['CSS', 'Positioning'] },
  { q: 'What does `z-index` control?', opts: ['Horizontal order', 'The front-to-back stacking order', 'Zoom level', 'Opacity'], a: 1, e: 'Higher z-index stacks an element in front of lower ones.', tags: ['CSS', 'Positioning'] },
  { q: 'When do `top`, `left`, etc. take effect?', opts: ['Always', 'Only when the element is positioned (not static)', 'Only when static', 'Only in flexbox'], a: 1, e: 'Offset properties apply to relative/absolute/fixed/sticky elements.', tags: ['CSS', 'Positioning'] },
  { q: '`z-index` applies to:', opts: ['All elements', 'Positioned (and flex/grid) elements, not static ones by default', 'Only the body', 'Only images'], a: 1, e: 'By default z-index needs a positioned element (or a flex/grid item) to apply.', tags: ['CSS', 'Positioning'] },

  // ── Level 10 — Flexbox ─────────────────────────────────────────────────
  { q: 'What does `display: flex` do to the children?', opts: ['Stacks them as blocks', 'Makes them flex items laid out in a row', 'Creates a grid', 'Hides them'], a: 1, e: 'A flex container arranges its children along a main axis (row by default).', tags: ['CSS', 'Flexbox'] },
  { q: 'What does `justify-content` align along?', opts: ['The cross axis', 'The main axis', 'Both axes', 'Neither'], a: 1, e: 'justify-content distributes items along the main axis.', tags: ['CSS', 'Flexbox'] },
  { q: 'What does `align-items` align along?', opts: ['The main axis', 'The cross axis', 'The baseline only', 'Neither'], a: 1, e: 'align-items positions items along the cross axis.', tags: ['CSS', 'Flexbox'] },
  { q: 'What does `flex-direction: column` do?', opts: ['Lays items in a row', 'Stacks items vertically', 'Reverses the row', 'Wraps items'], a: 1, e: 'It makes the main axis vertical, stacking items top to bottom.', tags: ['CSS', 'Flexbox'] },
  { q: 'What does `justify-content: center` do?', opts: ['Left-aligns items', 'Centers items along the main axis', 'Spreads them apart', 'Top-aligns them'], a: 1, e: 'It centers the items as a group on the main axis.', tags: ['CSS', 'Flexbox'] },
  { q: 'What does `flex: 1` on items do?', opts: ['Fixes their size', 'Lets them grow to share the space equally', 'Hides them', 'Centers them'], a: 1, e: 'flex: 1 makes items grow equally to fill available space.', tags: ['CSS', 'Flexbox'] },
  { q: 'What does `flex-wrap: wrap` allow?', opts: ['Forces one line', 'Items to wrap onto multiple lines', 'Reversing', 'Centering'], a: 1, e: 'With wrap, items flow onto new lines when they run out of room.', tags: ['CSS', 'Flexbox'] },
  { q: 'What does `gap` do in flexbox?', opts: ['Sets padding', 'Sets spacing between items', 'Sets outer margin', 'Sets the border'], a: 1, e: 'gap adds consistent spacing between flex items.', tags: ['CSS', 'Flexbox'] },

  // ── Level 11 — Grid ────────────────────────────────────────────────────
  { q: 'What does `display: grid` create?', opts: ['A 1D row', 'A two-dimensional grid container', 'A flex row', 'A block'], a: 1, e: 'Grid lays children out in rows and columns simultaneously.', tags: ['CSS', 'Grid'] },
  { q: 'What does `grid-template-columns: 1fr 1fr` create?', opts: ['Two rows', 'Two equal-width columns', 'One column', 'A gap'], a: 1, e: 'Two 1fr tracks split the space into two equal columns.', tags: ['CSS', 'Grid'] },
  { q: 'What is the `fr` unit in grid?', opts: ['Fixed pixels', 'A fraction of the available space', 'A font ratio', 'A frame'], a: 1, e: 'fr distributes leftover space proportionally among tracks.', tags: ['CSS', 'Grid'] },
  { q: 'What does `gap: 16px` do in a grid?', opts: ['Adds outer margin', 'Adds 16px spacing between rows and columns', 'Adds padding', 'Adds a border'], a: 1, e: 'gap sets the gutters between grid tracks.', tags: ['CSS', 'Grid'] },
  { q: 'What does `grid-template-columns: repeat(3, 1fr)` produce?', opts: ['Three rows', 'Three equal-width columns', '3px columns', 'One column repeated as text'], a: 1, e: 'repeat(3, 1fr) is shorthand for three equal columns.', tags: ['CSS', 'Grid'] },
  { q: 'What does `grid-column: 1 / 3` do to an item?', opts: ['Limits it to column 1', 'Spans it from grid line 1 to 3 (two columns)', 'Creates 3 columns', 'Spans rows 1–3'], a: 1, e: 'It places the item across the tracks between column lines 1 and 3.', tags: ['CSS', 'Grid'] },
  { q: 'Grid is best suited for:', opts: ['One-dimensional layouts only', 'Two-dimensional layouts (rows and columns)', 'Text only', 'Nothing'], a: 1, e: 'Grid shines for 2D layouts; flexbox is ideal for 1D rows or columns.', tags: ['CSS', 'Grid'] },
  { q: 'What does `grid-template-areas` let you do?', opts: ['Set colors', 'Name regions to place items by name', 'Add gaps', 'Repeat columns'], a: 1, e: 'You name areas and assign items to them with grid-area.', tags: ['CSS', 'Grid'] },

  // ── Level 12 — Pseudo-classes & elements ───────────────────────────────
  { q: 'When does `:hover` apply?', opts: ['On click', 'When the pointer is over the element', 'On page load', 'Always'], a: 1, e: ':hover styles an element while the cursor is over it.', tags: ['CSS', 'Pseudo'] },
  { q: 'What does `:first-child` select?', opts: ['The first letter', 'An element that is the first child of its parent', 'The parent', 'The last child'], a: 1, e: ':first-child matches an element when it’s the first among its siblings.', tags: ['CSS', 'Pseudo'] },
  { q: 'What does `::before` do?', opts: ['Selects the element before', 'Inserts generated content at the start of the element', 'Selects the element after', 'Selects a sibling'], a: 1, e: '::before creates a pseudo-element at the beginning of the element’s content.', tags: ['CSS', 'Pseudo'] },
  { q: 'What does `:nth-child(2)` select?', opts: ['Every child', 'The 2nd child', 'The 2nd of its type only', 'Two children'], a: 1, e: ':nth-child(2) matches the element that is the second child.', tags: ['CSS', 'Pseudo'] },
  { q: 'Which property must be set for `::after` to show content?', opts: ['display', 'content', 'position', 'visibility'], a: 1, e: 'Pseudo-elements need a content property (even content: "") to render.', tags: ['CSS', 'Pseudo'] },
  { q: 'When does `:focus` apply?', opts: ['On hover', 'When the element has focus (e.g. via keyboard or click)', 'When disabled', 'Always'], a: 1, e: ':focus styles the currently focused element, like an active input.', tags: ['CSS', 'Pseudo'] },
  { q: 'What does `a:visited` target?', opts: ['All links', 'Links the user has already visited', 'Active links', 'Hovered links'], a: 1, e: ':visited matches links to pages already in the browser history.', tags: ['CSS', 'Pseudo'] },
  { q: 'What does `:nth-child(odd)` select?', opts: ['Even children', 'Odd-positioned children (1st, 3rd, …)', 'Only the first', 'None'], a: 1, e: 'odd matches every other child starting from the first.', tags: ['CSS', 'Pseudo'] },

  // ── Level 13 — Transitions & Transforms ────────────────────────────────
  { q: 'What does `transition: all 0.3s` do?', opts: ['Delays page load', 'Smoothly animates property changes over 0.3s', 'Hides the element', 'Repeats forever'], a: 1, e: 'transition interpolates changing properties over the given duration.', tags: ['CSS', 'Transitions'] },
  { q: 'What does `transform: rotate(45deg)` do?', opts: ['Moves the element', 'Rotates it 45 degrees', 'Scales it', 'Skews only'], a: 1, e: 'rotate spins the element around its origin.', tags: ['CSS', 'Transitions'] },
  { q: 'What does `transform: translateX(20px)` do?', opts: ['Rotates it', 'Moves it 20px horizontally', 'Scales it', 'Skews it'], a: 1, e: 'translateX shifts the element along the x-axis.', tags: ['CSS', 'Transitions'] },
  { q: 'What does `transform: scale(2)` do?', opts: ['Halves the size', 'Doubles the element’s size', 'Rotates it', 'Moves it'], a: 1, e: 'scale(2) makes the element twice as large.', tags: ['CSS', 'Transitions'] },
  { q: 'For a transition to animate, you need:', opts: ['Nothing', 'A triggering change of value (e.g. on :hover)', 'JavaScript always', 'A keyframe'], a: 1, e: 'Transitions animate when a property’s value changes (often via a state like :hover).', tags: ['CSS', 'Transitions'] },
  { q: 'What does `transition-duration` set?', opts: ['The delay', 'How long the transition takes', 'The property', 'The easing'], a: 1, e: 'It defines the length of the transition.', tags: ['CSS', 'Transitions'] },
  { q: 'A `transform` generally:', opts: ['Reflows the whole page', 'Is visual and does not reflow surrounding elements', 'Deletes the element', 'Equals margin'], a: 1, e: 'Transforms move/scale visually without affecting layout of others — good for performance.', tags: ['CSS', 'Transitions'] },
  { q: 'What does `transition-timing-function: ease-in-out` control?', opts: ['The color', 'The acceleration curve (easing)', 'The delay only', 'The duration'], a: 1, e: 'The timing function shapes how speed changes over the transition.', tags: ['CSS', 'Transitions'] },

  // ── Level 14 — Responsive & Media Queries ──────────────────────────────
  { q: 'When does `@media (max-width: 600px) { … }` apply?', opts: ['Always', 'When the viewport is 600px wide or less', 'When it’s 600px or more', 'Only when printing'], a: 1, e: 'max-width targets viewports up to that width.', tags: ['CSS', 'Responsive'] },
  { q: 'Why is the viewport meta tag needed?', opts: ['For desktop only', 'For correct responsive scaling on mobile', 'For SEO', 'For fonts'], a: 1, e: 'Without it, mobile browsers assume a wide layout and shrink the page.', tags: ['CSS', 'Responsive'] },
  { q: 'Relative units (%, em, rem, vw) help by:', opts: ['Fixing sizes', 'Letting layouts adapt to screen size', 'Disabling scaling', 'Centering text'], a: 1, e: 'Relative units scale with context, aiding responsive design.', tags: ['CSS', 'Responsive'] },
  { q: 'What does "mobile-first" CSS mean?', opts: ['Desktop styles first', 'Base styles for small screens, enhanced upward with media queries', 'No media queries', 'Fixed widths'], a: 1, e: 'You write the small-screen baseline, then add min-width queries for larger screens.', tags: ['CSS', 'Responsive'] },
  { q: 'When does `@media (min-width: 768px)` apply?', opts: ['Below 768px', 'At 768px and wider', 'Exactly 768px', 'Only in print'], a: 1, e: 'min-width targets viewports from that width up.', tags: ['CSS', 'Responsive'] },
  { q: 'A flexible image rule is:', opts: ['width: 9999px', 'max-width: 100%', 'position: fixed', 'display: none'], a: 1, e: 'max-width: 100% keeps an image from overflowing its container.', tags: ['CSS', 'Responsive'] },
  { q: 'Media queries can target:', opts: ['Only width', 'Various features: size, orientation, print, and more', 'Only color', 'Only fonts'], a: 1, e: 'You can query width, height, orientation, resolution, print, prefers-color-scheme, etc.', tags: ['CSS', 'Responsive'] },
  { q: 'When do `@media print` styles apply?', opts: ['On mobile', 'When the page is printed', 'On hover', 'On load'], a: 1, e: 'The print media type styles the printed version of the page.', tags: ['CSS', 'Responsive'] },

  // ── Level 15 — Advanced / Mixed ────────────────────────────────────────
  { q: 'How do you declare and use a CSS custom property (variable)?', opts: ['$main: #333; $main', '--main: #333; then var(--main)', '@main: #333; @main', '#main: #333; #main'], a: 1, e: 'Custom properties are declared as --name and read with var(--name).', tags: ['CSS', 'Mastery'] },
  { q: 'What is `@keyframes` used for?', opts: ['Media queries', 'Defining the steps of an animation', 'Declaring variables', 'Importing files'], a: 1, e: '@keyframes describes the states an animation moves through.', tags: ['CSS', 'Mastery'] },
  { q: 'What does `animation: spin 2s linear infinite` do?', opts: ['Runs spin once', 'Runs the `spin` keyframes repeatedly forever', 'Never runs', 'Runs only on hover'], a: 1, e: 'infinite makes the named animation loop continuously.', tags: ['CSS', 'Mastery'] },
  { q: 'Inherited properties (like `color`):', opts: ['Never inherit', 'Pass from parent to children by default', 'Only inherit on hover', 'Always reset'], a: 1, e: 'Some properties (color, font, …) inherit to descendants unless overridden.', tags: ['CSS', 'Mastery'] },
  { q: 'How do `display: flex` and `display: grid` differ?', opts: ['Both are 2D', 'Flex is one-dimensional; grid is two-dimensional', 'Both are 1D', 'Flex is 2D, grid is 1D'], a: 1, e: 'Flex lays out along one axis; grid handles rows and columns together.', tags: ['CSS', 'Mastery'] },
  { q: 'To make one rule override another, you can:', opts: ['Only use !important', 'Increase its specificity or use !important (sparingly)', 'Rename files', 'Use inline styles only'], a: 1, e: 'Raise specificity (or, as a last resort, use !important) to win the cascade.', tags: ['CSS', 'Mastery'] },
  { q: 'What does `var(--gap, 8px)` do?', opts: ['Always uses 8px', 'Uses --gap, falling back to 8px if it’s not set', 'Throws an error', 'Only uses --gap'], a: 1, e: 'The second argument to var() is a fallback value.', tags: ['CSS', 'Mastery'] },
  { q: 'What does `position: sticky` commonly need to work?', opts: ['Nothing', 'An offset such as top: 0', 'display: flex', 'Only a z-index'], a: 1, e: 'Sticky needs a threshold (e.g. top) that tells it when to stick.', tags: ['CSS', 'Mastery'] },
];
