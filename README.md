# Melanc

Crie uma aplicação web completa, moderna e responsiva de uma rede social chamada "Melan", construída em React com Tailwind CSS, com suporte a PWA (Progressive Web App) para instalação como aplicativo nativo.



### 1. Identidade Visual e Referência de Design (Vibe Utan)

- **Tema:** Dark mode elegante, com tons de verde escuro/azulado profundo e cinza carvão, exatamente como nas referências visuais fornecidas[span_0](start_span)[span_0](end_span)[span_1](start_span)[span_1](end_span). Bordas arredondadas e design minimalista e moderno[span_2](start_span)[span_2](end_span)[span_3](start_span)[span_3](end_span).

- **Cabeçalho (Header Superior):** Deve conter o nome da rede social "Melan" enfeitado com elementos de Halloween (como melancia já que é a logo do app e morcegos)[span_4](start_span)[span_4](end_span), ladeado pelos botões de Pesquisa e Direct (mensagens diretas), além de sininho de notificações[span_5](start_span)[span_5](end_span).

As duas primeiras fotos sao da rede que eu quero me inspirar e a última é a logo do app (melancia)

- **Navegação Inferior (Bottom Bar Flutuante):** Uma barra fixa na parte inferior da tela contendo exatamente estes 5 ícones/abas[span_6](start_span)[span_6](end_span)[span_7](start_span)[span_7](end_span):

  1. Aba de Comunidade/Grupos

  2. Aba de IA (Wyp)

  3. Botão Central de Criação (+) destacado em formato circular[span_8](start_span)[span_8](end_span)[span_9](start_span)[span_9](end_span)

  4. Aba de Textos

  5. Aba de Perfil do utilizador[span_10](start_span)[span_10](end_span)[span_11](start_span)[span_11](end_span)



### 2. Recursos Principais e Funcionalidades

- **Publicações e Exclusão:** Suporte completo para postar vídeos, fotos, carrossel de imagens e textos. O autor de qualquer publicação deve ter a opção de **excluir o próprio post** facilmente a partir do menu do card.

- **Visualização do Feed:** O utilizador pode alternar a visualização dos posts entre o modo vertical/em pé (estilo TikTok) e o modo horizontal/deitado (estilo Instagram). O feed principal conta com algoritmo filtrado por hashtags (#) baseadas no interesse do utilizador.

- **Stickers e Direct:** Sistema de figurinhas customizadas liberadas para uso tanto nas conversas do Direct quanto nos comentários das publicações.

- **Integração com Spotify:** Integração utilizando a Web API do Spotify (conforme snippets fornecidos para buscar top tracks, criar playlists e injetar player/embed) e opção para anexar músicas do Spotify nos Stories e publicações.

- **Assistente IA (Wyp):** Uma aba dedicada a uma IA chamada "Wyp", que responde dúvidas gerais, realiza pesquisas atualizadas na web, auxilia em estudos/conversas e é capaz de gerar imagens.



### 3. Tela e Edição de Perfil (Estilo Exato da Referência)

- **Layout do Perfil:** Exibe o banner de fundo, foto de perfil circular com borda e botão de adicionar, nome de exibição estilizado, nome de utilizador (@), pronomes/bio, link na bio, e métricas customizadas como "Conexões", "Corações" e "Admiradores", além de destaques em círculos e abas de posts[span_12](start_span)[span_12](end_span).

- **Opções de Edição:** O utilizador pode alterar banner, foto de perfil, nome, bio, link e ativar a opção de conta privada.



### 4. Sistema de Contas, Autenticação e Segurança

- **Criação e Gestão de Contas:** Qualquer pessoa nova pode **criar e adicionar contas** facilmente através do ecrã de registo, definindo email, palavra-passe, foto de perfil, bio e nome. O envio de código de verificação por e-mail deve estar integrado no fluxo de autenticação.

- **Zero Contas Fakes/Testes:** O sistema deve iniciar totalmente limpo, sem contas falsas ou de testes pré-cadastradas na base de dados.

- **Painel Administrativo Exclusivo (`theoofcx@gmail.com`):** 

  - Um painel de controle restrito e invisível para os demais utilizadores, acessível apenas quando o login for feito com o e-mail **theoofcx@gmail.com** (sem atalhos de login rápido no ecrã público).

  - No painel adm, o administrador pode banir/excluir permanentemente contas de utilizadores, remover qualquer publicação da plataforma e conceder o selo de verificado (estilo Instagram/X) para perfis.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://melanc.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a55a1b29-b6eb-4aed-b9a3-03248f2b97b5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
