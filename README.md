# CodeMirror Indentation Markers

<span><a href="https://replit.com/@util/codemirror-indentation-markers" title="Run on Replit badge"><img src="https://replit.com/badge/github/replit/codemirror-indentation-markers" alt="Run on Replit badge" /></a></span>
<span><a href="https://www.npmjs.com/package/@replit/codemirror-indentation-markers" title="NPM version badge"><img src="https://img.shields.io/npm/v/@replit/codemirror-indentation-markers?color=blue" alt="NPM version badge" /></a></span>

A CodeMirror extension that renders indentation markers using a
heuristic similar to what other popular editors, like Ace and Monaco, use.

![Example](public/cm-indentation-markers.png)

### Usage

```ts
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';

const doc = `
def max(a, b):
  if a > b:
    return a
  else:
    return b
`

new EditorView({
  state: EditorState.create({
    doc,
    extensions: [basicSetup, indentationMarkers()],
  }),
  parent: document.querySelector('#editor'),
});

```

### Options

You can provide an options object to `indentationMarkers()` with the following
optional properties:

- `highlightActiveBlock`
    
    Boolean that determines whether the active block marker is styled
    differently. Setting this to `false` provides a significant performance
    enhancement because it means that markers do not need to be regenerated
    when the selection changes. Defaults to `true`.
 
- `hideFirstIndent`

    Boolean that determines whether markers in the first column are omitted.
    Defaults to `false`.

#### Example

```ts
new EditorView({
  state: EditorState.create({
    doc,
    extensions: [
      basicSetup,
      indentationMarkers({
        highlightActiveBlock: false,
        hideFirstIndent: true,
      })
    ],
  }),
  parent: document.querySelector('#editor'),
});
```
