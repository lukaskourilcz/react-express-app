// HTML roadmap questions (120): 15 levels × 8, easiest → hardest. Authored as a
// single 8-per-level list and built directly. See lib/roadmap.ts for titles.

import type { Seed } from './roadmap-build';

export const htmlSeeds: Seed[] = [
  // ── Level 1 — HTML Basics ──────────────────────────────────────────────
  { q: 'What does HTML stand for?', opts: ['HyperText Markup Language', 'Hyperlink Text Mode Language', 'High-level Text Markup', 'Home Tool Markup Language'], a: 0, e: 'HTML is HyperText Markup Language — the markup that structures web pages.', tags: ['HTML', 'Basics'] },
  { q: 'What is HTML used for?', opts: ['Styling pages', 'Structuring the content of web pages', 'Adding interactivity', 'Querying databases'], a: 1, e: 'HTML defines the structure and meaning of content; CSS styles it and JavaScript adds behavior.', tags: ['HTML', 'Basics'] },
  { q: 'How is a typical HTML element written?', opts: ['{tag}', '<tag>content</tag>', '[tag]', 'tag()'], a: 1, e: 'Most elements have an opening tag, content, and a closing tag: <tag>content</tag>.', tags: ['HTML', 'Basics'] },
  { q: 'Which is a valid HTML comment?', opts: ['// comment', '/* comment */', '<!-- comment -->', '# comment'], a: 2, e: 'HTML comments are written as <!-- ... --> and are not rendered.', tags: ['HTML', 'Basics'] },
  { q: 'What extension do HTML files usually have?', opts: ['.htm5', '.html', '.web', '.page'], a: 1, e: 'HTML files use the .html (or .htm) extension.', tags: ['HTML', 'Basics'] },
  { q: 'Tags with no content or closing tag (like `<br>`) are called:', opts: ['Block elements', 'Void (empty) elements', 'Inline scripts', 'Comments'], a: 1, e: 'Void elements such as <br>, <img>, and <input> have no closing tag.', tags: ['HTML', 'Basics'] },
  { q: 'What reads HTML and displays the page?', opts: ['A compiler', 'A web browser (rendering engine)', 'A database', 'A server only'], a: 1, e: 'The browser’s rendering engine parses HTML and paints the page.', tags: ['HTML', 'Basics'] },
  { q: 'HTML primarily describes a page’s:', opts: ['Exact pixels', 'Structure and meaning, not exact appearance', 'Server logic', 'Database schema'], a: 1, e: 'HTML conveys structure and semantics; appearance is the job of CSS.', tags: ['HTML', 'Basics'] },

  // ── Level 2 — Document Structure ───────────────────────────────────────
  { q: 'What does `<!DOCTYPE html>` declare?', opts: ['A comment', 'That the document is HTML5', 'The page title', 'A script'], a: 1, e: 'The doctype tells the browser to use standards mode for HTML5.', tags: ['HTML', 'Structure'] },
  { q: 'What is the root element of an HTML page?', opts: ['<body>', '<head>', '<html>', '<root>'], a: 2, e: 'Everything lives inside the <html> root element.', tags: ['HTML', 'Structure'] },
  { q: 'What goes in `<head>`?', opts: ['The visible content', 'Metadata about the page (not visible content)', 'The footer', 'Scripts only'], a: 1, e: 'The head holds metadata: title, charset, links to CSS, meta tags, etc.', tags: ['HTML', 'Structure'] },
  { q: 'What goes in `<body>`?', opts: ['Metadata', 'The visible content of the page', 'The doctype', 'Styles only'], a: 1, e: 'The body contains everything shown to the user.', tags: ['HTML', 'Structure'] },
  { q: 'What does `<title>` set?', opts: ['A heading on the page', 'The text shown in the browser tab/title bar', 'A paragraph', 'A link'], a: 1, e: 'The title appears in the browser tab and bookmarks, not on the page itself.', tags: ['HTML', 'Structure'] },
  { q: 'Which nesting is correct?', opts: ['<body> contains <html>', '<head> contains <body>', '<html> contains <head> and <body>', '<title> contains <html>'], a: 2, e: 'The <html> element contains both <head> and <body>.', tags: ['HTML', 'Structure'] },
  { q: 'What does `<meta charset="UTF-8">` set?', opts: ['The language', 'The character encoding', 'The title', 'The author'], a: 1, e: 'It declares the document’s character encoding so text renders correctly.', tags: ['HTML', 'Structure'] },
  { q: 'Where does `<title>` belong?', opts: ['Inside <body>', 'Inside <head>', 'Before <!DOCTYPE>', 'Inside <footer>'], a: 1, e: 'The <title> element is placed inside <head>.', tags: ['HTML', 'Structure'] },

  // ── Level 3 — Text Elements ────────────────────────────────────────────
  { q: 'What are `<h1>`–`<h6>`?', opts: ['Horizontal rules', 'Headings, from most to least important', 'Highlights', 'Links'], a: 1, e: '<h1> is the top-level heading and <h6> the lowest; they convey document hierarchy.', tags: ['HTML', 'Text'] },
  { q: 'What does `<p>` define?', opts: ['A page', 'A paragraph', 'A panel', 'A placeholder'], a: 1, e: '<p> marks a paragraph of text.', tags: ['HTML', 'Text'] },
  { q: 'What does `<br>` do?', opts: ['A bold run', 'A line break', 'A border', 'A bullet'], a: 1, e: '<br> inserts a single line break within text.', tags: ['HTML', 'Text'] },
  { q: 'What does `<strong>` convey?', opts: ['Italic emphasis', 'Strong importance (typically bold)', 'Strikethrough', 'Small text'], a: 1, e: '<strong> marks content as strongly important; browsers usually render it bold.', tags: ['HTML', 'Text'] },
  { q: 'What does `<em>` convey?', opts: ['Bold', 'Emphasis (typically italic)', 'Underline', 'Code'], a: 1, e: '<em> stresses emphasis; browsers usually render it italic.', tags: ['HTML', 'Text'] },
  { q: 'What does `<hr>` represent?', opts: ['A header', 'A thematic break (horizontal rule)', 'A hyperlink', 'A table row'], a: 1, e: '<hr> denotes a thematic break between sections.', tags: ['HTML', 'Text'] },
  { q: 'How many `<h1>` headings should a page typically have?', opts: ['As many as possible', 'One main <h1>', 'Exactly six', 'Zero'], a: 1, e: 'Using a single main <h1> gives a clear document outline.', tags: ['HTML', 'Text'] },
  { q: 'What is `<blockquote>` for?', opts: ['Code', 'A quoted (block-level) section of content', 'A button', 'A list'], a: 1, e: '<blockquote> marks a longer, block-level quotation.', tags: ['HTML', 'Text'] },

  // ── Level 4 — Links & Images ───────────────────────────────────────────
  { q: 'What does `<a href="...">` create?', opts: ['An image', 'A hyperlink', 'A heading', 'A button'], a: 1, e: 'The anchor element creates a hyperlink to the URL in its href.', tags: ['HTML', 'Links'] },
  { q: 'Which attribute sets a link’s destination?', opts: ['src', 'link', 'href', 'to'], a: 2, e: 'href (hypertext reference) holds the link’s target URL.', tags: ['HTML', 'Links'] },
  { q: 'Which attribute on `<img>` points to the image file?', opts: ['href', 'src', 'alt', 'file'], a: 1, e: 'The src attribute specifies the image source URL.', tags: ['HTML', 'Images'] },
  { q: 'What does the `alt` attribute on `<img>` provide?', opts: ['A tooltip only', 'Alternative text for accessibility and when the image fails', 'The image title', 'A caption element'], a: 1, e: 'alt text is read by screen readers and shown if the image can’t load.', tags: ['HTML', 'Images'] },
  { q: 'What does `target="_blank"` do on a link?', opts: ['Opens it in the same tab', 'Opens it in a new tab/window', 'Downloads it', 'Opens it in an iframe'], a: 1, e: 'target="_blank" opens the link in a new browsing context.', tags: ['HTML', 'Links'] },
  { q: 'How do you link to a section on the same page?', opts: ['href="id"', 'href="#id"', 'href="@id"', 'src="#id"'], a: 1, e: 'A fragment link href="#id" jumps to the element with that id.', tags: ['HTML', 'Links'] },
  { q: '`<img>` is a:', opts: ['Block element with a closing tag', 'Void element (no closing tag)', 'Inline script', 'Container element'], a: 1, e: '<img> is a void element written as <img src="..." alt="...">.', tags: ['HTML', 'Images'] },
  { q: 'For a purely decorative image, good alt text is:', opts: ['A long description', 'Empty (alt="")', '"image"', 'The file name'], a: 1, e: 'alt="" tells assistive tech to skip a decorative image.', tags: ['HTML', 'Images'] },

  // ── Level 5 — Lists ────────────────────────────────────────────────────
  { q: 'What is `<ul>`?', opts: ['An ordered list', 'An unordered (bulleted) list', 'A table', 'A link list'], a: 1, e: '<ul> is an unordered list, rendered with bullets by default.', tags: ['HTML', 'Lists'] },
  { q: 'What is `<ol>`?', opts: ['Unordered', 'An ordered (numbered) list', 'An outline only', 'An optional list'], a: 1, e: '<ol> is an ordered list, numbered by default.', tags: ['HTML', 'Lists'] },
  { q: 'Which tag is a list item?', opts: ['<item>', '<li>', '<list>', '<l>'], a: 1, e: '<li> holds each item inside <ul> or <ol>.', tags: ['HTML', 'Lists'] },
  { q: 'What does `<ol start="3">` do?', opts: ['Creates 3 items', 'Starts the numbering at 3', 'Indents 3 times', 'Reverses the list'], a: 1, e: 'The start attribute sets the first number of an ordered list.', tags: ['HTML', 'Lists'] },
  { q: 'A description list uses:', opts: ['<ul>', '<dl> with <dt> and <dd>', '<table>', '<ol>'], a: 1, e: '<dl> pairs terms (<dt>) with descriptions (<dd>).', tags: ['HTML', 'Lists'] },
  { q: 'Can lists be nested?', opts: ['No', 'Yes — a list can go inside an <li>', 'Only two levels', 'Only with tables'], a: 1, e: 'You nest a <ul>/<ol> inside an <li> to make sub-lists.', tags: ['HTML', 'Lists'] },
  { q: 'What does `<ol type="A">` do?', opts: ['Numbers normally', 'Numbers with uppercase letters (A, B, C…)', 'Uses roman numerals only', 'Uses bullets'], a: 1, e: 'The type attribute changes the marker; "A" uses uppercase letters.', tags: ['HTML', 'Lists'] },
  { q: 'Which is the correct list structure?', opts: ['<ul><p>…</p></ul>', '<ul><li>…</li></ul>', 'Only <li><ul>…</ul></li>', '<list><li>…'], a: 1, e: 'List items (<li>) must be direct children of <ul> or <ol>.', tags: ['HTML', 'Lists'] },

  // ── Level 6 — Attributes ───────────────────────────────────────────────
  { q: 'What is the `class` attribute used for?', opts: ['Uniquely identifying one element', 'Grouping elements (a reusable hook for CSS/JS)', 'Setting the text', 'Linking a page'], a: 1, e: 'Many elements can share a class, making it a reusable styling/scripting hook.', tags: ['HTML', 'Attributes'] },
  { q: 'The `id` attribute should be:', opts: ['Repeated freely', 'Unique within the page', 'Only on <div>s', 'Numeric'], a: 1, e: 'An id must be unique per document so it identifies a single element.', tags: ['HTML', 'Attributes'] },
  { q: 'How are attributes written?', opts: ['name:value', 'name="value" inside the opening tag', '{name=value}', 'name=value;'], a: 1, e: 'Attributes appear in the opening tag as name="value" pairs.', tags: ['HTML', 'Attributes'] },
  { q: 'A boolean attribute like `disabled`:', opts: ['Needs ="true"', 'Is true simply by being present', 'Must equal 1', 'Is ignored'], a: 1, e: 'Its presence means true; you don’t need a value (e.g. <input disabled>).', tags: ['HTML', 'Attributes'] },
  { q: 'Global attributes (id, class, title, style):', opts: ['Work only on <body>', 'Can be used on most elements', 'Work only on forms', 'Are inline-only'], a: 1, e: 'Global attributes are allowed on virtually any element.', tags: ['HTML', 'Attributes'] },
  { q: 'What does the `title` attribute usually do?', opts: ['Sets the tab title', 'Shows a tooltip on hover', 'Adds a heading', 'Provides alt text'], a: 1, e: 'The title attribute commonly surfaces as a hover tooltip.', tags: ['HTML', 'Attributes'] },
  { q: 'Custom data attributes look like:', opts: ['custom-*', 'data-*', 'x-*', 'attr-*'], a: 1, e: 'data-* attributes store custom data, e.g. data-id, accessible via dataset.', tags: ['HTML', 'Attributes'] },
  { q: 'Multiple classes on one element are separated by:', opts: ['Commas', 'Spaces', 'Semicolons', 'Pipes'], a: 1, e: 'class="a b c" applies three classes, separated by spaces.', tags: ['HTML', 'Attributes'] },

  // ── Level 7 — Forms: Inputs ────────────────────────────────────────────
  { q: 'What is `<form>` used for?', opts: ['Styling inputs', 'Collecting and submitting user input', 'Creating a table', 'Embedding video'], a: 1, e: 'A form groups controls and submits their data to a server or handler.', tags: ['HTML', 'Forms'] },
  { q: 'What is `<input type="text">`?', opts: ['A checkbox', 'A single-line text field', 'A button', 'A dropdown'], a: 1, e: 'It renders a one-line text box.', tags: ['HTML', 'Forms'] },
  { q: 'What is `<input type="checkbox">`?', opts: ['A single choice from many', 'A checkable on/off toggle', 'A text field', 'A slider'], a: 1, e: 'A checkbox can be independently checked or unchecked.', tags: ['HTML', 'Forms'] },
  { q: 'Which attribute becomes the field’s key when the form submits?', opts: ['id', 'name', 'value', 'type'], a: 1, e: 'The name attribute is sent paired with the value on submit.', tags: ['HTML', 'Forms'] },
  { q: 'What does `<input type="email">` do?', opts: ['Accepts anything', 'Expects (and validates) an email format', 'Is a number field', 'Is a date field'], a: 1, e: 'type="email" provides built-in validation for email-shaped input.', tags: ['HTML', 'Forms'] },
  { q: 'What does `<input type="password">` do?', opts: ['Shows the text', 'Masks the typed characters', 'Is read-only', 'Picks a file'], a: 1, e: 'A password field hides the characters as they’re typed.', tags: ['HTML', 'Forms'] },
  { q: 'What does the `required` attribute do?', opts: ['Makes it optional', 'Blocks submission until the field is filled', 'Disables it', 'Hides it'], a: 1, e: 'required prevents form submission while the field is empty.', tags: ['HTML', 'Forms'] },
  { q: 'What does `placeholder` provide?', opts: ['The submitted value', 'Hint text shown while the field is empty', 'A label', 'A default value'], a: 1, e: 'placeholder shows guidance text that disappears once you type.', tags: ['HTML', 'Forms'] },

  // ── Level 8 — Forms: Controls ──────────────────────────────────────────
  { q: 'What is `<label>` for?', opts: ['Submitting the form', 'Captioning a form control (and improving accessibility)', 'Validating input', 'Styling text'], a: 1, e: 'A label describes a control and, when associated, makes it easier to click and read by screen readers.', tags: ['HTML', 'Forms'] },
  { q: 'How do you associate a `<label>` with an input?', opts: ['name', 'The label’s `for` matches the input’s `id`', 'class', 'label-id'], a: 1, e: '<label for="email"> ties to <input id="email">.', tags: ['HTML', 'Forms'] },
  { q: 'What does `<select>` create?', opts: ['A text area', 'A dropdown of <option> choices', 'A checkbox', 'A button'], a: 1, e: '<select> shows a dropdown; each choice is an <option>.', tags: ['HTML', 'Forms'] },
  { q: 'What is `<textarea>`?', opts: ['A single-line field', 'A multi-line text input', 'A label', 'A select'], a: 1, e: '<textarea> accepts multiple lines of text.', tags: ['HTML', 'Forms'] },
  { q: 'What does `<button type="submit">` do?', opts: ['Resets the form', 'Submits the form', 'Does nothing', 'Clears it'], a: 1, e: 'A submit button sends the form data.', tags: ['HTML', 'Forms'] },
  { q: 'What is `<button type="button">`?', opts: ['A submit button', 'A plain button with no default form action', 'A reset button', 'A disabled button'], a: 1, e: 'type="button" creates a button that doesn’t submit; you wire up behavior yourself.', tags: ['HTML', 'Forms'] },
  { q: 'What do `<fieldset>` and `<legend>` do?', opts: ['Hide controls', 'Group related controls with a caption', 'Submit the form', 'Style the form'], a: 1, e: '<fieldset> groups controls and <legend> gives the group a caption.', tags: ['HTML', 'Forms'] },
  { q: 'Radio buttons in the same group share the same:', opts: ['id', 'name', 'value', 'type only'], a: 1, e: 'Sharing a name makes radios mutually exclusive (only one selected).', tags: ['HTML', 'Forms'] },

  // ── Level 9 — Tables ───────────────────────────────────────────────────
  { q: 'What does `<table>` define?', opts: ['A list', 'A grid of tabular data', 'A form', 'A layout column'], a: 1, e: '<table> presents data in rows and columns.', tags: ['HTML', 'Tables'] },
  { q: 'Which tag is a table row?', opts: ['<td>', '<tr>', '<row>', '<th>'], a: 1, e: '<tr> (table row) contains the cells of one row.', tags: ['HTML', 'Tables'] },
  { q: 'Which tag is a standard data cell?', opts: ['<tr>', '<td>', '<th>', '<cell>'], a: 1, e: '<td> holds a regular data cell.', tags: ['HTML', 'Tables'] },
  { q: 'Which tag is a header cell?', opts: ['<td>', '<th>', '<header>', '<thead>'], a: 1, e: '<th> is a header cell, bold and centered by default.', tags: ['HTML', 'Tables'] },
  { q: 'What do `<thead>`, `<tbody>`, and `<tfoot>` do?', opts: ['Style cells', 'Group the header, body, and footer rows', 'Merge cells', 'Sort rows'], a: 1, e: 'They organize a table into logical row groups.', tags: ['HTML', 'Tables'] },
  { q: 'What does `colspan="2"` on a cell do?', opts: ['Spans 2 rows', 'Spans the cell across 2 columns', 'Creates 2 tables', 'Adds 2 cells of text'], a: 1, e: 'colspan merges a cell horizontally across the given number of columns.', tags: ['HTML', 'Tables'] },
  { q: 'What does `<caption>` do in a table?', opts: ['Adds a footer', 'Gives the table a title/caption', 'Adds a header cell', 'Adds a row'], a: 1, e: '<caption> labels the whole table.', tags: ['HTML', 'Tables'] },
  { q: 'Tables should be used for:', opts: ['Page layout', 'Tabular data', 'Navigation', 'Forms'], a: 1, e: 'Use tables for genuine tabular data, not for laying out pages (use CSS for that).', tags: ['HTML', 'Tables'] },

  // ── Level 10 — Semantic HTML ───────────────────────────────────────────
  { q: 'What does "semantic HTML" mean?', opts: ['Tags with inline styles', 'Tags that describe their meaning/role (e.g. <nav>)', 'Only <div> and <span>', 'Deprecated tags'], a: 1, e: 'Semantic elements convey what their content is, aiding accessibility and SEO.', tags: ['HTML', 'Semantics'] },
  { q: 'What does `<header>` represent?', opts: ['The <head> element', 'Introductory/banner content for a page or section', 'A heading only', 'The footer'], a: 1, e: '<header> holds introductory content like a logo, title, or nav.', tags: ['HTML', 'Semantics'] },
  { q: 'What is `<nav>` for?', opts: ['The main content', 'A block of navigation links', 'A footer', 'A form'], a: 1, e: '<nav> wraps major navigation link groups.', tags: ['HTML', 'Semantics'] },
  { q: 'How often should `<main>` appear?', opts: ['Many times', 'Once per page, for the dominant content', 'Inside <nav>', 'In the <head>'], a: 1, e: 'There should be a single, unique <main> with the page’s primary content.', tags: ['HTML', 'Semantics'] },
  { q: 'What is `<article>`?', opts: ['A sidebar', 'A self-contained, independently distributable piece of content', 'A navigation bar', 'A footer'], a: 1, e: 'An <article> makes sense on its own — a post, comment, or card.', tags: ['HTML', 'Semantics'] },
  { q: 'What is `<aside>` for?', opts: ['The main article', 'Tangential/sidebar content', 'The header', 'A button'], a: 1, e: '<aside> holds content related but not central, like a sidebar or callout.', tags: ['HTML', 'Semantics'] },
  { q: 'What does `<footer>` typically contain?', opts: ['The main heading', 'Closing info like copyright and links', 'Only the nav', 'The doctype'], a: 1, e: '<footer> holds footer info for its nearest section or the page.', tags: ['HTML', 'Semantics'] },
  { q: 'Why use semantic tags instead of plain `<div>`s?', opts: ['They look different', 'Better accessibility, SEO, and readability', 'They’re faster to type', 'They’re required by the browser'], a: 1, e: 'Semantics give meaning that assistive tech and search engines understand.', tags: ['HTML', 'Semantics'] },

  // ── Level 11 — Media ───────────────────────────────────────────────────
  { q: 'What does `<img>` embed?', opts: ['Audio', 'An image', 'A video', 'A page'], a: 1, e: '<img> embeds an image.', tags: ['HTML', 'Media'] },
  { q: 'What does the `controls` attribute on `<video>` do?', opts: ['Autoplays only', 'Shows the play/pause/volume UI', 'Hides the video', 'Loops it'], a: 1, e: 'controls displays the browser’s default playback controls.', tags: ['HTML', 'Media'] },
  { q: 'What does `<audio>` embed?', opts: ['An image', 'Sound/audio content', 'A subtitle', 'A canvas'], a: 1, e: '<audio> embeds playable audio.', tags: ['HTML', 'Media'] },
  { q: 'What is `<source>` inside `<video>` for?', opts: ['The poster image', 'Offering alternative media files/formats', 'Captions', 'A fallback image'], a: 1, e: 'Multiple <source> elements let the browser pick a format it supports.', tags: ['HTML', 'Media'] },
  { q: 'What does `<iframe>` embed?', opts: ['An image', 'Another HTML page/document inside the page', 'Audio', 'A form'], a: 1, e: 'An <iframe> nests another browsing context (page) within the current one.', tags: ['HTML', 'Media'] },
  { q: 'What does the `<picture>` element do?', opts: ['Plays video', 'Serves different images for different conditions (responsive art direction)', 'Embeds audio', 'Is just a frame'], a: 1, e: '<picture> with <source> serves alternative images by viewport/format.', tags: ['HTML', 'Media'] },
  { q: 'What does `<track>` provide for media?', opts: ['A poster', 'Captions or subtitles', 'A source file', 'A control bar'], a: 1, e: '<track> adds timed text tracks like subtitles/captions.', tags: ['HTML', 'Media'] },
  { q: 'What does `loop` do on `<video>`/`<audio>`?', opts: ['Mutes it', 'Replays it automatically when it ends', 'Shows controls', 'Preloads it'], a: 1, e: 'loop restarts playback automatically.', tags: ['HTML', 'Media'] },

  // ── Level 12 — Metadata & Head ─────────────────────────────────────────
  { q: 'What does the viewport meta tag do?\n\n```html\n<meta name="viewport" content="width=device-width, initial-scale=1">\n```', opts: ['Sets the title', 'Enables proper responsive scaling on mobile', 'Adds a favicon', 'Sets the language'], a: 1, e: 'It maps the layout viewport to the device width so responsive CSS works on phones.', tags: ['HTML', 'Head'] },
  { q: 'What does this do?\n\n```html\n<link rel="stylesheet" href="styles.css">\n```', opts: ['Creates a hyperlink', 'Attaches an external CSS stylesheet', 'Loads a script', 'Sets an icon'], a: 1, e: '<link rel="stylesheet"> pulls in an external CSS file.', tags: ['HTML', 'Head'] },
  { q: 'What does `<meta charset="UTF-8">` declare?', opts: ['The language', 'The character encoding', 'The author', 'The viewport'], a: 1, e: 'It sets the encoding so special characters display correctly.', tags: ['HTML', 'Head'] },
  { q: 'What does `<link rel="icon" href="...">` set?', opts: ['A stylesheet', 'The page favicon', 'A font', 'A canonical URL'], a: 1, e: 'rel="icon" points to the small icon shown in the browser tab.', tags: ['HTML', 'Head'] },
  { q: 'What is `<meta name="description" content="...">` for?', opts: ['The title', 'A page summary used by search engines', 'Keywords only', 'The author'], a: 1, e: 'The description meta provides a summary search engines may show in results.', tags: ['HTML', 'Head'] },
  { q: 'What does the `lang` attribute on `<html>` declare?', opts: ['The server locale', 'The document’s language', 'The charset', 'The text direction'], a: 1, e: 'lang (e.g. lang="en") helps screen readers and search engines.', tags: ['HTML', 'Head'] },
  { q: 'What does `defer` do on a `<script src>` in the head?', opts: ['Blocks parsing', 'Runs the script after HTML is parsed, in order', 'Stops it running', 'Runs it first'], a: 1, e: 'defer downloads in parallel and executes after parsing, preserving order.', tags: ['HTML', 'Head'] },
  { q: 'Content inside `<head>` is:', opts: ['Shown at the top of the page', 'Not rendered as visible page content', 'The footer', 'A sidebar'], a: 1, e: 'The head holds metadata; it isn’t painted as page content.', tags: ['HTML', 'Head'] },

  // ── Level 13 — Accessibility ───────────────────────────────────────────
  { q: 'Alt text on images exists mainly for:', opts: ['SEO only', 'Screen readers and image-load failures', 'Styling', 'Tooltips'], a: 1, e: 'alt makes images understandable to assistive tech and provides a fallback.', tags: ['HTML', 'A11y'] },
  { q: 'A `<label>` linked to an input helps by:', opts: ['Only styling', 'Improving accessibility and giving a larger click target', 'Validating', 'Submitting'], a: 1, e: 'Associated labels are announced by screen readers and clickable to focus the field.', tags: ['HTML', 'A11y'] },
  { q: 'What do ARIA `role` attributes do?', opts: ['Style elements', 'Convey an element’s purpose to assistive technology', 'Add events', 'Validate input'], a: 1, e: 'roles describe semantics for assistive tech when native elements aren’t used.', tags: ['HTML', 'A11y'] },
  { q: 'What does `aria-label` provide?', opts: ['A tooltip', 'An accessible name when there’s no visible text', 'A CSS class', 'A title bar'], a: 1, e: 'aria-label gives a control a name screen readers can announce.', tags: ['HTML', 'A11y'] },
  { q: 'Using native semantic elements (button, nav) gives you:', opts: ['Worse accessibility', 'Built-in accessibility for free', 'A need for ARIA always', 'Only decoration'], a: 1, e: 'Native elements come with keyboard and screen-reader support built in.', tags: ['HTML', 'A11y'] },
  { q: 'For an icon-only button, you should:', opts: ['Do nothing', 'Add an accessible name (aria-label or visually-hidden text)', 'Remove the button', 'Use a <div>'], a: 1, e: 'Without text, an icon button needs an accessible name so it’s usable by screen readers.', tags: ['HTML', 'A11y'] },
  { q: 'Sufficient color contrast mainly helps:', opts: ['SEO', 'Readability for low-vision users', 'Load speed', 'Animations'], a: 1, e: 'Adequate contrast keeps text legible for people with low vision.', tags: ['HTML', 'A11y'] },
  { q: 'Keyboard accessibility means:', opts: ['Only the mouse works', 'All interactive elements are usable without a mouse', 'No focus styles', 'Tabbing is disabled'], a: 1, e: 'Users should be able to reach and operate everything via the keyboard.', tags: ['HTML', 'A11y'] },

  // ── Level 14 — Entities & Special ──────────────────────────────────────
  { q: 'To display a literal `<` in HTML, use:', opts: ['&lt;', '&less;', '\\<', '&lt'], a: 0, e: '&lt; is the entity for the less-than sign, which is otherwise reserved.', tags: ['HTML', 'Entities'] },
  { q: 'What does `&amp;` render as?', opts: ['&', 'and', '@', '&&'], a: 0, e: '&amp; renders the ampersand character &.', tags: ['HTML', 'Entities'] },
  { q: 'Which is a non-breaking space?', opts: ['&space;', '&nbsp;', '&sp;', '&blank;'], a: 1, e: '&nbsp; inserts a space where the line won’t break.', tags: ['HTML', 'Entities'] },
  { q: 'How are HTML comments written?', opts: ['// ...', '<!-- ... -->', '/* ... */', '# ...'], a: 1, e: 'HTML comments use <!-- ... --> and are ignored by the browser.', tags: ['HTML', 'Entities'] },
  { q: 'What are `data-*` attributes for?', opts: ['Styling only', 'Storing custom data on elements (read via JS/CSS)', 'Validation', 'Metadata in the head'], a: 1, e: 'data-* attributes attach custom data to elements, e.g. data-id="42".', tags: ['HTML', 'Entities'] },
  { q: 'What does `&copy;` render?', opts: ['(c)', '©', 'the word copyright', '&c'], a: 1, e: '&copy; renders the © copyright symbol.', tags: ['HTML', 'Entities'] },
  { q: 'Why use entities like `&lt;`?', opts: ['To style text', 'To display reserved characters literally', 'To add spaces only', 'For SEO'], a: 1, e: 'Entities let you show characters (like < > &) that otherwise have special meaning.', tags: ['HTML', 'Entities'] },
  { q: 'What does `&quot;` represent?', opts: ['A single quote', 'A double quote (")', 'A backtick', 'An apostrophe'], a: 1, e: '&quot; is the double-quotation-mark entity.', tags: ['HTML', 'Entities'] },

  // ── Level 15 — Advanced / Mixed ────────────────────────────────────────
  { q: 'Block vs inline: which is correct?', opts: ['Both are inline', '<div> is block-level; <span> is inline', 'Both are block', '<div> is inline, <span> is block'], a: 1, e: '<div> is a block container; <span> is an inline container.', tags: ['HTML', 'Mastery'] },
  { q: '`<div>` and `<span>` are:', opts: ['Semantic elements', 'Generic containers with no semantic meaning', 'Deprecated', 'Form controls'], a: 1, e: 'They’re styling/scripting hooks with no inherent meaning — reach for semantic tags first.', tags: ['HTML', 'Mastery'] },
  { q: 'Which element is deprecated/discouraged?', opts: ['<section>', '<center>', '<article>', '<main>'], a: 1, e: '<center> (and <font>) are obsolete; use CSS for presentation.', tags: ['HTML', 'Mastery'] },
  { q: 'The recommended way to declare the page language is:', opts: ['<html language="en">', '<html lang="en">', '<lang="en">', '<meta lang>'], a: 1, e: 'Set lang on the root element: <html lang="en">.', tags: ['HTML', 'Mastery'] },
  { q: 'Where should the main page heading go?', opts: ['In the <head>', 'As an <h1> near the top of the main content', 'In the footer', 'Only as the <title>'], a: 1, e: 'The visible primary heading is an <h1> in the body’s main content.', tags: ['HTML', 'Mastery'] },
  { q: 'Inline elements like `<span>`:', opts: ['Always start on a new line', 'Do not force a new line', 'Are block-level', 'Are void elements'], a: 1, e: 'Inline elements flow within text and don’t begin on a new line.', tags: ['HTML', 'Mastery'] },
  { q: 'Which attribute makes a link download its target file?', opts: ['save', 'download', 'target', 'rel'], a: 1, e: 'The download attribute prompts the browser to save the linked resource.', tags: ['HTML', 'Mastery'] },
  { q: 'Which are void (self-contained) elements?', opts: ['<div>, <p>', '<img>, <br>, <input>, <hr>', '<span>, <a>', '<ul>, <li>'], a: 1, e: 'Void elements have no closing tag: <img>, <br>, <input>, <hr>, <meta>, <link>.', tags: ['HTML', 'Mastery'] },
];
