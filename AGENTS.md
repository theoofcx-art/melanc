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

## Melan
- Uploaded media lives in a private storage bucket; store object paths in rows and resolve them with `useMediaUrl` (signed URLs), because the workspace blocks public buckets.
- Admin rights come only from `user_roles` (granted by DB trigger on verified email); admin actions run in server functions that re-check `has_role`.
- Wyp AI calls go through server routes under `src/routes/api/` that verify the bearer token before calling the AI gateway.
