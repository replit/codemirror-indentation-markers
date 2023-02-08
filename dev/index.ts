import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import indentationMarkers from '../src';

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
      python(),
      indentationMarkers(),
    ],
  }),
  parent: document.querySelector('#editor'),
});