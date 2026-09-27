import { describe, expect, test } from 'bun:test';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { autoLineDirection } from '../autoLineDirection';

describe('autoLineDirection', () => {
    test('enables per-line text direction so CodeMirror re-reads each line direction', () => {
        const state = EditorState.create({
            doc: 'مرحبا بالعالم\nconst x = 1;',
            extensions: autoLineDirection,
        });

        expect(state.facet(EditorView.perLineTextDirection)).toBe(true);
    });
});
