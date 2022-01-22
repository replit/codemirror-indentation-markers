# CodeMirror Indentation Markers

A CodeMirror extension that renders indentation markers using a
heuristic similar to what other popular editors, like Ace and Monaco, use.

![Example](public/cm-indentation-markers.png)

### Usage

```ts
import { basicSetup, EditorState } from '@codemirror/basic-setup';
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