# Como fazer Deploy na Vercel via GitHub

Este guia explica passo a passo como subir seu repositório no GitHub, conectar à Vercel e configurar o login com o Google no Supabase.

---

## 1. Subir o Projeto no GitHub

1. No terminal do seu computador (na pasta do projeto):
   ```bash
   git add .
   git commit -m "feat: login com google, vercel config e melhorias"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

---

## 2. Fazer Deploy na Vercel

1. Acesse **[vercel.com](https://vercel.com)** e faça login (recomendado com o próprio GitHub).
2. Clique no botão **"Add New..."** > **"Project"**.
3. Selecione o repositório que você acabou de subir no GitHub e clique em **"Import"**.
4. Nas configurações do projeto (**Project Settings**):
   - **Framework Preset**: Vite (a Vercel detecta automaticamente).
   - **Root Directory**: `./` (padrão).
5. Em **Environment Variables** (Variáveis de Ambiente), adicione as 3 chaves:
   - `GEMINI_API_KEY`: Sua chave de API do Google Gemini.
   - `VITE_SUPABASE_URL`: A URL do seu projeto Supabase (ex: `https://xxxx.supabase.co`).
   - `VITE_SUPABASE_ANON_KEY`: A chave pública Anon do Supabase.
6. Clique em **"Deploy"**.
7. Em menos de 2 minutos seu app estará publicado em uma URL como `https://seu-projeto.vercel.app`!

---

## 3. Ativar o "Login com Google" no Supabase

Para o botão **"Continuar com o Google"** funcionar no Supabase:

1. Acesse o **[Google Cloud Console](https://console.cloud.google.com/)**:
   - Crie ou selecione um projeto.
   - Vá em **APIs e Serviços** > **Tela de consentimento OAuth** e configure para "Externo".
   - Vá em **Credenciais** > **Criar Credenciais** > **ID do cliente OAuth**:
     - Tipo de aplicativo: **Aplicativo da Web**.
     - Nome: `FinAI Assistente`.
     - Em **URIs de redirecionamento autorizados**, adicione a URL de callback do Supabase:
       `https://SEU_PROJETO.supabase.co/auth/v1/callback`
   - Copie o **Client ID** e o **Client Secret** gerados.

2. Acesse o painel do seu **Supabase**:
   - Vá em **Authentication** > **Providers** > **Google**.
   - Ative o seletor **Enable Google provider**.
   - Cole o **Client ID** e o **Client Secret**.
   - Salve.

3. Em **Authentication** > **URL Configuration** no Supabase:
   - Defina **Site URL** como a URL da sua Vercel: `https://seu-projeto.vercel.app`.
   - Em **Redirect URLs**, adicione:
     `https://seu-projeto.vercel.app/**`
     `http://localhost:3000/**`

Pronto! Seu aplicativo está 100% configurado com login social Google e deploy contínuo via GitHub na Vercel.
