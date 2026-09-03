import type { Block, BlockColor, BlockKind, CanvasState } from './types';

// Stable ids keep each block's demo comment thread across Reset.
function block(id: string, kind: BlockKind, color: BlockColor, text: string, col: number, row: number, children: Block[] = []): Block {
    return { id, kind, color, text, col, row, children };
}

export function seedState(): CanvasState {
    return {
        version: 1,
        focusedId: 'step-1',
        blocks: [
            block('step-1', 'major', 'blue', 'Step 1 - Sign up\n\nVisitor creates an account with email or Google.', 0, 1),
            block('note-1-owner', 'minor', 'slate', 'Owner: Growth team', 0, 0),
            block('note-1-metric', 'minor', 'green', 'Metric: sign-up conversion 34%', 1, 4),

            block('step-2', 'major', 'violet', 'Step 2 - Verify email\n\nSix digit code, resend after 30s.', 4, 1),
            block('note-2-risk', 'minor', 'rose', 'Risk: codes land in spam for Outlook users', 5, 0),

            block('step-3', 'major', 'green', 'Step 3 - Create workspace', 8, 1, [
                block('step-3-a', 'minor', 'slate', 'Pick a name', 0, 0),
                block('step-3-b', 'minor', 'slate', 'Choose a plan', 1, 0),
                block('step-3-c', 'minor', 'amber', 'Upload logo (optional)', 2, 2),
            ]),

            block('step-4', 'major', 'amber', 'Step 4 - Invite team\n\nBulk invite by pasting emails.', 12, 1),
            block('note-4-metric', 'minor', 'green', 'Metric: 2.3 invites per workspace', 13, 4),

            block('step-5', 'major', 'rose', 'Step 5 - Connect integration', 16, 1, [
                block('step-5-a', 'minor', 'slate', 'Slack', 0, 0),
                block('step-5-b', 'minor', 'slate', 'GitHub', 1, 0),
            ]),
            block('note-5-owner', 'minor', 'slate', 'Owner: Platform team', 17, 0),

            block('step-6', 'major', 'slate', 'Step 6 - First project', 20, 1, [
                block('step-6-review', 'major', 'blue', 'Design review checkpoint', 2, 1),
            ]),

            block('step-7', 'major', 'blue', 'Step 7 - Go live\n\nCustomer flips the production switch.', 24, 1),
            block('note-7-metric', 'minor', 'green', 'Metric: time to go-live 6 days', 25, 4),
        ],
    };
}
