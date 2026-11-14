# Direct refeito do zero + Enquetes

## 1. Direct novo
- Apagar as duas páginas atuais do Direct e criar novas em um endereço novo e simples: `/direct` (lista de conversas) e `/direct/<pessoa>` (conversa). Endereço novo evita versões antigas guardadas no celular que mostram "página não encontrada".
- Atualizar todos os botões que levam ao Direct (ícone do cabeçalho, botão "Mensagem" no perfil, avisos).
- O antigo `/messages` passa a redirecionar para `/direct`, para links antigos continuarem funcionando.
- Lista de conversas: busca de @usuário para começar conversa, última mensagem, conversas sem perfil válido são escondidas (hoje elas geram link quebrado).
- Conversa: mensagens em tempo real, figurinhas (enviar e salvar), rolagem até a última, aviso claro se a pessoa não existir.
- As mensagens já salvas continuam (só as telas são refeitas).

## 2. Enquetes (estilo WhatsApp)
- Na tela de nova publicação: botão "Enquete" com pergunta, 2 a 6 opções e opção "permitir várias respostas".
- No post: cada opção com barra de porcentagem e número de votos, marca no que você votou; dá para trocar/tirar o voto; total de votos embaixo.
- Tocar em "Ver votos" mostra quem votou em cada opção.

## 3. Verificação
- Abrir no navegador com uma conta real: entrar no Direct, iniciar conversa, mandar texto e figurinha; criar enquete, votar, ver resultados.

## Detalhes técnicos
- Rotas: `_authenticated/direct.index.tsx`, `_authenticated/direct.$userId.tsx`; `messages.*` removidos e substituídos por `messages.tsx` com `beforeLoad` redirect para `/direct`.
- Tabelas novas: `poll_options` (id, post_id, label, position), `poll_votes` (option_id, post_id, user_id, PK option_id+user_id); coluna `posts.poll_multi boolean default false`; kind `poll`. GRANTs + RLS: membros autenticados leem; votar/remover só o próprio voto; opções criadas só pelo autor do post. Gatilho impede mais de um voto quando `poll_multi` é falso.
- Teste Vitest para a regra de porcentagens/voto único.
