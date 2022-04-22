import {
  ViewPlugin,
  Decoration,
  EditorView,
  WidgetType,
} from '@codemirror/view';
import { getIndentUnit } from '@codemirror/language';
import { RangeSetBuilder, Extension, Text } from '@codemirror/state';

const indentationMark = Decoration.mark({
  class: 'cm-indentation-marker',
  tagName: 'span',
});

/**
 * Widget used to simulate N indentation markers on empty lines.
 */
class IndentationWidget extends WidgetType {
  constructor(readonly numIndent: number) {
    super();
  }

  eq(other: IndentationWidget) {
    return this.numIndent === other.numIndent;
  }

  toDOM(view: EditorView) {
    const indentSize = getIndentUnit(view.state);

    const wrapper = document.createElement('span');
    wrapper.style.top = '0';
    wrapper.style.left = '4px';
    wrapper.style.position = 'absolute';
    wrapper.style.pointerEvents = 'none';

    for (let indent = 0; indent < this.numIndent; indent++) {
      const element = document.createElement('span');
      element.className = 'cm-indentation-marker';
      element.innerHTML = `${' '.repeat(indentSize)}`;
      wrapper.appendChild(element);
    }

    return wrapper;
  }
}

/**
 * Returns the number of indentation markers a non-empty line should have
 * based on the text in the line and the size of the indent.
 */
function getNumIndentMarkersForNonEmptyLine(
  text: string,
  indentSize: number,
  onIndentMarker?: (pos: number) => void,
) {
  let numIndents = 0;
  let numConsecutiveSpaces = 0;
  let prevChar = null;

  for (let char = 0; char < text.length; char++) {
    // Bail if we encounter a non-whitespace character
    if (text[char] !== ' ' && text[char] !== '\t') {
      // We still increment the indentation level if we would
      // have added a marker here had this been a space or tab.
      if (numConsecutiveSpaces % indentSize === 0 && char !== 0) {
        numIndents++;
      }

      return numIndents;
    }

    // Every tab and N space has an indentation marker
    const shouldAddIndent =
      prevChar === '\t' || numConsecutiveSpaces % indentSize === 0;

    if (shouldAddIndent) {
      numIndents++;

      if (onIndentMarker) {
        onIndentMarker(char);
      }
    }

    if (text[char] === ' ') {
      numConsecutiveSpaces++;
    } else {
      numConsecutiveSpaces = 0;
    }

    prevChar = text[char];
  }

  return numIndents;
}

/**
 * Returns the number of indent markers an empty line should have
 * based on the number of indent markers of the previous
 * and next non-empty lines.
 */
function getNumIndentMarkersForEmptyLine(prev: number, next: number) {
  const min = Math.min(prev, next);
  const max = Math.max(prev, next);

  // If only one side is non-zero, we add one marker
  // until the next non-empty line.
  if (min === 0 && max > 0) {
    return 1;
  }

  // If they're equal and nonzero then
  // take one less than the minimum
  if (min === max && min > 0) {
    return min - 1;
  }

  // Else, default to the minimum of the two
  return min;
}

/**
 * Returns the next non-empty line and its indent level.
 */
function findNextNonEmptyLineAndIndentLevel(
  doc: Text,
  startLine: number,
  indentSize: number,
): [number, number] {
  const numLines = doc.lines;
  let lineNo = startLine;

  while (lineNo <= numLines) {
    const { text } = doc.line(lineNo);

    if (text.trim().length === 0) {
      lineNo++;

      continue;
    }

    const indent = getNumIndentMarkersForNonEmptyLine(text, indentSize);

    return [lineNo, indent];
  }

  // Reached the end of the doc
  return [numLines + 1, 0];
}

/**
 * Adds indentation markers to all lines within view.
 */
function addIndentationMarkers(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();
  const indentSize = getIndentUnit(view.state);
  const markers: Array<{
    from: number;
    to: number;
    decoration: Decoration;
  }> = [];

  for (const { from, to } of view.visibleRanges) {
    let pos = from;

    let prevIndentMarkers = 0;
    let nextIndentMarkers = 0;
    let nextNonEmptyLine = 0;

    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const { text } = line;

      // If a line is empty, we match the indentation according
      // to a heuristic based on the indentations of the
      // previous and next non-empty lines.
      if (text.trim().length === 0) {
        // To retrieve the next non-empty indentation level,
        // we perform a lookahead and cache the result.
        if (nextNonEmptyLine < line.number) {
          const [nextLine, nextIndent] = findNextNonEmptyLineAndIndentLevel(
            view.state.doc,
            line.number + 1,
            indentSize,
          );

          nextNonEmptyLine = nextLine;
          nextIndentMarkers = nextIndent;
        }

        const numIndentMarkers = getNumIndentMarkersForEmptyLine(
          prevIndentMarkers,
          nextIndentMarkers,
        );
        const indentationWidget = Decoration.widget({
          widget: new IndentationWidget(numIndentMarkers),
        });

        // Add the indent widget and move on to next line
        markers.push({
          from: line.from,
          to: line.from,
          decoration: indentationWidget,
        });
        pos = line.to + 1;

        continue;
      }

      prevIndentMarkers = getNumIndentMarkersForNonEmptyLine(
        text,
        indentSize,
        (char) => {
          const charPos = line.from + char;
          markers.push({
            from: charPos,
            to: charPos + 1,
            decoration: indentationMark,
          });
        },
      );

      // Move on to the next line
      pos = line.to + 1;
    }
  }

  markers.sort((a, b) => a.from - b.from);
  markers.forEach(({ from, to, decoration }) => {
    builder.add(from, to, decoration);
  });

  return builder.finish();
}

function createIndentationMarkerPlugin() {
  return ViewPlugin.define(
    (view) => ({
      decorations: addIndentationMarkers(view),
      update(update) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = addIndentationMarkers(update.view);
        }
      },
    }),
    {
      decorations: (v) => v.decorations,
    },
  );
}

const LIGHT_BACKGROUND = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4\/\/\/\/f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==") left repeat-y';
const DARK_BACKGROUND = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYHB3d/8PAAOIAdULw8qMAAAAAElFTkSuQmCC") left repeat-y';

const indentationMarkerBaseTheme = EditorView.baseTheme({
  '.cm-line': {
    position: `relative`,
  },
  '.cm-indentation-marker': {
    display: `inline-block`,
  },
  '&light .cm-indentation-marker': {
    background: LIGHT_BACKGROUND,
  },
  '&dark .cm-indentation-marker': {
    background: DARK_BACKGROUND,
  },
});

export function indentationMarkers(): Extension {
  return [
    createIndentationMarkerPlugin(),
    indentationMarkerBaseTheme,
  ]
}
