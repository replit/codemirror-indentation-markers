import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { indentationMarkers } from '../src';

const doc = `
def read_file(path):
  with open(path, 'r') as file:

    print("opening file")
    text = file.read()

    file.close()

    if len(text) > 1000:
      print("thats a big file!")

    return text

def main():
  read_file("notes.txt")
`

new EditorView({
  state: EditorState.create({
    doc,

    extensions: [
      basicSetup,
      keymap.of([indentWithTab]),
      indentationMarkers()
    ],
  }),
  parent: document.querySelector('#editor'),
});