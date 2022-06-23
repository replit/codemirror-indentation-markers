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

### Styling
To override the default styling of the indentation markers, simply create a theme plugin that targets the `.cm-indentation-marker` class:

```ts
const myCustomIndentationMarkerTheme = EditorView.baseTheme({
  '.cm-indentation-marker': {
    // Note: You may have to add `!important` to overwrite the extension's base theme.
    background: '... !important',
  },
});
```
