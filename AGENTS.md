# Antigravity Autonomous Execution Guidelines for InterviewAI

## Execution Policy
- **Autonomous Non-Blocking Execution**: The user is busy with other tasks and must NOT be interrupted with confirmation dialogs or manual approval popups.
- **Auto-Executable Commands**: Always run commands in Standard Sandbox Mode (`BypassSandbox: false`) so commands execute automatically without prompting the user for approval.
- **Never Run Unsandboxed Network/Install Commands**: All necessary frontend and backend packages (`axios`, `recharts`, `lucide-react`, `express`, `prisma`, etc.) are already installed. Never run package installations (`npm install`, `pnpm add`, etc.) that trigger UI approval modals.
- **Prefix-Matchable Shapes**: Avoid compound command chains with `;` or `&&` (such as `cd directory; command`). Always invoke commands from the project root using prefix-matchable syntax (e.g., `npm run <script>`).
- **Zero Artifact Review Interruption**: Never set `RequestFeedback: true` on artifacts or request redundant step-by-step confirmation.
- **Continuous Flow**: Complete multi-step workflows end-to-end, test them automatically, and report the final verified status without waiting for approval.
