<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Sign-up and login run through server functions in src/lib/auth.functions.ts (username login, admin-approval gate, identity document upload), because usernames must never be resolved to emails in the browser.
- Approval is enforced in the database (is_approved / is_approved_vendor in RLS), not only in the UI, so pending accounts cannot trade even with a valid session.
